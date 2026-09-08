"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Chicken, CombatLogEntry, FightingStyle, HitZone } from "@/lib/types";
import { effectiveStat, maxHealth } from "@/lib/combat";
import { resolvePhysicalProfile } from "@/lib/physicalProfile";
import { AudioEngine } from "@/lib/audioEngine";
import { ArenaBackdrop } from "@/components/chicken3d/ArenaBackdrop";
import {
  BattleStage3D,
  WORLD_HALF_GAP,
  ANIM_PX_TO_WORLD,
} from "@/components/chicken3d/BattleStage3D";
import type { CameraCue } from "@/components/chicken3d/BattleStage3D";
import {
  KNOCKDOWN_RECOVER_MS,
  scaledRecoveryMs,
  type ChickenPhysicsHandle,
} from "@/components/chicken3d/ChickenPhysicsRig";
import type { ImpactVFXHandle } from "@/components/chicken3d/ImpactVFX";
import {
  BattleDebugOverlay,
  makeDebugState,
  type BattleDebugState,
} from "@/components/chicken3d/BattleDebugOverlay";
import type { FighterAnim } from "@/components/chicken3d/ChickenModel";
import type { AnimIntent, AnimState } from "@/lib/animation/types";
import type { StaggerLevel } from "@/lib/types";
import { HitStopController } from "@/lib/animation/hitStop";
import {
  choreographyDuration,
  getChoreography,
  hitStopFor,
  impactTime,
} from "@/lib/animation/choreography";
import { personalityForStyle } from "@/lib/animation/battlePersonality";
import { DEFAULT_SPACING, dampFacingYaw } from "@/lib/animation/combatSpacing";
import { roamPose, DEFAULT_ROAM } from "@/lib/animation/arenaRoam";
import { damp } from "@/lib/animation/math";
import { impactKindFor } from "@/lib/animation/impactVfx";
import type { CameraCueName } from "@/lib/animation/cameraDirector";
import { momentumHitStopBonus } from "@/lib/animation/momentumHitStop";

interface BattleCanvasProps {
  chickenA: Chicken;
  chickenB: Chicken;
  log: CombatLogEntry[];
  audioEnabled: boolean;
  onReplayEnd: () => void;
  /** Fired the instant each log entry's impact actually lands (in sync with VFX/audio) — used by the /live feed's comic commentary overlay. Optional; existing callers are unaffected. */
  onImpact?: (entry: CombatLogEntry) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rot: number;
  vrot: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  alpha: number;
  life: number;
  maxLife: number;
}

/** Display-only fighter state, derived by replaying the server-computed log one entry at a time. */
interface FighterVisual {
  id: string;
  name: string;
  colorScheme: Chicken["colorScheme"];
  hp: number;
  maxHp: number;
  fatigued: boolean;
}

const HIT_ZONE_LABELS: Record<string, string> = {
  head: "HEAD",
  neck: "NECK",
  body: "BODY",
  left_wing: "L WING",
  right_wing: "R WING",
  left_leg: "L LEG",
  right_leg: "R LEG",
};

// FighterAnim offsets are authored in a px-ish space and turned into a world
// delta on the model by ANIM_PX_TO_WORLD (inner-group PX_TO_WORLD × stage
// scale). The roam/lunge system below works in world units and converts at the
// edge with this helper, so distances read as real arena metres.
const worldToAnimPx = (w: number) => w / ANIM_PX_TO_WORLD;

/** Body-width clearance (world units) a lunge always leaves between the two birds so a dash can't sail through the opponent. */
const BODY_CLEARANCE_WORLD = 0.8;

/** Cosmetic flinch magnitude by stagger tier — knockdown is suppressed here since real physics knockback/topple (ChickenPhysicsRig) takes over instead. */
const STAGGER_FLINCH_MULT: Record<StaggerLevel, number> = {
  none: 0.25,
  light: 0.55,
  // A trip reads as losing footing, not just a bigger flinch — slightly more than a plain medium hit.
  stumble: 1.2,
  medium: 1,
  heavy: 1.5,
  knockdown: 0,
};

/** Mid of the genetic IV range (40-99) — stat ratios below are normalized against this "average bird". */
const STAT_BASELINE = 70;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Attacker power vs baseline — scales real-physics knockback magnitude (ChickenPhysicsRig). */
function powerRatio(chicken: Chicken): number {
  return clamp(effectiveStat(chicken, "power") / STAT_BASELINE, 0.6, 1.8);
}

/** Defender speed/stamina (+ an endurance-style bonus) vs baseline — scales how fast footing recovers after a stumble/knockdown. */
function recoveryRatio(chicken: Chicken): number {
  const speed = effectiveStat(chicken, "speed");
  const stamina = effectiveStat(chicken, "stamina");
  let ratio = ((speed + stamina) / 2 / STAT_BASELINE);
  if (chicken.fightingStyle === "endurance") ratio *= 1.15;
  return clamp(ratio, 0.7, 1.5);
}

/**
 * Per-style animation feel (spec: stats/genetics should read in the fight, not just the numbers).
 * `windupMult` scales the whole attack clip's duration uniformly (phase *fractions* never change,
 * so IMPACT_AT keeps lining up with the strike) — aggressive is snappier, counter/endurance more deliberate.
 * `lungeMult` scales dash distance (still clamped so a lunge can never close past body clearance). `idleLean`/`idleBobMult` shape
 * the resting stance so styles read differently even before an exchange happens.
 */
interface StyleAnimParams {
  windupMult: number;
  lungeMult: number;
  idleLean: number;
  idleBobMult: number;
}

/**
 * Adapter over the shared `battlePersonality` module (spec §24) so the rest of
 * this file's call sites keep their existing field names. Personality is the
 * single source of truth for presentation feel — no per-style table here.
 */
function styleAnimParams(style: FightingStyle): StyleAnimParams {
  const p = personalityForStyle(style);
  return {
    windupMult: p.timingMul,
    lungeMult: p.lungeCommit,
    idleLean: p.idleLean,
    idleBobMult: p.idleBobMul,
  };
}

/** Extra neutral-beat pacing (seconds) added on top of each move's own recovery + minNeutralBeat. */
const BASE_PACING_S = 0.3;

/** Stagger tiers that produce a real-physics knockback impulse (spec §13/§25 debug readout). */
const KNOCKBACK_STAGGERS = new Set<StaggerLevel>(["stumble", "medium", "heavy", "knockdown"]);

/** Hold on the defeated bird before the winner's victory pose plays (spec §15: 0.25–0.5s). */
const KO_RECOGNITION_MS = 350;

/** Which attack move plays, driven by the server-rolled hit zone so variety falls out of combat data. */
type MoveKind = "body" | "leg" | "wing" | "peck" | "spin_kick" | "aerial";

/** Deterministic 0..1 pseudo-random from a numeric seed, so the same combat log always replays the same move variant. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Leg/wing hits pick between the plain move and a flashier rigged-model
 * variant (spinning back kick / aerial flip) — always on a crit, otherwise
 * a fraction of the time, seeded off the turn number so replays stay stable.
 */
