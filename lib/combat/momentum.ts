export const MOMENTUM_MIN = -100;
export const MOMENTUM_MAX = 100;

export function clampMomentum(value: number): number {
  return Math.min(MOMENTUM_MAX, Math.max(MOMENTUM_MIN, value));
}

/** Momentum bleeds back toward neutral each turn — it's temporary advantage, not a permanent stat (spec §9). */
export function decayMomentum(value: number): number {
  return value * 0.92;
}

export type MomentumEvent = {
  landedHit: boolean;
  wasEvaded: boolean;
  wasGuarded: boolean;
  wasCountered: boolean;
  didCounter: boolean;
  causedStagger: boolean;
  gainedPosition: boolean;
  opponentFatigued: boolean;
};

/** Momentum delta for the acting fighter this exchange; the opponent takes the mirrored (negated, smaller) swing in the caller. */
export function momentumDelta(event: MomentumEvent): number {
  let delta = 0;
  if (event.landedHit) delta += 6;
  if (event.wasEvaded) delta -= 5;
  if (event.wasGuarded) delta -= 1;
  if (event.wasCountered) delta -= 14;
  if (event.didCounter) delta += 16;
  if (event.causedStagger) delta += 10;
  if (event.gainedPosition) delta += 4;
  if (event.opponentFatigued) delta += 3;
  return delta;
}

/**
 * Momentum's only mechanical effect (spec Phase B) — nudges *this fighter's
 * own* effective riskTolerance a small, capped amount, independently of the
 * opponent's momentum. Explicitly not a damage/accuracy/hit-stop-magnitude
 * multiplier. The 0.12 cap keeps a single swing from compounding into a
 * runaway snowball — a losing fighter's caution always comes from their own
 * falling momentum, never suppressed further by the winner's rising one.
 */
export const MOMENTUM_RISK_NUDGE_CAP = 0.12;

export function momentumRiskNudge(momentum: number): number {
  return (clampMomentum(momentum) / MOMENTUM_MAX) * MOMENTUM_RISK_NUDGE_CAP;
}
