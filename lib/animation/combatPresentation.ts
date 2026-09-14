/**
 * Combat Presentation Controller (spec §1 architecture box).
 *
 *   Backend combat log  ->  [this]  ->  timed presentation beats
 *
 * It owns the *rhythm* of a fight: neutral beat -> approach -> anticipation ->
 * active -> impact -> hit-stop -> reaction -> recovery -> spacing reset ->
 * neutral. It never decides hit/miss/damage/crit/stagger/KO — those arrive
 * pre-computed in each `PresentationTurn` (mapped 1:1 from a CombatLogEntry).
 *
 * Framework-agnostic: no THREE, no React. The host (BattleCanvas) supplies
 * callbacks for the side effects and calls `update(dt)` once per frame with a
 * virtual delta (0 while hit-stop is freezing presentation).
 */

import {
  choreographyDuration,
  getChoreography,
  hitStopFor,
  impactTime,
  resolveAttackPhase,
  type AttackId,
  type AttackChoreography,
  type AttackPhase,
} from "./choreography";
import type { BattlePersonality } from "./battlePersonality";
import type { CameraCueName } from "./cameraDirector";
import type { ImpactVfxKind } from "./impactVfx";
import { impactKindFor } from "./impactVfx";
import type { HitZone, StaggerLevel } from "@/lib/types";

export type FighterSide = "A" | "B";

export interface PresentationTurn {
  turn: number;
  attacker: FighterSide;
  move: AttackId;
  isMiss: boolean;
  isCrit: boolean;
  isCritical: boolean;
  stagger: StaggerLevel;
  /** This hit drops the defender to 0 HP. */
  fatal: boolean;
  hitZone: HitZone | null;
  damage: number;
  /** Server-reported defender HP after this turn (passed straight through). */
  defenderHp: number;
}

export interface ImpactInfo {
  turn: PresentationTurn;
  /** virtual ms timestamp of the contact frame. */
  atMs: number;
  vfx: ImpactVfxKind | null;
  camera: CameraCueName;
  hitStopSeconds: number;
}

export interface PresentationCallbacks {
  /** Begin the attacker's windup. `speed` is a playback multiplier for the AnimState. */
  startAttack(turn: PresentationTurn, choreo: AttackChoreography, speed: number): void;
  /** Contact frame: HP/text/particles/audio/defender-reaction/physics all fire here. */
  impact(info: ImpactInfo): void;
  /** Freeze presentation for `seconds` (routed to HitStopController by the host). */
  hitStop(seconds: number): void;
  /** Camera director cue. `focus` says which fighter the frame should favour. */
  cameraCue(name: CameraCueName, focus: FighterSide | "midpoint"): void;
  /** Phase changed — host can use this for debug / layer reactions. */
  phaseChange(phase: AttackPhase, turn: PresentationTurn | null): void;
  /** The whole log has been presented; `winner` is the last attacker. */
  finished(winner: FighterSide | null): void;
}

type Stage =
  | "idle"
  | "neutral"
  | "anticipation"
  | "active"
  | "recovery"
  | "post_ko_hold"
  | "done";

export interface PresentationOptions {
  /** Personality per side — scales pacing / commitment (presentation only). */
  personality: Record<FighterSide, BattlePersonality>;
  /** Extra neutral seconds between every exchange, on top of the move's own beat. */
  basePacing?: number;
  /** Seconds of stillness after a KO before the victory cue (spec §15: 0.25–0.5). */
  koRecognition?: number;
}

export class CombatPresentationController {
  private turns: PresentationTurn[] = [];
  private cursor = 0;
  private stage: Stage = "idle";
  private clock = 0; // seconds within the current stage
  private nowMs = 0; // virtual ms, advanced by update()

  private current: PresentationTurn | null = null;
  private choreo: AttackChoreography = getChoreography("charge_attack");
  private impactFired = false;
  private lastPhase: AttackPhase | null = null;
  private lastWinner: FighterSide | null = null;

  private readonly cb: PresentationCallbacks;
  private readonly opts: Required<PresentationOptions>;

  constructor(cb: PresentationCallbacks, opts: PresentationOptions) {
    this.cb = cb;
    this.opts = {
      basePacing: 0.35,
      koRecognition: 0.35,
      ...opts,
    };
  }

  /** Load the mapped combat log and start from neutral. */
  load(turns: PresentationTurn[], startMs: number): void {
    this.turns = turns;
    this.cursor = 0;
    this.stage = turns.length ? "neutral" : "done";
    this.clock = 0;
    this.nowMs = startMs;
    this.current = null;
    this.impactFired = false;
    this.lastPhase = null;
    this.lastWinner = null;
    if (this.stage === "neutral") {
      this.cb.cameraCue("battle_start", "midpoint");
    } else {
      this.cb.finished(null);
    }
  }

  get virtualNow(): number {
    return this.nowMs;
  }

  get phase(): AttackPhase | null {
    return this.lastPhase;
  }

  get activeTurn(): PresentationTurn | null {
    return this.current;
  }

  get done(): boolean {
    return this.stage === "done";
  }