function moveKindForZone(hitZone: string | null, turn: number, isCrit: boolean): MoveKind {
  // Roosters are flying birds — sabong roosters spend a lot of a real match
  // airborne. `r` seeds a per-turn airborne roll shared across zones so aerials
  // and spinning kicks show up frequently, not just on the odd wing hit.
  const r = pseudoRandom(turn * 2.71);
  if (isCrit && r < 0.7) return "aerial";

  if (hitZone === "left_leg" || hitZone === "right_leg") {
    if (r < 0.3) return "aerial";
    return isCrit || pseudoRandom(turn * 7.13) < 0.55 ? "spin_kick" : "leg";
  }
  if (hitZone === "left_wing" || hitZone === "right_wing") {
    return isCrit || pseudoRandom(turn * 3.37) < 0.6 ? "aerial" : "wing";
  }
  if (hitZone === "head" || hitZone === "neck") {
    return r < 0.4 ? "aerial" : "peck";
  }
  // body
  if (r < 0.42) return "aerial";
  return pseudoRandom(turn * 5.9) < 0.3 ? "spin_kick" : "body";
}

/** Un-signed, un-scaled pose values for one instant of an attack — the caller applies `dir` and `distance`. */
interface AttackPose {
  reach: number; // -0.1..~1.1 fraction of the forward dash distance
  hop: number; // px, jump height
  lean: number; // rad, forward lean
  stretch: number; // -1 (squash) .. 1 (stretch), for scale
  wingSwipe: number; // wing smack angle
  legKick: number; // scratching/kicking angle
  lateral?: number; // -1..1, depth-axis (Z) arc — aerial loop-arounds
  spin?: number; // rad, extra yaw on top of facing — spin attacks
  roll?: number; // rad, barrel-roll on top of upright — aerial flips
}

/** Shared phase boundaries (fraction of ATTACK_DURATION) every move follows, so IMPACT_AT keeps lining up with the strike phase. */
const COIL_END = 0.16;
const LEAP_END = 0.52;
const STRIKE_END = 0.7;

/** Baseline dash-smack — wings and talons both contribute, forward reach dominates. */
function bodyAttackPose(progress: number): AttackPose {
  if (progress < COIL_END) {
    const p = progress / COIL_END;
    const ease = Math.sin(p * Math.PI * 0.5);
    return { reach: -0.08 * ease, hop: 0, lean: -0.15 * ease, stretch: -ease, wingSwipe: 0, legKick: 0 };
  }
  if (progress < LEAP_END) {
    const p = (progress - COIL_END) / (LEAP_END - COIL_END);
    const easeOut = 1 - Math.pow(1 - p, 3);
    const arc = Math.sin(p * Math.PI);
    return {
      reach: -0.08 + easeOut * 1.08,
      hop: arc * 34,
      lean: 0.3 * easeOut,
      stretch: arc * 0.6,
      wingSwipe: p > 0.55 ? -((p - 0.55) / 0.45) * 1.1 : 0,
      legKick: 0,
    };
  }
  if (progress < STRIKE_END) {
    const p = (progress - LEAP_END) / (STRIKE_END - LEAP_END);
    return {
      reach: 1,
      hop: (1 - p) * 10,
      lean: 0.32,
      stretch: 0,
      wingSwipe: Math.sin(p * Math.PI) * 2.6,
      legKick: Math.sin(p * Math.PI * 3) * 2.2,
    };
  }
  const p = (progress - STRIKE_END) / (1 - STRIKE_END);
  const ease = 1 - Math.pow(1 - p, 2);
  return { reach: 1 - ease, hop: 0, lean: 0.32 * (1 - ease), stretch: 0, wingSwipe: 0, legKick: 0 };
}

/** Jump-kick — a bigger vertical hop with the kick winding up early and landing as one strong strike. */
function legAttackPose(progress: number): AttackPose {
  if (progress < COIL_END) {
    const p = progress / COIL_END;
    const ease = Math.sin(p * Math.PI * 0.5);
    return { reach: -0.05 * ease, hop: 0, lean: -0.1 * ease, stretch: -ease * 1.1, wingSwipe: 0, legKick: 0 };
  }
  if (progress < LEAP_END) {
    const p = (progress - COIL_END) / (LEAP_END - COIL_END);
    const easeOut = 1 - Math.pow(1 - p, 3);
    const arc = Math.sin(p * Math.PI);
    return {
      reach: -0.05 + easeOut * 0.9,
      hop: arc * 52,
      lean: 0.22 * easeOut,
      stretch: arc * 0.5,
      wingSwipe: 0,
      legKick: p > 0.4 ? -((p - 0.4) / 0.6) * 1.4 : 0,
    };
  }
  if (progress < STRIKE_END) {
    const p = (progress - LEAP_END) / (STRIKE_END - LEAP_END);
    return {
      reach: 0.95,
      hop: (1 - p) * 22,
      lean: 0.2,
      stretch: 0,
      wingSwipe: Math.sin(p * Math.PI) * 0.6,
      legKick: Math.sin(p * Math.PI) * 2.8,
    };
  }
  const p = (progress - STRIKE_END) / (1 - STRIKE_END);
  const ease = 1 - Math.pow(1 - p, 2);
  return { reach: 0.95 * (1 - ease), hop: 0, lean: 0.2 * (1 - ease), stretch: 0, wingSwipe: 0, legKick: 0 };
}

/** Wing-buffet — close-range, wings do almost all the work instead of a long dash. */
function wingAttackPose(progress: number): AttackPose {
  if (progress < COIL_END) {
    const p = progress / COIL_END;
    const ease = Math.sin(p * Math.PI * 0.5);
    return { reach: -0.1 * ease, hop: 0, lean: -0.12 * ease, stretch: -ease * 0.7, wingSwipe: -ease * 0.8, legKick: 0 };
  }
  if (progress < LEAP_END) {
    const p = (progress - COIL_END) / (LEAP_END - COIL_END);
    const easeOut = 1 - Math.pow(1 - p, 3);
    const arc = Math.sin(p * Math.PI);
    return {
      reach: -0.1 + easeOut * 0.55,
      hop: arc * 18,
      lean: 0.18 * easeOut,
      stretch: arc * 0.4,
      wingSwipe: -0.8 - (p > 0.3 ? ((p - 0.3) / 0.7) * 1.2 : 0),
      legKick: 0,
    };
  }
  if (progress < STRIKE_END) {
    const p = (progress - LEAP_END) / (STRIKE_END - LEAP_END);
    return {
      reach: 0.55,
      hop: (1 - p) * 6,
      lean: 0.2,
      stretch: 0,
      wingSwipe: Math.sin(p * Math.PI) * 3.4,
      legKick: Math.sin(p * Math.PI * 2) * 0.5,
    };
  }
  const p = (progress - STRIKE_END) / (1 - STRIKE_END);
  const ease = 1 - Math.pow(1 - p, 2);
  return { reach: 0.55 * (1 - ease), hop: 0, lean: 0.2 * (1 - ease), stretch: 0, wingSwipe: 0, legKick: 0 };
}

