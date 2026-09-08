import { GENETIC_STAT_KEYS, type GeneticStatKey, type RoosterTrainingState, type StatBlock } from "../types";

export const MAX_TRAINING_EFFORT_TOTAL = 500;
export const MAX_TRAINING_EFFORT_PER_STAT = 100;
export const REDISTRIBUTE_CREDITS_PER_POINT = 10;

function totalSpent(effortSpent: StatBlock): number {
  return GENETIC_STAT_KEYS.reduce((sum, key) => sum + effortSpent[key], 0);
}

/** Remaining effort a stat can still absorb, bounded by both its own cap and the chicken's lifetime total. */
export function effortHeadroom(state: RoosterTrainingState, stat: GeneticStatKey): number {
  const perStatRemaining = MAX_TRAINING_EFFORT_PER_STAT - state.effortSpent[stat];
  const totalRemaining = MAX_TRAINING_EFFORT_TOTAL - totalSpent(state.effortSpent);
  return Math.max(0, Math.min(perStatRemaining, totalRemaining));
}

/** Draws a session's EV gain from remaining effort headroom (design spec: Training Effort). */
export function spendEffort(
  state: RoosterTrainingState,
  stat: GeneticStatKey,
  desiredEv: number
): { evGain: number; effortSpent: StatBlock } {
  const headroom = effortHeadroom(state, stat);
  const evGain = Math.max(0, Math.min(desiredEv, headroom));
  const effortSpent = { ...state.effortSpent, [stat]: state.effortSpent[stat] + evGain };
  return { evGain, effortSpent };
}

/** Moves already-spent effort from one stat back into another's headroom; refunds no EV already earned. */
export function redistributeEffort(
  state: RoosterTrainingState,
  from: GeneticStatKey,
  to: GeneticStatKey,
  amount: number
): StatBlock {
  if (amount <= 0) throw new RangeError("amount must be positive");
  if (amount > state.effortSpent[from]) throw new RangeError("cannot move more than what's spent on the source stat");
  if (state.effortSpent[to] + amount > MAX_TRAINING_EFFORT_PER_STAT) {
    throw new RangeError("destination stat would exceed its per-stat effort cap");
  }

  return {
    ...state.effortSpent,
    [from]: state.effortSpent[from] - amount,
    [to]: state.effortSpent[to] + amount,
  };
}
