/**
 * Addresses the counter-vs-counter stalemate bug (Onyx Chicken vs Champion
 * Chicken, 2026-09-08) at its root: repeated non-resolving exchanges should
 * gradually raise both fighters' willingness to close/pressure/bait, not
 * just hard-force one action once a fixed threshold is crossed (spec Phase
 * B). STALEMATE_TURNS in simulator.ts stays as the final, guaranteed
 * circuit-breaker; this ramps pressure well before that point is reached.
 */
export const STALEMATE_TURNS = 15;

/** Additive score bonus toward PRESSURE/LIGHT_ATTACK/COUNTER (a bait-friendly action), ramping from turn 1 of a no-damage streak. */
export function inactivityPressureBonus(noDamageStreak: number): number {
  return Math.min(0.6, noDamageStreak * 0.04);
}

/** True once a stalemate has run long enough to unlock FORCE_ENGAGEMENT even at 0 CommandPoints. */
export function shouldForceEngagement(noDamageStreak: number): boolean {
  return noDamageStreak >= STALEMATE_TURNS;
}