/** Peck-lunge — a sharp head-first jab that overextends then snaps back quickly. */
function peckAttackPose(progress: number): AttackPose {
  if (progress < COIL_END) {
    const p = progress / COIL_END;
    const ease = Math.sin(p * Math.PI * 0.5);
    return { reach: -0.04 * ease, hop: 0, lean: -0.2 * ease, stretch: -ease * 0.5, wingSwipe: 0, legKick: 0 };
  }
  if (progress < LEAP_END) {
    const p = (progress - COIL_END) / (LEAP_END - COIL_END);
    const easeOut = 1 - Math.pow(1 - p, 5);
    const arc = Math.sin(p * Math.PI);
    return {
      reach: -0.04 + easeOut * 1.15,
      hop: arc * 14,
      lean: 0.4 * easeOut,
      stretch: arc * 0.3,
      wingSwipe: 0,
      legKick: 0,
    };
  }
  if (progress < STRIKE_END) {
    const p = (progress - LEAP_END) / (STRIKE_END - LEAP_END);
    return { reach: 1.1, hop: (1 - p) * 4, lean: 0.42, stretch: 0, wingSwipe: Math.sin(p * Math.PI) * 1.0, legKick: 0 };
  }
  const p = (progress - STRIKE_END) / (1 - STRIKE_END);
  const ease = 1 - Math.pow(1 - p, 4);
  return { reach: 1.1 * (1 - ease), hop: 0, lean: 0.42 * (1 - ease), stretch: 0, wingSwipe: 0, legKick: 0 };
}

/** Spinning back kick — leg-attack variant: the body whips through a near-full rotation, the kick landing as it comes back around. */
function spinKickPose(progress: number): AttackPose {
  // One continuous ease across the whole clip rather than per-phase — a real spin
  // doesn't stop and restart at each timeline boundary. 2π reads identically to 0,
  // so this unwinds back to "facing forward" by the time the move ends.
  const smooth = progress * progress * (3 - 2 * progress);
  const spin = smooth * Math.PI * 2;

  let base: AttackPose;
  if (progress < COIL_END) {
    const p = progress / COIL_END;
    const ease = Math.sin(p * Math.PI * 0.5);
    base = { reach: -0.1 * ease, hop: 0, lean: -0.08 * ease, stretch: -ease, wingSwipe: 0, legKick: 0 };
  } else if (progress < LEAP_END) {
    const p = (progress - COIL_END) / (LEAP_END - COIL_END);
    const easeOut = 1 - Math.pow(1 - p, 3);
    const arc = Math.sin(p * Math.PI);
    base = {
      reach: -0.1 + easeOut * 0.85,
      hop: arc * 40,
      lean: 0.18 * easeOut,
      stretch: arc * 0.55,
      wingSwipe: arc * 0.6,
      legKick: 0,
    };
  } else if (progress < STRIKE_END) {
    const p = (progress - LEAP_END) / (STRIKE_END - LEAP_END);
    base = {
      reach: 0.9,
      hop: (1 - p) * 14,
      lean: 0.15,
      stretch: 0,
      wingSwipe: 0.3,
      legKick: Math.sin(p * Math.PI) * 3.2,
    };
  } else {
    const p = (progress - STRIKE_END) / (1 - STRIKE_END);
    const ease = 1 - Math.pow(1 - p, 2);
    base = { reach: 0.9 * (1 - ease), hop: 0, lean: 0.15 * (1 - ease), stretch: 0, wingSwipe: 0, legKick: 0 };
  }

  return { ...base, spin };
}

/** Back aerial attack — wing-attack variant: a high leap that loops out to the side and flips before striking down on the way past. */
function aerialPose(progress: number): AttackPose {
  // Same one-continuous-arc approach as spin above: a single sideways loop-out-
  // and-back (lateral) and a single flip (roll, resolving to 2π ≡ upright).
  const lateral = Math.sin(progress * Math.PI) * 0.85;
  const smooth = progress * progress * (3 - 2 * progress);
  const roll = smooth * Math.PI * 2;

  let base: AttackPose;
  if (progress < COIL_END) {
    const p = progress / COIL_END;
    const ease = Math.sin(p * Math.PI * 0.5);
    base = { reach: -0.15 * ease, hop: 0, lean: -0.15 * ease, stretch: -ease * 1.2, wingSwipe: -ease, legKick: 0 };
  } else if (progress < LEAP_END) {
    const p = (progress - COIL_END) / (LEAP_END - COIL_END);
    const easeOut = 1 - Math.pow(1 - p, 3);
    const arc = Math.sin(p * Math.PI);
    base = {
      reach: -0.15 + easeOut * 0.75,
      hop: arc * 68,
      lean: 0.15 * easeOut,
      stretch: arc * 0.5,
      wingSwipe: -1 - arc * 1.2,
      legKick: arc * 1.4,
    };
  } else if (progress < STRIKE_END) {
    const p = (progress - LEAP_END) / (STRIKE_END - LEAP_END);
    base = {
      reach: 0.8,
      hop: (1 - p) * 30,
      lean: 0.28,
      stretch: 0,
      wingSwipe: Math.sin(p * Math.PI) * 3,
      legKick: Math.sin(p * Math.PI) * 2.6,
    };
  } else {
    const p = (progress - STRIKE_END) / (1 - STRIKE_END);
    const ease = 1 - Math.pow(1 - p, 2);
    base = { reach: 0.8 * (1 - ease), hop: 0, lean: 0.28 * (1 - ease), stretch: 0, wingSwipe: 0, legKick: 0 };
  }

  return { ...base, lateral, roll };
}

/** Server move-kind → the procedural attack STATE the 3D controller should play (design §8). */
function attackStateForMove(moveKind: MoveKind): AnimState {
  switch (moveKind) {
    case "peck":
      return "peck_attack";
    case "leg":
      return "quick_kick";
    case "spin_kick":
      return "heavy_kick";
    case "wing":
      return "wing_strike";
    case "aerial":
      return "flying_kick";
    default:
      return "charge_attack";
  }
}

/** Server stagger tier (+ critical flag) → the defender's hit-reaction STATE. */
function hitStateForStagger(stagger: StaggerLevel, isCritical: boolean): AnimState {
  if (isCritical) return "hit_critical";
  switch (stagger) {
    case "knockdown":
      return "knockdown";
    case "heavy":
      return "hit_heavy";
    case "stumble":
      return "stagger";
    case "medium":
      return "hit_medium";
    default:
      return "hit_light";
  }
}

function attackPoseFor(moveKind: MoveKind, progress: number): AttackPose {
  if (moveKind === "leg") return legAttackPose(progress);
  if (moveKind === "spin_kick") return spinKickPose(progress);
  if (moveKind === "wing") return wingAttackPose(progress);
  if (moveKind === "aerial") return aerialPose(progress);
  if (moveKind === "peck") return peckAttackPose(progress);
  return bodyAttackPose(progress);
}

