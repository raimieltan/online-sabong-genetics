/**
 * Combat spacing — the intentional fighting distance between two roosters
 * (spec §5 / §6). Pure math, world units. The controller uses this to decide
 * when a fighter needs to APPROACH before an attack and how far to re-separate
 * afterwards, so the fight never collapses into two capsules sharing a spot
 * and never drifts into an over-wide standoff.
 */

import { clamp, damp, lerpAngle } from "./math";

export interface CombatSpacing {
  /** Where the fighters want to sit when neither is attacking. */
  idealCombatDistance: number;
  /** Inside this, an attack can connect without any approach beat. */
  attackRange: number;
  /** Bodies must never close past this (collider clearance). */
  minimumCombatDistance: number;
  /** Beyond this the fighter breaks into a run to close. */
  maximumCombatDistance: number;
}

/**
 * Tuned against BattleStage3D: fighters sit at ±(FIGHTER_X * STAGE_SCALE) ≈
 * ±1.65 world units, so the resting gap is ~3.3. We pull the *ideal* in a
 * touch tighter than that so there's always a small closing beat, and set the
 * floor at the summed body-collider radius plus clearance.
 */
export const DEFAULT_SPACING: CombatSpacing = {
  idealCombatDistance: 2.9,
  attackRange: 3.3,
  minimumCombatDistance: 1.5,
  maximumCombatDistance: 4.6,
};

export type SpacingIntent = "hold" | "approach" | "close" | "separate";

/**
 * Given the current gap and whether the fighter is about to attack, what
 * should it do with its feet this frame?
 */
export function resolveSpacingIntent(
  gap: number,
  spacing: CombatSpacing,
  aboutToAttack: boolean
): SpacingIntent {
  if (aboutToAttack) {
    if (gap > spacing.maximumCombatDistance) return "close";
    if (gap > spacing.attackRange) return "approach";
    return "hold";
  }
  if (gap < spacing.minimumCombatDistance) return "separate";
  if (gap > spacing.maximumCombatDistance) return "close";
  if (gap > spacing.idealCombatDistance + 0.35) return "approach";
  if (gap < spacing.idealCombatDistance - 0.35) return "separate";
  return "hold";
}

/**
 * Forward speed (world units/sec, signed toward the opponent) for a spacing
 * intent. Positive closes the gap, negative opens it.
 */
export function spacingSpeed(intent: SpacingIntent, personalityFootwork = 1): number {
  switch (intent) {
    case "close":
      return 2.6 * personalityFootwork;
    case "approach":
      return 1.3 * personalityFootwork;
    case "separate":
      return -1.1 * personalityFootwork;
    default:
      return 0;
  }
}

/**
 * Move `current` toward `target` along one axis at up to `speed` units/sec,
 * never overshooting. Returns the new value. `speed` is unsigned.
 */
export function stepToward(current: number, target: number, speed: number, dt: number): number {
  const d = target - current;
  const maxStep = Math.abs(speed) * dt;
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

/**
 * Damp a facing yaw toward the opponent (spec §6 / §7) — never snaps unless
 * the correction is tiny. `lambda` larger = faster turn.
 */
export function dampFacingYaw(
  currentYaw: number,
  targetYaw: number,
  lambda: number,
  dt: number
): number {
  const snapped = lerpAngle(currentYaw, targetYaw, 1 - Math.exp(-lambda * dt));
  return snapped;
}

/** Convenience: exponential approach that also handles the trivial (already there) case. */
export function approachScalar(current: number, target: number, lambda: number, dt: number): number {
  const next = damp(current, target, lambda, dt);
  return Math.abs(next - target) < 1e-4 ? target : next;
}

/** Clamp a proposed world-X for a fighter so it stays inside the arena and off the opponent. */
export function clampFighterX(
  proposedX: number,
  opponentX: number,
  minGap: number,
  arenaHalfWidth: number
): number {
  const bounded = clamp(proposedX, -arenaHalfWidth, arenaHalfWidth);
  if (opponentX >= 0) {
    return Math.min(bounded, opponentX - minGap);
  }
  return Math.max(bounded, opponentX + minGap);
}
