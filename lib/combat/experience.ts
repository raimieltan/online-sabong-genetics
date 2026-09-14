import type { CombatAction, CombatDistance, CombatExperience, CombatExperienceCategory, OpponentModel } from "../types";

const EXPERIENCE_CAP = 500;

export function emptyExperience(): CombatExperience {
  return { offensive: 0, defensive: 0, evasion: 0, counter: 0, pressure: 0, recovery: 0, adaptation: 0 };
}

/** Battles are the only source of experience (spec §19) — training/genetics never call this. */
export function gainExperience(
  experience: CombatExperience,
  category: CombatExperienceCategory,
  amount: number
): CombatExperience {
  return { ...experience, [category]: Math.min(EXPERIENCE_CAP, experience[category] + amount) };
}

/** Small, bounded read-quality/decision bonus derived from total experience — never a raw stat buff (spec §19). */
export function experienceConfidenceBonus(experience: CombatExperience): number {
  const total = Object.values(experience).reduce((s, v) => s + v, 0);
  return Math.min(10, total / (EXPERIENCE_CAP * 7 / 10));
}

export function emptyOpponentModel(): OpponentModel {
  return {
    aggressionRead: 0.5,
    counterLikelihood: 0.2,
    preferredDistance: "MID",
    staminaTendency: 0.5,
    pressureTendency: 0.3,
    recentActions: [],
    sampleSize: 0,
  };
}

const RECENT_ACTIONS_WINDOW = 6;

/**
 * Updates the in-battle opponent read after observing one of their actions
 * (spec §20-21) — an exponential moving average so it converges but never
 * locks in with full certainty ("better at reading opponents, not omniscient").
 */
export function updateOpponentModel(
  model: OpponentModel,
  observedAction: CombatAction,
  observedStaminaRatio: number,
  observedDistance: CombatDistance
): OpponentModel {
  const alpha = 0.25;
  const isAggressive = observedAction === "HEAVY_ATTACK" || observedAction === "LIGHT_ATTACK" || observedAction === "PRESSURE";
  const isCounter = observedAction === "COUNTER";
  const isPressure = observedAction === "PRESSURE";

  return {
    aggressionRead: model.aggressionRead * (1 - alpha) + (isAggressive ? 1 : 0) * alpha,
    counterLikelihood: model.counterLikelihood * (1 - alpha) + (isCounter ? 1 : 0) * alpha,
    preferredDistance: observedDistance,
    staminaTendency: model.staminaTendency * (1 - alpha) + observedStaminaRatio * alpha,
    pressureTendency: model.pressureTendency * (1 - alpha) + (isPressure ? 1 : 0) * alpha,
    recentActions: [...model.recentActions, observedAction].slice(-RECENT_ACTIONS_WINDOW),
    sampleSize: model.sampleSize + 1,
  };
}

/** Adaptation bonus: repeated identical opponent actions become exploitable, but never guaranteed (spec §21-22). */
export function adaptationCounterBonus(model: OpponentModel, adaptationExperience: number): number {
  if (model.recentActions.length < 3) return 0;
  const last = model.recentActions[model.recentActions.length - 1];
  const repeats = model.recentActions.filter((a) => a === last).length;
  if (repeats < 2) return 0;
  return Math.min(0.35, (repeats / model.recentActions.length) * 0.3 + adaptationExperience / 1000);
}