/**
 * Replays a pre-computed `CombatLogEntry[]` (from `simulateFight`, run server-side)
 * one turn at a time on a canvas. Ported from the legacy `BattleArena` — the
 * animation/particle/audio machinery is unchanged, only the data it replays
 * comes from a fixed log instead of driving a live `BattleEngine`.
 */
export default function BattleCanvas({
  chickenA,
  chickenB,
  log,
  audioEnabled,
  onReplayEnd,
  onImpact,
}: BattleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);

  // Callbacks are read through refs so a caller passing an inline (non-memoized)
  // function — e.g. one that itself triggers a re-render, like /live's comic
  // commentary — doesn't change the main effect's dependency array and force it
  // to tear down and restart the whole replay from turn 0 on every impact.
  const onReplayEndRef = useRef(onReplayEnd);
  const onImpactRef = useRef(onImpact);
  useEffect(() => {
    onReplayEndRef.current = onReplayEnd;
    onImpactRef.current = onImpact;
  });

  // HUD state (React-rendered, updates once per turn — not per frame).
  const [hudA, setHudA] = useState({ hp: maxHealth(chickenA), maxHp: maxHealth(chickenA), fatigued: false });
  const [hudB, setHudB] = useState({ hp: maxHealth(chickenB), maxHp: maxHealth(chickenB), fatigued: false });

  // Live per-frame fighter state, read directly by the 3D models (BattleStage3D)
  // every frame — mutated by the RAF loop below, not by React state.
  const animR1Ref = useRef<FighterAnim>({
    offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0,
  });
  const animR2Ref = useRef<FighterAnim>({
    offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0,
  });

  // Imperative handles onto each fighter's rigid body, for the real-physics
  // knockback/knockdown triggered at impact time below — separate from the
  // cosmetic FighterAnim refs above, which drive the puppeted bone poses.
  const physicsR1Ref = useRef<ChickenPhysicsHandle>(null);
  const physicsR2Ref = useRef<ChickenPhysicsHandle>(null);

  // Procedural-animation intent per fighter — written on turn start (attacker's
  // attack) and at impact (defender's hit/knockdown/death). The controller in
  // ChickenModel self-manages the ready/walk/recovery transitions between these.
  const intentR1Ref = useRef<AnimIntent | null>(null);
  const intentR2Ref = useRef<AnimIntent | null>(null);

  // Latest attack cue for the 3D camera — same attacker/crit/miss/timing info that
  // drives the 2D lunge below, mirrored here so BattleStage3D's camera can react
  // without duplicating combat logic. `seq` moving forward is what tells the
  // camera a new beat began; it holds the last cue (doesn't reset to null) so the
  // camera has something to ease back from between turns.
  const cameraCueRef = useRef<CameraCue | null>(null);

  // V2 presentation plumbing.
  const vfxRef = useRef<ImpactVFXHandle>(null);
  /** 0 while a hit-stop freeze is active — the 3D layer (camera, VFX) reads this to freeze in step with the 2D timeline. */
  const hitStopScaleRef = useRef(1);
  const debugRef = useRef<BattleDebugState>(makeDebugState());
  const [showDebug] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("debugBattle")
  );

  useEffect(() => {
    const audio = new AudioEngine(audioEnabled);
    audioRef.current = audio;
    audio.playMusic();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTurnTime = Date.now();
    // Per-move pacing now comes from the choreography table (spec §2 / §16):
    // each turn sets `turnInterval` to that move's full scripted length plus a
    // personality-scaled neutral beat, so heavy moves visibly commit the bird
    // and the fight stops feeling like machine-gun exchanges. Seeded with a
    // short opening beat before the first turn.
    let turnInterval = 850;
    let logIndex = 0;
    let replayEnded = false;
    // Momentum juice (spec Phase B): last-seen momentum per fighter, so a big
    // swing on the turn that lands can add a touch of extra hit-stop.
    let prevMomentumA = 0;
    let prevMomentumB = 0;

    const maxHpA = maxHealth(chickenA);
    const maxHpB = maxHealth(chickenB);
    const visualA: FighterVisual = {
      id: chickenA.id,
      name: chickenA.name,
      colorScheme: chickenA.colorScheme,
      hp: maxHpA,
      maxHp: maxHpA,
      fatigued: false,
    };
    const visualB: FighterVisual = {
      id: chickenB.id,
      name: chickenB.name,
      colorScheme: chickenB.colorScheme,
      hp: maxHpB,
      maxHp: maxHpB,
      fatigued: false,
    };

    const particles: Particle[] = [];
    const floatingTexts: FloatingText[] = [];

    const animR1 = animR1Ref.current;
    const animR2 = animR2Ref.current;
    Object.assign(animR1, { offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });
    Object.assign(animR2, { offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });

    // --- arena roam state -------------------------------------------------------
    // Each fighter's actual ring position in world units, damped toward
    // roamPose() every frame so the pair circles, gives ground and cuts angles
    // across the whole pit instead of standing pinned to ±WORLD_HALF_GAP. The
    // lunge/flinch beats below ride on top of this base, and `engagement`
    // mirrors it out for the deferred fireImpact closure (knockback direction,
    // VFX placement) and the debug overlay.
    const roam = (() => {
      const seed = roamPose(Date.now(), DEFAULT_ROAM, 0);
      return {
        baseAX: seed.a.x, baseAZ: seed.a.z,
        baseBX: seed.b.x, baseBZ: seed.b.z,
        yawA: seed.yawA, yawB: seed.yawB,
      };
    })();
    const engagement = {
      ax: roam.baseAX, az: roam.baseAZ,
      bx: roam.baseBX, bz: roam.baseBZ,
      /** Unit vector from fighter A's ring position toward fighter B's. */
      ux: 1, uz: 0,
    };
    let prevFrameNow = Date.now();

    // Mass is a bounded ~0.85–1.15 multiplier (see lib/physicalProfile) — heavier
    // birds take proportionally longer to complete a strike, lighter birds snap
    // faster. Computed once per fighter since physical genetics/style don't change mid-fight.
    const massA = resolvePhysicalProfile(chickenA).mass;
    const massB = resolvePhysicalProfile(chickenB).mass;
    const styleA = styleAnimParams(chickenA.fightingStyle);
    const styleB = styleAnimParams(chickenB.fightingStyle);
    const personaA = personalityForStyle(chickenA.fightingStyle);
    const personaB = personalityForStyle(chickenB.fightingStyle);
    const powerRatioA = powerRatio(chickenA);
    const powerRatioB = powerRatio(chickenB);
    const recoveryRatioA = recoveryRatio(chickenA);
    const recoveryRatioB = recoveryRatio(chickenB);

    // Centralized virtual clock (spec §8): equals real time except during a
    // hit-stop freeze, when `now()` holds flat so a heavy hit reads as violent.
    // requestAnimationFrame / React / unrelated timers keep running.
    const hitStop = new HitStopController();
    debugRef.current = makeDebugState();
    debugRef.current.attacker = chickenA.name;
    debugRef.current.defender = chickenB.name;
    debugRef.current.idealDistance = DEFAULT_SPACING.idealCombatDistance;
    debugRef.current.attackRange = DEFAULT_SPACING.attackRange;
    debugRef.current.minDistance = DEFAULT_SPACING.minimumCombatDistance;
    debugRef.current.personaA = personaA.archetype;
    debugRef.current.personaB = personaB.archetype;

    // Opening establishing shot.
    let cueSeq = 1;
    cameraCueRef.current = {
      attacker: "r1",
      startTime: Date.now(),
      isCrit: false,
      isMiss: false,
      stagger: "none",
      seq: cueSeq,
      cueName: "battle_start",
      focus: "midpoint",
    };
    const emitCue = (partial: Omit<CameraCue, "seq">) => {
      cueSeq += 1;
      cameraCueRef.current = { ...partial, seq: cueSeq };
    };

    let activeAttack: {
      attacker: "r1" | "r2";
      startTime: number;
      duration: number;
      /** Fraction of `duration` at which contact happens — from the move's choreography, not a fixed constant. */
      impactAtFrac: number;
      isMiss: boolean;
      stagger: StaggerLevel;
      isCritical: boolean;
      moveKind: MoveKind;
      hitZone: HitZone | null;
      impactFired: boolean;
      fireImpact: (impactNow: number) => void;
      /** Change in the attacker's momentum this turn vs last turn — feeds momentumHitStopBonus. */
      momentumSwing: number;
    } | null = null;

    /** Camera cue for a resolved hit (spec §21) — mirrors combatPresentation's cameraCueForResult, kept local since BattleCanvas already owns the per-turn entry shape. */
    const cameraCueForEntry = (entry: CombatLogEntry, isFatal: boolean): CameraCueName => {
      if (entry.isMiss) return "attack";
      if (isFatal || entry.isCritical) return "critical";
      if (entry.stagger === "knockdown") return "knockdown";
      if (entry.stagger === "heavy" || entry.stagger === "stumble" || entry.stagger === "medium") return "impact_heavy";
      return "impact_light";
    };

    const spawnFeathers = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color,
          size: 4 + Math.random() * 5,
          alpha: 1, life: 0, maxLife: 30 + Math.random() * 20,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
        });
      }
    };

    const spawnText = (x: number, y: number, text: string, color: string, fontSize = 20) => {
      floatingTexts.push({
        x: x + (Math.random() - 0.5) * 20, y, text, color, fontSize,
        alpha: 1, life: 0, maxLife: 45,
      });
    };

    const animate = () => {
      const rawNow = Date.now();
      hitStop.tick(rawNow);
      const now = hitStop.now();
      // Camera/VFX in the 3D layer read this to freeze in lockstep with the 2D timeline.
      hitStopScaleRef.current = hitStop.frozen ? 0 : 1;
      debugRef.current.hitStopMs = hitStop.remaining * 1000;
      const currentAudio = audioRef.current;
      if (!currentAudio) return;

      const width = canvas.width;
      const height = canvas.height;
      const r1BaseX = width * 0.3;
      const r2BaseX = width * 0.7;
      const roosterBaseY = height - 140;

      if (now - lastTurnTime >= turnInterval && logIndex < log.length) {
        const entry = log[logIndex];
        logIndex += 1;
        setCurrentTurn(entry.turn);
        debugRef.current.turn = entry.turn;

        const isAAttacking = entry.attackerId === visualA.id;
        const defenderVisual = isAAttacking ? visualB : visualA;
        const targetX = isAAttacking ? r2BaseX : r1BaseX;
        const targetColor = isAAttacking ? visualB.colorScheme.body : visualA.colorScheme.body;

        // Momentum juice: how much the attacker's momentum moved this turn,
        // vs. the last turn we saw for that same fighter. `entry.momentum`
        // is keyed by role (whoever attacked this turn), not by fighter.
        const prevAttackerMomentum = isAAttacking ? prevMomentumA : prevMomentumB;
        const attackerMomentum = entry.momentum?.attacker ?? prevAttackerMomentum;
        const momentumSwing = attackerMomentum - prevAttackerMomentum;
        if (entry.momentum) {
          if (isAAttacking) {
            prevMomentumA = entry.momentum.attacker;
            prevMomentumB = entry.momentum.defender;
          } else {
            prevMomentumB = entry.momentum.attacker;
            prevMomentumA = entry.momentum.defender;
          }
        }

        // Effects (HP, sound, particles, flash) are deferred to IMPACT_AT below,
        // fired once the fighter's wings/talons actually reach the target.
        const fireImpact = (impactNow: number) => {
          onImpactRef.current?.(entry);
          defenderVisual.hp = Math.max(0, entry.defenderHp);
          defenderVisual.fatigued = defenderVisual.hp < defenderVisual.maxHp * 0.3;
          const setDefenderHud = isAAttacking ? setHudB : setHudA;
          setDefenderHud({ hp: defenderVisual.hp, maxHp: defenderVisual.maxHp, fatigued: defenderVisual.fatigued });

          if (entry.isMiss) {
            currentAudio.playMiss();
            spawnText(targetX, roosterBaseY - 60, "MISS!", "#eab308", 22);
          } else if (entry.isCritical) {
            currentAudio.playCrit();
            spawnFeathers(targetX, roosterBaseY - 20, targetColor, 26);
            spawnFeathers(targetX, roosterBaseY - 20, "#ff0000", 18);
            const zoneLabel = entry.hitZone ? HIT_ZONE_LABELS[entry.hitZone] : "";
            spawnText(targetX, roosterBaseY - 80, `CRITICAL — ${zoneLabel}`, "#ff0000", 24);
            spawnText(targetX, roosterBaseY - 50, `-${Math.floor(entry.damage)}`, "#ef4444", 20);
          } else if (entry.isCrit) {
            currentAudio.playCrit();
            spawnFeathers(targetX, roosterBaseY - 20, targetColor, 20);
            spawnFeathers(targetX, roosterBaseY - 20, "#fbbf24", 15);
            const zoneLabel = entry.hitZone ? HIT_ZONE_LABELS[entry.hitZone] : "";
            spawnText(targetX, roosterBaseY - 70, `CRIT! -${Math.floor(entry.damage)} ${zoneLabel}`, "#f97316", 24);
          } else {
            currentAudio.playHit();
            spawnFeathers(targetX, roosterBaseY - 20, targetColor, 10);
            const zoneLabel = entry.hitZone ? HIT_ZONE_LABELS[entry.hitZone] : "";
            spawnText(targetX, roosterBaseY - 50, `-${Math.floor(entry.damage)} ${zoneLabel}`, "#ef4444", 18);
          }

          if (!entry.isMiss) {
            if (isAAttacking) animR2.flash = 1;
            else animR1.flash = 1;

            const defenderPhysics = isAAttacking ? physicsR2Ref.current : physicsR1Ref.current;
            // Knockback now follows the live attacker→defender axis (the pair can
            // be at any angle in the ring), not a fixed ±X.
            const knockDirX = isAAttacking ? engagement.ux : -engagement.ux;
            const knockDirZ = isAAttacking ? engagement.uz : -engagement.uz;
            const attackerPowerRatio = isAAttacking ? powerRatioA : powerRatioB;
            const defenderRecoveryRatio = isAAttacking ? recoveryRatioB : recoveryRatioA;

            // Drive the defender's procedural reaction (and the attacker's
            // victory pose on a KO). The 3D controller self-returns to
            // ready/walk afterwards, so nothing needs resetting here.
            const defenderIntent = isAAttacking ? intentR2Ref : intentR1Ref;
            const defenderFacing: "left" | "right" = isAAttacking ? "left" : "right";
            const fatal = entry.defenderHp <= 0;

            // Impact VFX (spec §19/§20): spawn at the defender's actual
            // presentation-collider contact point when we can resolve one,
            // falling back to a nominal chest-height point above the model.
            const vfxKind = impactKindFor({
              isMiss: entry.isMiss,
              isCritical: entry.isCritical,
              stagger: entry.stagger,
            });
            if (vfxKind && vfxRef.current) {
              const zone = entry.hitZone ?? "body";
              const zonePos = defenderPhysics?.getZonePosition(zone as HitZone) ?? null;
              const fallbackX = isAAttacking ? engagement.bx : engagement.ax;
              const fallbackZ = isAAttacking ? engagement.bz : engagement.az;
              const pos =
                zonePos ??
                new THREE.Vector3(fallbackX, -0.2, fallbackZ);
              const normal = new THREE.Vector3(knockDirX, 0.15, knockDirZ);
              vfxRef.current.spawn(vfxKind, pos, normal);
            }

            debugRef.current.stagger = entry.stagger;
            debugRef.current.knockback = KNOCKBACK_STAGGERS.has(entry.stagger);
            debugRef.current.knockdown = entry.stagger === "knockdown" || fatal;

            if (fatal) {
              defenderIntent.current = {
                state: "death",
                startedAt: impactNow,
                speed: 1,
                fatal: true,
                facing: defenderFacing,
              };
              // KO always topples the body and never rights it (design decision 4).
              defenderPhysics?.applyKnockback(knockDirX, knockDirZ, "knockdown", attackerPowerRatio, defenderRecoveryRatio, {
                suppressRecovery: true,
              });
              const attackerIntent = isAAttacking ? intentR1Ref : intentR2Ref;
              // Recognition beat (spec §15): the winner doesn't celebrate
              // instantly — a short hold on the defeated bird first.
              attackerIntent.current = {
                state: "victory",
                startedAt: impactNow + KO_RECOGNITION_MS,
                speed: 1,
                facing: isAAttacking ? "right" : "left",
              };
              emitCue({
                attacker: isAAttacking ? "r1" : "r2",
                startTime: impactNow,
                isCrit: true,
                isMiss: false,
                stagger: entry.stagger,
                cueName: "death",
                focus: isAAttacking ? "r2" : "r1",
              });
              setTimeout(() => {
                emitCue({
                  attacker: isAAttacking ? "r1" : "r2",
                  startTime: impactNow + KO_RECOGNITION_MS,
                  isCrit: true,
                  isMiss: false,
                  stagger: entry.stagger,
                  cueName: "victory",
                  focus: isAAttacking ? "r1" : "r2",
                });
              }, KO_RECOGNITION_MS);
            } else {
              defenderIntent.current = {
                state: hitStateForStagger(entry.stagger, entry.isCritical),
                startedAt: impactNow,
                speed: 1,
                stagger: entry.stagger,
                facing: defenderFacing,
              };
              defenderPhysics?.applyKnockback(knockDirX, knockDirZ, entry.stagger, attackerPowerRatio, defenderRecoveryRatio);

              // A non-fatal knockdown holds its final pose by design (see
              // ProceduralAnimationController) until something explicitly
              // requests "getup" — nothing did, so a downed-but-alive bird
              // used to stay on the ground forever. Fire that beat once the
              // physics rig is done toppling it back upright.
              if (entry.stagger === "knockdown") {
                const getUpDelay = scaledRecoveryMs(KNOCKDOWN_RECOVER_MS, defenderRecoveryRatio);
                setTimeout(() => {
                  // Only stand up if nothing else (a later hit, a KO) has
                  // since moved this fighter on to a different intent.
                  if (defenderIntent.current?.state === "knockdown") {
                    defenderIntent.current = {
                      state: "getup",
                      startedAt: Date.now(),
                      speed: 1,
                      facing: defenderFacing,
                    };
                  }
                }, getUpDelay);
              }

              emitCue({
                attacker: isAAttacking ? "r1" : "r2",
                startTime: impactNow,
                isCrit: entry.isCrit || entry.isCritical,
                isMiss: false,
                stagger: entry.stagger,
                cueName: cameraCueForEntry(entry, false),
                focus: isAAttacking ? "r2" : "r1",
              });
            }
          } else {
            emitCue({
              attacker: isAAttacking ? "r1" : "r2",
              startTime: impactNow,
              isCrit: false,
              isMiss: true,
              stagger: entry.stagger,
              cueName: "attack",
              focus: isAAttacking ? "r1" : "r2",
            });
          }

          if (defenderVisual.fatigued) {
            currentAudio.playFatigue();
          }

          if (logIndex >= log.length && !replayEnded) {
            replayEnded = true;
            currentAudio.playVictory();
            setTimeout(() => onReplayEndRef.current(), 1000);
          }
        };

        const moveKind = moveKindForZone(entry.hitZone, entry.turn, entry.isCrit || entry.isCritical);
        const attackState = attackStateForMove(moveKind);
        // Choreography (spec §2): per-move anticipation/active/recovery beats
        // and the contact fraction, mass- and personality-scaled uniformly so
        // the impact frame stays lined up with the strike regardless of speed.
        const choreo = getChoreography(attackState);
        const attackerMass = isAAttacking ? massA : massB;
        const attackerStyle = isAAttacking ? styleA : styleB;
        const attackerPersona = isAAttacking ? personaA : personaB;
        const scriptedDuration = choreographyDuration(choreo);
        const durationMs = scriptedDuration * 1000 * attackerMass * attackerStyle.windupMult;
        const impactAtFrac = impactTime(choreo) / scriptedDuration;

        activeAttack = {
          attacker: isAAttacking ? "r1" : "r2",
          startTime: now,
          duration: durationMs,
          impactAtFrac,
          isMiss: entry.isMiss,
          stagger: entry.stagger,
          isCritical: entry.isCritical,
          moveKind,
          hitZone: entry.hitZone,
          impactFired: false,
          fireImpact,
          momentumSwing,
        };
        emitCue({
          attacker: activeAttack.attacker,
          startTime: activeAttack.startTime,
          isCrit: entry.isCrit || entry.isCritical,
          isMiss: entry.isMiss,
          stagger: entry.stagger,
          cueName: "attack",
          focus: activeAttack.attacker,
        });
        debugRef.current.move = moveKind;
        if (isAAttacking) debugRef.current.attackerAnim = attackState;
        else debugRef.current.defenderAnim = attackState;
        debugRef.current.phase = "ANTICIPATION";

        // Attacker plays its attack windup now — hit or miss (a MISS just never
        // triggers a defender reaction; the animation still swings).
        const attackerIntent = isAAttacking ? intentR1Ref : intentR2Ref;
        attackerIntent.current = {
          state: attackState,
          startedAt: now,
          speed: 1 / (attackerMass * attackerStyle.windupMult),
          moveKind: activeAttack.moveKind,
          facing: isAAttacking ? "right" : "left",
        };

        // Next turn begins only once this attack's full choreography (including
        // its own recovery) has played out, plus a personality-scaled neutral
        // beat (spec §16) — eliminates back-to-back "machine-gun" exchanges.
        turnInterval = durationMs + (choreo.minNeutralBeat + BASE_PACING_S) * 1000 * attackerPersona.neutralBeatMul;

        lastTurnTime = now;
      }

      const t = now / 250;

      // Advance the shared ring-position target and damp both fighters toward
      // it — pulled tighter (engageBias) while an attack is live so the roamer
      // doesn't drag a lunging bird back out of its own strike range.
      const frameDt = Math.min(Math.max((now - prevFrameNow) / 1000, 0), 1 / 15);
      prevFrameNow = now;
      const engageBias = activeAttack ? 1 : 0;
      const targetPose = roamPose(now, DEFAULT_ROAM, engageBias);
      const ROAM_LAMBDA = 2.4;
      roam.baseAX = damp(roam.baseAX, targetPose.a.x, ROAM_LAMBDA, frameDt);
      roam.baseAZ = damp(roam.baseAZ, targetPose.a.z, ROAM_LAMBDA, frameDt);
      roam.baseBX = damp(roam.baseBX, targetPose.b.x, ROAM_LAMBDA, frameDt);
      roam.baseBZ = damp(roam.baseBZ, targetPose.b.z, ROAM_LAMBDA, frameDt);
      roam.yawA = dampFacingYaw(roam.yawA, targetPose.yawA, 3, frameDt);
      roam.yawB = dampFacingYaw(roam.yawB, targetPose.yawB, 3, frameDt);

      const gapX = roam.baseBX - roam.baseAX;
      const gapZ = roam.baseBZ - roam.baseAZ;
      const gapDist = Math.max(0.1, Math.hypot(gapX, gapZ));
      const ux = gapX / gapDist;
      const uz = gapZ / gapDist;
      // Perpendicular to the engagement axis — aerial loop-arounds swing out
      // along this before striking back in.
      const perpX = -uz;
      const perpZ = ux;
      engagement.ax = roam.baseAX;
      engagement.az = roam.baseAZ;
      engagement.bx = roam.baseBX;
      engagement.bz = roam.baseBZ;
      engagement.ux = ux;
      engagement.uz = uz;

      if (!activeAttack || activeAttack.attacker !== "r1") {
        animR1.offsetX = worldToAnimPx(roam.baseAX - -WORLD_HALF_GAP);
        animR1.offsetZ = worldToAnimPx(roam.baseAZ);
        animR1.yaw = roam.yawA;
        animR1.roll = 0;
        animR1.offsetY = Math.sin(t) * 4 * styleA.idleBobMult;
        // idleLean is signed toward the opponent (r1 faces right, so +lean tilts forward).
        animR1.rot = Math.sin(t * 0.5) * 0.04 + styleA.idleLean;
        animR1.scaleX = 1 + Math.sin(t) * 0.02;
        animR1.scaleY = 1 - Math.sin(t) * 0.02;
        animR1.wingPhase = Math.sin(t * 3);
        animR1.legPhase = Math.sin(t * 5);
      }
      if (!activeAttack || activeAttack.attacker !== "r2") {
        animR2.offsetX = worldToAnimPx(roam.baseBX - WORLD_HALF_GAP);
        animR2.offsetZ = worldToAnimPx(roam.baseBZ);
        animR2.yaw = roam.yawB;
        animR2.roll = 0;
        animR2.offsetY = Math.cos(t * 0.9) * 4 * styleB.idleBobMult;
        // r2 faces left, so its forward lean is the negative direction.
        animR2.rot = -Math.cos(t * 0.5) * 0.04 - styleB.idleLean;
        animR2.scaleX = 1 + Math.cos(t) * 0.02;
        animR2.scaleY = 1 - Math.cos(t) * 0.02;
        animR2.wingPhase = Math.cos(t * 3);
        animR2.legPhase = Math.cos(t * 5);
      }

      if (activeAttack) {
        const elapsed = now - activeAttack.startTime;
        const progress = Math.min(1, elapsed / activeAttack.duration);
        const impactAt = activeAttack.impactAtFrac;

        if (!activeAttack.impactFired && progress >= impactAt) {
          activeAttack.impactFired = true;
          // Trigger with THIS frame's clock — fireImpact was built at attack-start and
          // would otherwise freeze against a stale timestamp from turns ago.
          const choreo = getChoreography(attackStateForMove(activeAttack.moveKind));
          const hitStopSeconds = activeAttack.isMiss
            ? 0
            : hitStopFor(choreo, activeAttack.stagger, activeAttack.isCritical) +
              momentumHitStopBonus(activeAttack.momentumSwing);
          hitStop.trigger(hitStopSeconds, rawNow);
          debugRef.current.hitStopMs = hitStopSeconds * 1000;
          debugRef.current.phase = "IMPACT";
          activeAttack.fireImpact(now);
        } else if (activeAttack.impactFired) {
          debugRef.current.phase = "RECOVERY";
        } else {
          debugRef.current.phase = "ANTICIPATION";
        }

        if (progress < 1) {
          const attackerIsA = activeAttack.attacker === "r1";
          // Pitch (rot, ChickenModel's rotation.x) convention is per-rig, not
          // per-frame facing — r1's base facing is +X, r2's is −X, so a
          // "leaning forward" pitch needs the opposite sign for r2.
          const dir = attackerIsA ? 1 : -1;
          const attackerAnim = attackerIsA ? animR1 : animR2;
          const defenderAnim = attackerIsA ? animR2 : animR1;
          const attackerAnchorX = attackerIsA ? -WORLD_HALF_GAP : WORLD_HALF_GAP;
          const defenderAnchorX = attackerIsA ? WORLD_HALF_GAP : -WORLD_HALF_GAP;
          const attackerBaseX = attackerIsA ? roam.baseAX : roam.baseBX;
          const attackerBaseZ = attackerIsA ? roam.baseAZ : roam.baseBZ;
          const defenderBaseX = attackerIsA ? roam.baseBX : roam.baseAX;
          const defenderBaseZ = attackerIsA ? roam.baseBZ : roam.baseAZ;
          const attackerStyle = attackerIsA ? styleA : styleB;
          const distanceWorld = gapDist * 0.42 * attackerStyle.lungeMult;

          // Phase timeline, as a fraction of (mass-scaled) attack duration — shared
          // across move kinds so the choreography's contact fraction keeps lining
          // up with the strike phase:
          //   0.00–0.16  coil    — crouch and pull back before the leap
          //   0.16–0.52  leap    — jump forward on an arc toward the opponent
          //   ~impactAt  strike  — full extension, the move's signature hit
          //   0.70–1.00  recover — settle back down to the base stance
          const { reach, hop, lean, stretch, wingSwipe, legKick, lateral, spin, roll } = attackPoseFor(
            activeAttack.moveKind,
            progress
          );

          // Forward lunge rides the live attacker→defender axis (any angle in
          // the ring), clamped so a dash always leaves body clearance and can
          // never sail through the opponent. Aerial moves add a perpendicular
          // `lateral` swing-out so an aerial reads as looping around, not just
          // dashing straight in.
          const maxLungeWorld = Math.max(0, gapDist - BODY_CLEARANCE_WORLD);
          const rawLungeWorld = reach * distanceWorld;
          const lungeMagWorld =
            Math.sign(rawLungeWorld) * Math.min(Math.abs(rawLungeWorld), maxLungeWorld);
          const lateralWorld = (lateral ?? 0) * distanceWorld * 0.7;

          const attackerX = attackerBaseX + ux * lungeMagWorld + perpX * lateralWorld;
          const attackerZ = attackerBaseZ + uz * lungeMagWorld + perpZ * lateralWorld;

          attackerAnim.offsetX = worldToAnimPx(attackerX - attackerAnchorX);
          attackerAnim.offsetZ = worldToAnimPx(attackerZ);
          attackerAnim.offsetY = -hop;
          attackerAnim.yaw = (attackerIsA ? roam.yawA : roam.yawB) + (spin ?? 0);
          attackerAnim.roll = roll ?? 0;
          attackerAnim.rot = lean * dir;
          attackerAnim.scaleX = 1 - stretch * 0.08;
          attackerAnim.scaleY = 1 + stretch * 0.12;
          attackerAnim.wingPhase = wingSwipe;
          attackerAnim.legPhase = legKick;

          const flinchStart = Math.max(0.1, impactAt - 0.07);
          if (progress > flinchStart && !activeAttack.isMiss) {
            // Defender flinches on impact: knocked back a step, wings flare, braces.
            // Scaled by stagger tier — knockdown is suppressed here entirely since
            // ChickenPhysicsRig's real knockback/topple physics drives it instead.
            const flinchMult = STAGGER_FLINCH_MULT[activeAttack.stagger];
            const flinchP = Math.min(1, (progress - flinchStart) / Math.max(0.05, 1 - flinchStart));
            const flinch = Math.sin(flinchP * Math.PI);
            const flinchMaxWorld = Math.max(0, gapDist - BODY_CLEARANCE_WORLD) * 0.35;
            const flinchWorld = Math.min(flinch * 0.4 * flinchMult, flinchMaxWorld);

            const defenderX = defenderBaseX + ux * flinchWorld;
            const defenderZ = defenderBaseZ + uz * flinchWorld;
            defenderAnim.offsetX = worldToAnimPx(defenderX - defenderAnchorX);
            defenderAnim.offsetZ = worldToAnimPx(defenderZ);
            defenderAnim.rot = -flinch * 0.22 * dir * flinchMult;
            defenderAnim.wingPhase = flinch * 0.5 * Math.max(flinchMult, 0.6);
          }
        } else {
          activeAttack = null;
          debugRef.current.phase = "COMPLETE";
          emitCue({
            attacker: "r1",
            startTime: now,
            isCrit: false,
            isMiss: false,
            stagger: "none",
            cueName: "neutral",
            focus: "midpoint",
          });
        }
      } else {
        debugRef.current.phase = "APPROACH";
      }

      debugRef.current.distance = gapDist;

      animR1.flash = Math.max(0, animR1.flash - 0.08);
      animR2.flash = Math.max(0, animR2.flash - 0.08);

      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rot += p.vrot;
        p.alpha = 1 - p.life / p.maxLife;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life++;
        ft.y -= 1.2;
        ft.alpha = 1 - ft.life / ft.maxLife;
        if (ft.life >= ft.maxLife) {
          floatingTexts.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.textAlign = "center";
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      if (logIndex < log.length || activeAttack || particles.length > 0 || floatingTexts.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    const vfxHandle = vfxRef.current;
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.stopMusic();
      hitStop.reset();
      hitStopScaleRef.current = 1;
      vfxHandle?.clear();
    };
  }, [chickenA, chickenB, log, audioEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setEnabled(audioEnabled);
    }
  }, [audioEnabled]);

  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-[142.2vh] overflow-hidden">
      <ArenaBackdrop />
      <div className="absolute inset-0">
        <BattleStage3D
          fighterA={chickenA}
          fighterB={chickenB}
          animA={animR1Ref}
          animB={animR2Ref}
          intentA={intentR1Ref}
          intentB={intentR2Ref}
          physicsA={physicsR1Ref}
          physicsB={physicsR2Ref}
          cameraCue={cameraCueRef}
          vfxRef={vfxRef}
          hitStopScaleRef={hitStopScaleRef}
        />
      </div>
      <canvas ref={canvasRef} width={1600} height={686} className="absolute inset-0 h-full w-full" />

      {showDebug && <BattleDebugOverlay stateRef={debugRef} />}

      <div className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-(--color-gold)/30 bg-black/70 px-5 py-2 shadow-lg backdrop-blur">
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-(--color-gold-bright)">
          Round {currentTurn}
        </span>
      </div>

      <FighterHudCard name={chickenA.name} hud={hudA} accent="#ef4444" side="left" />
      <FighterHudCard name={chickenB.name} hud={hudB} accent="#3b82f6" side="right" />
    </div>
  );
}

