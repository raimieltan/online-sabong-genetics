/**
 * "Juice" (spec Phase B): a big momentum swing on the turn that lands should
 * read as a bigger moment, not just a bigger number in the log — a small
 * extra hit-stop on top of the choreography's own value. Capped so it never
 * turns a Big Swing into an unreadable freeze.
 */
export const MOMENTUM_HITSTOP_BONUS_CAP = 0.12;

/** Extra hit-stop seconds from a momentum swing — 0 for small swings, ramping toward the cap for big ones. */
export function momentumHitStopBonus(momentumSwing: number): number {
  const magnitude = Math.abs(momentumSwing);
  if (magnitude <= 3) return 0;
  return Math.min(MOMENTUM_HITSTOP_BONUS_CAP, (magnitude - 3) * 0.006);
}
