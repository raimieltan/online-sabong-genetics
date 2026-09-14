export type ConditionTier = "peak" | "good" | "compromised" | "poor" | "unfit";

/** Condition bands from the V2 spec §28. */
export function conditionTier(condition: number): ConditionTier {
  if (condition >= 90) return "peak";
  if (condition >= 75) return "good";
  if (condition >= 50) return "compromised";
  if (condition >= 25) return "poor";
  return "unfit";
}

const TIER_STAT_MULTIPLIER: Record<ConditionTier, number> = {
  peak: 1.0,
  good: 0.97,
  compromised: 0.88,
  poor: 0.75,
  unfit: 0.6,
};

/** Bounded readiness multiplier applied to the combat-facing decision/accuracy layer — condition never zeroes a fighter out entirely. */
export function conditionStatMultiplier(condition: number): number {
  return TIER_STAT_MULTIPLIER[conditionTier(condition)];
}

const REST_RECOVERY_PER_CYCLE = 12;

/** One rest cycle's worth of condition recovery (spec §28) — rest, treatment, and time all funnel through this. */
export function recoverCondition(condition: number, amount: number = REST_RECOVERY_PER_CYCLE): number {
  return Math.max(0, Math.min(100, condition + amount));
}