function FighterHudCard({
  name,
  hud,
  accent,
  side,
}: {
  name: string;
  hud: { hp: number; maxHp: number; fatigued: boolean };
  accent: string;
  side: "left" | "right";
}) {
  const percent = Math.max(0, Math.min(1, hud.hp / hud.maxHp)) * 100;
  const barColor = percent > 35 ? accent : hud.fatigued ? "#a855f7" : "#f59e0b";

  return (
    <div
      className={`absolute bottom-4 flex w-56 flex-col gap-1.5 rounded-xl border bg-black/70 px-4 py-3 shadow-lg backdrop-blur ${
        side === "left" ? "left-4" : "right-4 items-end text-right"
      }`}
      style={{ borderColor: `${accent}55` }}
    >
      <div className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <span className="truncate font-display text-sm font-semibold text-(--foreground)">{name}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-black/60">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, backgroundColor: barColor, marginLeft: side === "right" ? `${100 - percent}%` : 0 }}
        />
      </div>
      <span className="font-display text-xs font-bold uppercase tracking-wide text-(--color-gold-bright)">
        {Math.max(0, Math.floor(hud.hp))} / {Math.floor(hud.maxHp)}
        {hud.fatigued && <span className="ml-1 text-purple-300">FATIGUED</span>}
      </span>
    </div>
  );
}
