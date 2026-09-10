/**
 * Client-only presentation authority for continuous combat.
 *
 * It maps already-authoritative V2 combat events to camera, VFX, HUD and
 * audio intent. It intentionally has no reference to combat state mutation:
 * callers may discard it without changing a single outcome.
 */
import type { CameraCueName } from "./cameraDirector";
import type { ImpactVfxKind } from "./impactVfx";
import type { CombatEvent, EngagementPhase } from "@/lib/combat-v2/types";

export type BattleHudVisibility = "FULL" | "REDUCED" | "CINEMATIC" | "HIDDEN";
export type PresentationIntensity = 0 | 1 | 2 | 3 | 4;

export interface BattlePresentationState {
  sequence: number;
  intensity: PresentationIntensity;
  hud: BattleHudVisibility;
  camera: CameraCueName;
  focus: "r1" | "r2" | "midpoint";
  vfx: ImpactVfxKind | null;
  secondaryVfx: ImpactVfxKind | null;
  hitStopSeconds: number;
  crowd: number;
  duckAudio: boolean;
}

const NEUTRAL: BattlePresentationState = {
  sequence: 0,
  intensity: 0,
  hud: "FULL",
  camera: "neutral",
  focus: "midpoint",
  vfx: null,
  secondaryVfx: null,
  hitStopSeconds: 0,
  crowd: 0.25,
  duckAudio: false,
};

function phaseState(phase: EngagementPhase): Pick<BattlePresentationState, "intensity" | "hud" | "camera" | "crowd"> {
  switch (phase) {
    case "committing": return { intensity: 1, hud: "REDUCED", camera: "approach", crowd: 0.45 };
    case "clashing": return { intensity: 2, hud: "CINEMATIC", camera: "attack", crowd: 0.75 };
    case "breaking": return { intensity: 1, hud: "REDUCED", camera: "knockback", crowd: 0.42 };
    case "resetting": return { intensity: 0, hud: "FULL", camera: "neutral", crowd: 0.3 };
    case "stalking": return { intensity: 0, hud: "FULL", camera: "neutral", crowd: 0.25 };
  }
}

/** Maps a V2 event into a single immutable display frame. */
export class BattleDirector {
  private state: BattlePresentationState = { ...NEUTRAL };

  reset(): BattlePresentationState {
    this.state = { ...NEUTRAL };
    return this.state;
  }

  current(): BattlePresentationState { return this.state; }

  consume(event: CombatEvent, fighterIndex: (id: string | undefined) => number): BattlePresentationState {
    const attacker = fighterIndex(event.fighterId) === 0 ? "r1" : "r2";
    const defender = attacker === "r1" ? "r2" : "r1";
    const next: BattlePresentationState = { ...this.state, sequence: this.state.sequence + 1, vfx: null, secondaryVfx: null, hitStopSeconds: 0, duckAudio: false };

    if (event.type === "ENGAGEMENT_CHANGED") {
      Object.assign(next, phaseState((event.detail ?? "stalking") as EngagementPhase));
    } else if (event.type === "CLASH_STARTED") {
      Object.assign(next, phaseState("clashing"));
    } else if (event.type === "CLASH_ENDED") {
      Object.assign(next, phaseState("breaking"));
    } else if (event.type === "ATTACK_STARTED" || event.type === "ATTACK_ACTIVE") {
      Object.assign(next, { intensity: 2, hud: "CINEMATIC", camera: "attack", focus: attacker, crowd: 0.66 });
    } else if (event.type === "ATTACK_LANDED" || event.type === "COUNTER_LANDED" || event.type === "DAMAGE") {
      const major = event.type === "COUNTER_LANDED" || (event.value ?? 0) >= 9;
      Object.assign(next, {
        intensity: major ? 3 : 2,
        hud: "CINEMATIC",
        camera: major ? "critical" : "impact_light",
        focus: defender,
        vfx: major ? "critical_impact" : "light_impact",
        secondaryVfx: major ? "feathers" : null,
        hitStopSeconds: major ? 0.052 : 0.026,
        crowd: major ? 0.9 : 0.76,
        duckAudio: major,
      });
    } else if (event.type === "STAGGER") {
      Object.assign(next, {
        intensity: 3,
        hud: "CINEMATIC",
        camera: "impact_heavy",
        focus: attacker,
        vfx: "heavy_impact",
        secondaryVfx: "feathers",
        hitStopSeconds: 0.045,
        crowd: 0.88,
        duckAudio: true,
      });
    } else if (event.type === "MATCH_FINISHED") {
      Object.assign(next, { intensity: 4, hud: "HIDDEN", camera: "victory", focus: attacker, crowd: 1, duckAudio: true });
    }
    this.state = next;
    return next;
  }
}
