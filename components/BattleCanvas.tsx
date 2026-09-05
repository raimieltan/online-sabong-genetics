"use client";

import { useEffect, useRef, useState } from "react";
import type { Chicken, CombatLogEntry, FightingStyle } from "@/lib/types";
import { effectiveStat, maxHealth } from "@/lib/combat";
import { resolvePhysicalProfile } from "@/lib/physicalProfile";
import { AudioEngine } from "@/lib/audioEngine";
import { ArenaBackdrop } from "@/components/chicken3d/ArenaBackdrop";
import { BattleStage3D, WORLD_HALF_GAP } from "@/components/chicken3d/BattleStage3D";
import type { CameraCue } from "@/components/chicken3d/BattleStage3D";
import type { ChickenPhysicsHandle } from "@/components/chicken3d/ChickenPhysicsRig";
import { PX_TO_WORLD } from "@/components/chicken3d/ChickenModel";
import type { FighterAnim } from "@/components/chicken3d/ChickenModel";
import type { AnimIntent, AnimState } from "@/lib/animation/types";
import type { StaggerLevel } from "@/lib/types";

interface BattleCanvasProps {
  chickenA: Chicken;
  chickenB: Chicken;
  log: CombatLogEntry[];
  audioEnabled: boolean;
  onReplayEnd: () => void;
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

// The lunge/flinch offsets below are computed in the old 2D-canvas pixel space
// (r1BaseX/r2BaseX, PX_TO_WORLD) but drive the 3D mesh's world position directly
// — they never touch physics. This clamp keeps a fighter's mesh from ever
// closing more than the real 3D world-space gap between fighters, so a lunge
// can't sail through the opponent. Leaves ~0.9 world units of clearance for
// both chickens' body colliders (~0.4 world-unit radius each) plus the
// defender's own flinch-back offset.
const MAX_LUNGE_WORLD = WORLD_HALF_GAP - 0.9;
const MAX_LUNGE_PX = MAX_LUNGE_WORLD / PX_TO_WORLD;

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

/** Brief timescale freeze on impact so heavy hits read instantly instead of just playing through. */
const HITSTOP_MS: Record<StaggerLevel, number> = {
  none: 0,
  light: 12,
  stumble: 55,
  medium: 40,
  heavy: 90,
  knockdown: 150,
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
 * `lungeMult` scales dash distance (still clamped against MAX_LUNGE_PX). `idleLean`/`idleBobMult` shape
 * the resting stance so styles read differently even before an exchange happens.
 */
interface StyleAnimParams {
  windupMult: number;
  lungeMult: number;
  idleLean: number;
  idleBobMult: number;
}

const STYLE_ANIM_PARAMS: Record<FightingStyle, StyleAnimParams> = {
  aggressive: { windupMult: 0.82, lungeMult: 1.18, idleLean: 0.1, idleBobMult: 1.25 },
  counter: { windupMult: 1.2, lungeMult: 0.85, idleLean: -0.09, idleBobMult: 0.7 },
  endurance: { windupMult: 1.12, lungeMult: 0.92, idleLean: -0.04, idleBobMult: 0.6 },
  balanced: { windupMult: 1, lungeMult: 1, idleLean: 0, idleBobMult: 1 },
};

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
  if (hitZone === "left_leg" || hitZone === "right_leg") {
    return isCrit || pseudoRandom(turn * 7.13) < 0.35 ? "spin_kick" : "leg";
  }
  if (hitZone === "left_wing" || hitZone === "right_wing") {
    return isCrit || pseudoRandom(turn * 3.37) < 0.3 ? "aerial" : "wing";
  }
  if (hitZone === "head" || hitZone === "neck") return "peck";
  return "body";
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
}: BattleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);

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
  // without duplicating combat logic. `startTime` moving forward is what tells the
  // camera a new attack began; it holds the last cue (doesn't reset to null) so the
  // camera has something to ease back from between turns.
  const cameraCueRef = useRef<CameraCue | null>(null);

  useEffect(() => {
    const audio = new AudioEngine(audioEnabled);
    audioRef.current = audio;
    audio.playMusic();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTurnTime = Date.now();
    // A full strike (coil → leap → wing-smack/scratch → recover) needs real
    // hang time to read as a strike instead of a teleport, so the turn cadence
    // is paced to let one finish (with a short beat to spare) before the next begins.
    const TURN_INTERVAL = 900;
    const ATTACK_DURATION = 700;
    // Fraction of ATTACK_DURATION where the fighter is at full extension and
    // actually makes contact — hit sound/particles/flash/HP fire here, not at
    // turn start, so the impact lines up with the wing-smack instead of preceding it.
    const IMPACT_AT = 0.52;
    let logIndex = 0;
    let replayEnded = false;

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

    // Mass is a bounded ~0.85–1.15 multiplier (see lib/physicalProfile) — heavier
    // birds take proportionally longer to complete a strike, lighter birds snap
    // faster. Computed once per fighter since physical genetics/style don't change mid-fight.
    const massA = resolvePhysicalProfile(chickenA).mass;
    const massB = resolvePhysicalProfile(chickenB).mass;
    const styleA = STYLE_ANIM_PARAMS[chickenA.fightingStyle];
    const styleB = STYLE_ANIM_PARAMS[chickenB.fightingStyle];
    const powerRatioA = powerRatio(chickenA);
    const powerRatioB = powerRatio(chickenB);
    const recoveryRatioA = recoveryRatio(chickenA);
    const recoveryRatioB = recoveryRatio(chickenB);

    // Virtual clock: equals real time except during a hitstop freeze (triggered on
    // impact below), when it holds flat so heavy hits get a beat of stillness before
    // the animation continues — real Date.now() keeps advancing underneath it.
    let timeOffset = 0;
    let hitstopEndsAtRaw = 0;
    let frozenVirtualNow = 0;
    const triggerHitstop = (ms: number, virtualNow: number, rawNow: number) => {
      if (ms <= 0) return;
      hitstopEndsAtRaw = rawNow + ms;
      frozenVirtualNow = virtualNow;
    };

    let activeAttack: {
      attacker: "r1" | "r2";
      startTime: number;
      duration: number;
      isMiss: boolean;
      stagger: StaggerLevel;
      moveKind: MoveKind;
      impactFired: boolean;
      fireImpact: (impactNow: number) => void;
    } | null = null;

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
      if (rawNow < hitstopEndsAtRaw) {
        // Freeze: keep virtual `now` pinned at the impact instant this frame.
        timeOffset = frozenVirtualNow - rawNow;
      }
      const now = rawNow + timeOffset;
      const currentAudio = audioRef.current;
      if (!currentAudio) return;

      const width = canvas.width;
      const height = canvas.height;
      const r1BaseX = width * 0.3;
      const r2BaseX = width * 0.7;
      const roosterBaseY = height - 140;

      if (now - lastTurnTime >= TURN_INTERVAL && logIndex < log.length) {
        const entry = log[logIndex];
        logIndex += 1;
        setCurrentTurn(entry.turn);

        const isAAttacking = entry.attackerId === visualA.id;
        const defenderVisual = isAAttacking ? visualB : visualA;
        const targetX = isAAttacking ? r2BaseX : r1BaseX;
        const targetColor = isAAttacking ? visualB.colorScheme.feathers : visualA.colorScheme.feathers;

        // Effects (HP, sound, particles, flash) are deferred to IMPACT_AT below,
        // fired once the fighter's wings/talons actually reach the target.
        const fireImpact = (impactNow: number) => {
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
            const knockDir = isAAttacking ? 1 : -1;
            const attackerPowerRatio = isAAttacking ? powerRatioA : powerRatioB;
            const defenderRecoveryRatio = isAAttacking ? recoveryRatioB : recoveryRatioA;

            // Drive the defender's procedural reaction (and the attacker's
            // victory pose on a KO). The 3D controller self-returns to
            // ready/walk afterwards, so nothing needs resetting here.
            const defenderIntent = isAAttacking ? intentR2Ref : intentR1Ref;
            const defenderFacing: "left" | "right" = isAAttacking ? "left" : "right";
            const fatal = entry.defenderHp <= 0;

            if (fatal) {
              defenderIntent.current = {
                state: "death",
                startedAt: impactNow,
                speed: 1,
                fatal: true,
                facing: defenderFacing,
              };
              // KO always topples the body and never rights it (design decision 4).
              defenderPhysics?.applyKnockback(knockDir, 0, "knockdown", attackerPowerRatio, defenderRecoveryRatio, {
                suppressRecovery: true,
              });
              const attackerIntent = isAAttacking ? intentR1Ref : intentR2Ref;
              attackerIntent.current = {
                state: "victory",
                startedAt: impactNow + 300,
                speed: 1,
                facing: isAAttacking ? "right" : "left",
              };
            } else {
              defenderIntent.current = {
                state: hitStateForStagger(entry.stagger, entry.isCritical),
                startedAt: impactNow,
                speed: 1,
                stagger: entry.stagger,
                facing: defenderFacing,
              };
              defenderPhysics?.applyKnockback(knockDir, 0, entry.stagger, attackerPowerRatio, defenderRecoveryRatio);
            }
          }

          if (defenderVisual.fatigued) {
            currentAudio.playFatigue();
          }

          if (logIndex >= log.length && !replayEnded) {
            replayEnded = true;
            currentAudio.playVictory();
            setTimeout(() => onReplayEnd(), 1000);
          }
        };

        activeAttack = {
          attacker: isAAttacking ? "r1" : "r2",
          startTime: now,
          duration:
            ATTACK_DURATION *
            (isAAttacking ? massA : massB) *
            (isAAttacking ? styleA.windupMult : styleB.windupMult),
          isMiss: entry.isMiss,
          stagger: entry.stagger,
          moveKind: moveKindForZone(entry.hitZone, entry.turn, entry.isCrit || entry.isCritical),
          impactFired: false,
          fireImpact,
        };
        cameraCueRef.current = {
          attacker: activeAttack.attacker,
          startTime: activeAttack.startTime,
          isCrit: entry.isCrit || entry.isCritical,
          isMiss: entry.isMiss,
          stagger: entry.stagger,
        };

        // Attacker plays its attack windup now — hit or miss (a MISS just never
        // triggers a defender reaction; the animation still swings).
        const attackerIntent = isAAttacking ? intentR1Ref : intentR2Ref;
        attackerIntent.current = {
          state: attackStateForMove(activeAttack.moveKind),
          startedAt: now,
          speed: 1 / (isAAttacking ? styleA.windupMult : styleB.windupMult),
          moveKind: activeAttack.moveKind,
          facing: isAAttacking ? "right" : "left",
        };

        lastTurnTime = now;
      }

      const t = now / 250;
      // Slow independent clock for pacing/circling footwork between exchanges —
      // much lower frequency than the idle bob above so it reads as deliberate
      // ring-craft (sizing each other up) rather than a jitter on top of it.
      const circleT = now / 3400;
      if (!activeAttack || activeAttack.attacker !== "r1") {
        animR1.offsetX = Math.sin(circleT * 0.7) * 9;
        animR1.offsetZ = Math.sin(circleT) * 26;
        animR1.yaw = Math.sin(circleT + Math.PI / 2) * 0.32;
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
        animR2.offsetX = Math.cos(circleT * 0.7) * 9;
        animR2.offsetZ = Math.cos(circleT * 1.1) * 26;
        animR2.yaw = -Math.cos(circleT + Math.PI / 2) * 0.32;
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

        if (!activeAttack.impactFired && progress >= IMPACT_AT) {
          activeAttack.impactFired = true;
          // Trigger with THIS frame's clock — fireImpact was built at attack-start and
          // would otherwise freeze against a stale timestamp from turns ago.
          triggerHitstop(HITSTOP_MS[activeAttack.stagger], now, rawNow);
          activeAttack.fireImpact(now);
        }

        if (progress < 1) {
          const dir = activeAttack.attacker === "r1" ? 1 : -1;
          const attackerAnim = activeAttack.attacker === "r1" ? animR1 : animR2;
          const defenderAnim = activeAttack.attacker === "r1" ? animR2 : animR1;
          const attackerStyle = activeAttack.attacker === "r1" ? styleA : styleB;
          const distance = (r2BaseX - r1BaseX) * 0.42 * attackerStyle.lungeMult;

          // Phase timeline, as a fraction of (mass-scaled) attack duration — shared
          // across move kinds so IMPACT_AT keeps lining up with the strike phase:
          //   0.00–0.16  coil    — crouch and pull back before the leap
          //   0.16–0.52  leap    — jump forward on an arc toward the opponent
          //   0.52–0.70  strike  — full extension, the move's signature hit
          //   0.70–1.00  recover — settle back down to the base stance
          const { reach, hop, lean, stretch, wingSwipe, legKick } = attackPoseFor(activeAttack.moveKind, progress);

          const rawLunge = reach * distance * dir;
          attackerAnim.offsetX = Math.sign(rawLunge) * Math.min(Math.abs(rawLunge), MAX_LUNGE_PX);
          attackerAnim.offsetY = -hop;
          attackerAnim.rot = lean * dir;
          attackerAnim.scaleX = 1 - stretch * 0.08;
          attackerAnim.scaleY = 1 + stretch * 0.12;
          attackerAnim.wingPhase = wingSwipe;
          attackerAnim.legPhase = legKick;

          if (progress > 0.45 && !activeAttack.isMiss) {
            // Defender flinches on impact: knocked back a step, wings flare, braces.
            // Scaled by stagger tier — knockdown is suppressed here entirely since
            // ChickenPhysicsRig's real knockback/topple physics drives it instead.
            const flinchMult = STAGGER_FLINCH_MULT[activeAttack.stagger];
            const flinchP = Math.min(1, (progress - 0.45) / 0.35);
            const flinch = Math.sin(flinchP * Math.PI);
            const rawFlinch = -flinch * 18 * dir * flinchMult;
            defenderAnim.offsetX = Math.sign(rawFlinch) * Math.min(Math.abs(rawFlinch), MAX_LUNGE_PX * 0.6);
            defenderAnim.rot = -flinch * 0.22 * dir * flinchMult;
            defenderAnim.wingPhase = flinch * 0.5 * Math.max(flinchMult, 0.6);
          }
        } else {
          activeAttack = null;
        }
      }

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

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audio.stopMusic();
    };
  }, [chickenA, chickenB, log, audioEnabled, onReplayEnd]);

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
        />
      </div>
      <canvas ref={canvasRef} width={1600} height={686} className="absolute inset-0 h-full w-full" />

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
