/**
 * V2 combat choreography — data-driven attack timing & spacing.
 *
 * The procedural animation system (ProceduralAnimationController) owns the
 * bones. This module owns the *timeline* around an attack: how long the
 * anticipation / active / recovery beats last, how far the attacker lunges,
 * when contact happens, and how long the hit-stop freeze runs.
 *
 * Nothing here decides hit/miss/damage/crit/stagger — those come from the
 * backend combat log. This only turns "attacker used heavy_kick, it hit,
 * stagger=heavy" into a sequence of timed presentation beats.
 *
 * All timings are in SECONDS unless suffixed `Frac` (a 0..1 fraction of the
 * attack's own active window). Distances are in world units (the 3D stage
 * scale, same units BattleStage3D / ChickenPhysicsRig use).
 */

import type { StaggerLevel } from "@/lib/types";
import { clamp01 } from "./math";
import type { AnimState } from "./types";

/** The 8 attack moves the presentation layer knows how to choreograph. */
export type AttackId =
  | "peck_attack"
  | "quick_kick"
  | "heavy_kick"
  | "wing_strike"
  | "jump_attack"
  | "flying_kick"
  | "double_kick"
  | "charge_attack";

/** Explicit phases every attack progresses through (spec §3 / §4). */
export type AttackPhase =
  | "APPROACH"
  | "ANTICIPATION"
  | "ACTIVE"
  | "IMPACT"
  | "RECOVERY"
  | "COMPLETE";

export const ATTACK_PHASES: readonly AttackPhase[] = [
  "APPROACH",
  "ANTICIPATION",
  "ACTIVE",
  "IMPACT",
  "RECOVERY",
  "COMPLETE",
];

/** Hit-stop durations (seconds) by how hard the hit landed. Spec §9 ranges. */
export interface HitStopProfile {
  light: number;
  medium: number;
  heavy: number;
  critical: number;
}

export interface AttackChoreography {
  id: AttackId;
  /** Which procedural AnimState the ProceduralAnimationController plays. */
  animation: AnimState;

  /** Beat lengths in seconds. anticipation + active + recovery ≈ clip length. */
  anticipation: number;
  active: number;
  recovery: number;

  /**
   * How far (world units) the attacker travels into the strike, before the
   * per-turn clamp against the real remaining gap (spec §5). Heavier / longer
   * committing moves reach further.
   */
  lungeDistance: number;

  /**
   * Fraction [0,1] of (anticipation+active) at which contact happens — the
   * frame VFX / camera / audio / defender reaction all fire on. Matches the
   * strike frame of the underlying procedural clip.
   */
  impactTimeFrac: number;

  /** Small forward creep during the anticipation beat (world units). */
  anticipationCreep: number;

  /** How far the attacker backs off during recovery to reset spacing (world units). */
  recoveryDistance: number;

  hitStop: HitStopProfile;

  /** Extra hold (seconds) before the attacker is allowed to act again — heavy
   *  moves visibly commit the bird (spec §16). */
  minNeutralBeat: number;
}

const LIGHT_STOP: HitStopProfile = { light: 0.035, medium: 0.05, heavy: 0.075, critical: 0.1 };
const HEAVY_STOP: HitStopProfile = { light: 0.045, medium: 0.065, heavy: 0.095, critical: 0.12 };

/**
 * One entry per attack move. Durations are deliberately close to the
 * `ANIMATIONS` clip lengths in `animations/index.ts` so the procedural clip
 * and the choreography timeline stay in lock-step; tweak them together.
 */
