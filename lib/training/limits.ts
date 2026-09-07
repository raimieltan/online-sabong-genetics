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
  if (trainingFatigue >= 85) return 0.15;
  if (trainingFatigue >= 60) return 0.4;
  if (trainingFatigue >= 30) return 0.75;
  return 1.0;
}

export function canAffordTrainingPoints(state: TrainingState): boolean {
  return state.trainingPoints >= TRAINING_POINT_COST;
}

/** Overtraining carries real injury risk once fatigue crosses into the top band (spec §23). */
export function overtrainingInjuryChance(trainingFatigue: number): number {
  return trainingFatigue < 85 ? 0 : (trainingFatigue - 85) / 100;
}

/** One rest cycle: full training-point refill, partial fatigue recovery (spec §23, §28). */
export function restTrainingState(state: TrainingState): TrainingState {
  return {
    ...state,
    trainingPoints: TRAINING_POINTS_MAX,
    trainingFatigue: Math.max(0, state.trainingFatigue - TRAINING_FATIGUE_REST_RECOVERY),
  };
}
