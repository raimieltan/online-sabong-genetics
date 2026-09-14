import type { TrainingState } from "../types";

export const TRAINING_POINTS_MAX = 100;
export const TRAINING_POINT_COST = 10;
export const TRAINING_FATIGUE_PER_SESSION = 14;
export const TRAINING_FATIGUE_REST_RECOVERY = 25;

export function defaultTrainingState(): TrainingState {
  return { trainingPoints: TRAINING_POINTS_MAX, trainingFatigue: 0, history: [] };
}

/**
 * Diminishing-returns curve (V2 spec §23): fresh training is full value,
 * moderate accumulated load cuts gains to ~75%, heavy load to ~40%, and past
 * the overtrained threshold gains are minimal — no infinite production
 * progression from just grinding sessions back-to-back.
 */
export function trainingEffectiveness(trainingFatigue: number): number {
  const normalized = Math.min(100, Math.max(0, trainingFatigue)) / 100;
  return Math.max(0.2, 1 - Math.pow(normalized, 1.6) * 0.8);
}

export function canAffordTrainingPoints(state: TrainingState, cost = TRAINING_POINT_COST): boolean {
  return state.trainingPoints >= cost;
}

/** Overtraining carries real injury risk once fatigue crosses into the top band (spec §23). */
export function overtrainingInjuryChance(trainingFatigue: number): number {
  const normalized = Math.min(100, Math.max(0, trainingFatigue)) / 100;
  return Math.pow(normalized, 3) * 0.08;
}

/** One rest cycle: full training-point refill, partial fatigue recovery (spec §23, §28). */
export function restTrainingState(state: TrainingState): TrainingState {
  return {
    ...state,
    trainingPoints: TRAINING_POINTS_MAX,
    trainingFatigue: Math.max(0, state.trainingFatigue - TRAINING_FATIGUE_REST_RECOVERY),
  };
}