export const ATTACK_CHOREOGRAPHY: Record<AttackId, AttackChoreography> = {
  peck_attack: {
    id: "peck_attack",
    animation: "peck_attack",
    anticipation: 0.14,
    active: 0.16,
    recovery: 0.25,
    lungeDistance: 0.55,
    impactTimeFrac: 0.52,
    anticipationCreep: 0.08,
    recoveryDistance: 0.35,
    hitStop: LIGHT_STOP,
    minNeutralBeat: 0.22,
  },
  quick_kick: {
    id: "quick_kick",
    animation: "quick_kick",
    anticipation: 0.18,
    active: 0.2,
    recovery: 0.32,
    lungeDistance: 0.7,
    impactTimeFrac: 0.55,
    anticipationCreep: 0.1,
    recoveryDistance: 0.4,
    hitStop: LIGHT_STOP,
    minNeutralBeat: 0.28,
  },
  heavy_kick: {
    id: "heavy_kick",
    animation: "heavy_kick",
    anticipation: 0.3,
    active: 0.18,
    recovery: 0.6,
    lungeDistance: 1.0,
    impactTimeFrac: 0.68,
    anticipationCreep: 0.14,
    recoveryDistance: 0.55,
    hitStop: HEAVY_STOP,
    minNeutralBeat: 0.55,
  },
  wing_strike: {
    id: "wing_strike",
    animation: "wing_strike",
    anticipation: 0.16,
    active: 0.18,
    recovery: 0.28,
    lungeDistance: 0.45,
    impactTimeFrac: 0.5,
    anticipationCreep: 0.06,
    recoveryDistance: 0.32,
    hitStop: LIGHT_STOP,
    minNeutralBeat: 0.26,
  },
  jump_attack: {
    id: "jump_attack",
    animation: "jump_attack",
    anticipation: 0.24,
    active: 0.22,
    recovery: 0.42,
    lungeDistance: 0.9,
    impactTimeFrac: 0.62,
    anticipationCreep: 0.12,
    recoveryDistance: 0.5,
    hitStop: HEAVY_STOP,
    minNeutralBeat: 0.42,
  },
  flying_kick: {
    id: "flying_kick",
    animation: "flying_kick",
    anticipation: 0.26,
    active: 0.22,
    recovery: 0.5,
    lungeDistance: 1.1,
    impactTimeFrac: 0.64,
    anticipationCreep: 0.13,
    recoveryDistance: 0.55,
    hitStop: HEAVY_STOP,
    minNeutralBeat: 0.5,
  },
  double_kick: {
    id: "double_kick",
    animation: "double_kick",
    anticipation: 0.2,
    active: 0.3,
    recovery: 0.4,
    lungeDistance: 0.8,
    impactTimeFrac: 0.5,
    anticipationCreep: 0.1,
    recoveryDistance: 0.45,
    hitStop: LIGHT_STOP,
    minNeutralBeat: 0.4,
  },
  charge_attack: {
    id: "charge_attack",
    animation: "charge_attack",
    anticipation: 0.22,
    active: 0.24,
    recovery: 0.4,
    lungeDistance: 1.05,
    impactTimeFrac: 0.58,
    anticipationCreep: 0.16,
    recoveryDistance: 0.5,
    hitStop: HEAVY_STOP,
    minNeutralBeat: 0.4,
  },
};

/** Fallback used if an unknown state is requested. */
export const DEFAULT_CHOREOGRAPHY: AttackChoreography = ATTACK_CHOREOGRAPHY.charge_attack;

export function isAttackId(state: string): state is AttackId {
  return state in ATTACK_CHOREOGRAPHY;
}

export function getChoreography(state: string): AttackChoreography {
  return isAttackId(state) ? ATTACK_CHOREOGRAPHY[state] : DEFAULT_CHOREOGRAPHY;
}

/** Total scripted length of the attack (anticipation → recovery), seconds. */
export function choreographyDuration(c: AttackChoreography): number {
  return c.anticipation + c.active + c.recovery;
}

/** Seconds from attack start at which contact happens. */
export function impactTime(c: AttackChoreography): number {
  return (c.anticipation + c.active) * clamp01(c.impactTimeFrac);
}

/**
 * Map elapsed seconds since attack start onto the explicit phase.
 * `approaching` is passed in by the controller (true while the fighter is
 * still closing distance before the anticipation beat is allowed to start).
 */
export function resolveAttackPhase(
  c: AttackChoreography,
  elapsed: number,
  approaching: boolean
): AttackPhase {
  if (approaching && elapsed <= 0) return "APPROACH";
  const total = choreographyDuration(c);
  const contact = impactTime(c);
  if (elapsed < c.anticipation) return "ANTICIPATION";
  if (elapsed < contact) return "ACTIVE";
  // A short window right on contact so listeners can key off "IMPACT" exactly once.
  if (elapsed < contact + Math.min(0.06, c.active * 0.4)) return "IMPACT";
  if (elapsed < total) return "RECOVERY";
  return "COMPLETE";
}

/** Hit-stop seconds for a backend stagger tier + critical flag (spec §9). */
export function hitStopFor(
  c: AttackChoreography,
  stagger: StaggerLevel,
  isCritical: boolean
): number {
  if (isCritical) return c.hitStop.critical;
  switch (stagger) {
    case "knockdown":
    case "heavy":
      return c.hitStop.heavy;
    case "medium":
    case "stumble":
      return c.hitStop.medium;
    case "light":
      return c.hitStop.light;
    default:
      return 0;
  }
}

/**
 * Clamp the scripted lunge so the attacker never overshoots the defender
 * (spec §4 / §5). `remaining` is the current gap between fighters; the lunge
 * may not close past `minCombatDistance`. `commit` (0..~1.4) is a personality
 * / genetics multiplier on how far the bird throws itself in.
 */
export function resolveLunge(
  c: AttackChoreography,
  remaining: number,
  minCombatDistance: number,
  commit = 1
): number {
  const scripted = c.lungeDistance * commit;
  const room = Math.max(0, remaining - minCombatDistance);
  return Math.min(scripted, room);
}