  /** Neutral-beat length before the upcoming turn (personality-scaled). */
  private neutralBeatFor(next: PresentationTurn): number {
    const choreo = getChoreography(next.move);
    const persona = this.opts.personality[next.attacker];
    return (choreo.minNeutralBeat + this.opts.basePacing) * persona.neutralBeatMul;
  }

  private emitPhase(phase: AttackPhase): void {
    if (phase === this.lastPhase) return;
    this.lastPhase = phase;
    this.cb.phaseChange(phase, this.current);
  }

  /** @param dt virtual seconds elapsed (0 during a hit-stop freeze). */
  update(dt: number): void {
    if (this.stage === "idle" || this.stage === "done") return;
    this.nowMs += dt * 1000;
    this.clock += dt;

    switch (this.stage) {
      case "neutral": {
        const next = this.turns[this.cursor];
        if (!next) {
          this.stage = "done";
          this.cb.finished(this.lastWinner);
          return;
        }
        this.emitPhase("APPROACH");
        if (this.clock >= this.neutralBeatFor(next)) {
          this.beginTurn(next);
        }
        break;
      }

      case "anticipation": {
        if (!this.current) return;
        this.emitPhase(resolveAttackPhase(this.choreo, this.clock, false));
        if (this.clock >= this.choreo.anticipation) {
          // Keep the same clock running into the active window — phases are
          // measured from attack start, not from stage entry.
          this.stage = "active";
        }
        break;
      }

      case "active": {
        if (!this.current) return;
        const elapsed = this.clock;
        this.emitPhase(resolveAttackPhase(this.choreo, elapsed, false));
        const contact = impactTime(this.choreo);
        if (!this.impactFired && elapsed >= contact) {
          this.fireImpact();
        }
        if (elapsed >= this.choreo.anticipation + this.choreo.active) {
          this.stage = "recovery";
        }
        break;
      }

      case "recovery": {
        if (!this.current) return;
        this.emitPhase(resolveAttackPhase(this.choreo, this.clock, false));
        const total = choreographyDuration(this.choreo);
        if (this.clock >= total) {
          this.completeTurn();
        }
        break;
      }

      case "post_ko_hold": {
        if (this.clock >= this.opts.koRecognition) {
          const winner = this.lastWinner;
          this.cb.cameraCue("victory", winner ?? "midpoint");
          this.stage = "done";
          this.cb.finished(winner);
        }
        break;
      }
    }
  }

  private beginTurn(turn: PresentationTurn): void {
    this.current = turn;
    this.choreo = getChoreography(turn.move);
    this.impactFired = false;
    this.clock = 0;
    this.stage = "anticipation";
    const persona = this.opts.personality[turn.attacker];
    // Playback speed: personality timingMul stretches/compresses the clip
    // uniformly so phase fractions (and the impact frame) stay aligned.
    const speed = 1 / Math.max(0.35, persona.timingMul);
    this.cb.cameraCue("attack", turn.attacker);
    this.cb.startAttack(turn, this.choreo, speed);
    this.emitPhase("ANTICIPATION");
  }

  private fireImpact(): void {
    if (!this.current) return;
    this.impactFired = true;
    const turn = this.current;
    const vfx = impactKindFor({
      isMiss: turn.isMiss,
      isCritical: turn.isCritical,
      stagger: turn.stagger,
    });
    const camera = cameraCueForResult(turn);
    const hitStopSeconds = turn.isMiss
      ? 0
      : hitStopFor(this.choreo, turn.stagger, turn.isCritical);

    if (hitStopSeconds > 0) this.cb.hitStop(hitStopSeconds);
    this.cb.cameraCue(camera, turn.attacker === "A" ? "B" : "A");
    this.cb.impact({ turn, atMs: this.nowMs, vfx, camera, hitStopSeconds });
    this.emitPhase("IMPACT");

    if (turn.fatal) {
      this.lastWinner = turn.attacker;
    }
  }

  private completeTurn(): void {
    const turn = this.current;
    this.current = null;
    this.cursor += 1;
    this.emitPhase("COMPLETE");

    // Whoever landed the most recent turn is the standing fighter.
    if (turn) this.lastWinner = turn.attacker;

    if (turn?.fatal) {
      this.cb.cameraCue("death", turn.attacker === "A" ? "B" : "A");
      this.stage = "post_ko_hold";
      this.clock = 0;
      return;
    }

    if (this.cursor >= this.turns.length) {
      this.stage = "done";
      this.cb.finished(this.lastWinner);
      return;
    }

    this.stage = "neutral";
    this.clock = 0;
    this.cb.cameraCue("neutral", "midpoint");
  }
}

/** Backend result -> which camera cue the impact should trigger. */
export function cameraCueForResult(turn: PresentationTurn): CameraCueName {
  if (turn.isMiss) return "attack";
  if (turn.fatal) return "critical";
  if (turn.isCritical) return "critical";
  if (turn.stagger === "knockdown") return "knockdown";
  if (turn.stagger === "heavy") return "impact_heavy";
  if (turn.stagger === "stumble" || turn.stagger === "medium") return "impact_heavy";
  return "impact_light";
}
