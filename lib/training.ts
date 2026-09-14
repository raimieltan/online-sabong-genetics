import { declineMultiplier, deriveLifeStage } from "./career/aging";
import { applyDevelopment } from "./training/development";
import { applyTrainingSession } from "./training/session";
import {
  canAffordTrainingPoints,
  defaultTrainingState,
  overtrainingInjuryChance,
  restTrainingState,
  trainingEffectiveness,
  TRAINING_FATIGUE_PER_SESSION,
  TRAINING_POINT_COST,
} from "./training/limits";
import type {
  Chicken,
  GeneticStatKey,
  RoosterTrainingState,
  StatBlock,
  TrainingCategory,
  TrainingIntensity,
  TrainingState,
} from "./types";

export const EV_PER_TRAIN = 5;
export const ENERGY_PER_TRAIN = 10;
export const MAX_EV = 100;
export const MAX_ENERGY = 100;

export {
  canAffordTrainingPoints,
  defaultTrainingState,
  overtrainingInjuryChance,
  restTrainingState,
  trainingEffectiveness,
  TRAINING_POINT_COST,
};

export function canAffordTraining(energy: number): boolean {
  return energy >= ENERGY_PER_TRAIN;
}

/** GeneticStatKey -> the TrainingCategory that best matches it, for callers (e.g. /api/chickens/[id]/train) that only pick a stat. */
const STAT_TO_CATEGORY: Record<GeneticStatKey, TrainingCategory> = {
  power: "strength",
  speed: "speed",
  agility: "agility",
  defense: "defense",
  stamina: "stamina",
  accuracy: "technique",
};

export type TrainStatOptions = {
  intensity?: TrainingIntensity;
  roosterTraining?: RoosterTrainingState;
  extremeSessionStreak?: number;
  rng?: () => number;
};

/**
 * Trains one stat. When the chicken carries a V2 trainingState the gain runs
 * through the diminishing-returns/tradeoff curve (spec §23-24); a chicken
 * with no trainingState yet (pre-migration fixture) falls back to the exact
 * flat EV_PER_TRAIN gain the original implementation gave. Passing a
 * `roosterTraining` option routes the session through the Phase 1
 * XP/effort/intensity/breakthrough pipeline instead.
 */
export function trainStat(
  chicken: Chicken,
  stat: GeneticStatKey,
  category: TrainingCategory = STAT_TO_CATEGORY[stat],
  options?: TrainStatOptions
): {
  ev: StatBlock;
  energy: number;
  trainingState: TrainingState;
  stressGain?: number;
  roosterTraining?: RoosterTrainingState;
  breakthrough?: ReturnType<typeof applyTrainingSession>["breakthrough"];
} {
  const trainingState = chicken.trainingState ?? defaultTrainingState();
  const lifeStageMultiplier = declineMultiplier(deriveLifeStage(chicken));
  const intensity = options?.intensity ?? "moderate";

  if (!chicken.trainingState) {
    const ev = { ...chicken.ev, [stat]: Math.min(MAX_EV, chicken.ev[stat] + EV_PER_TRAIN) };
    const energy = Math.max(0, chicken.energy - ENERGY_PER_TRAIN);
    const nextTrainingState: TrainingState = {
      trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
      trainingFatigue: Math.min(100, trainingState.trainingFatigue + TRAINING_FATIGUE_PER_SESSION),
      history: [...trainingState.history, { category, at: Date.now() }].slice(-50),
    };
    return { ev, energy, trainingState: nextTrainingState };
  }

  if (options?.roosterTraining) {
    const session = applyTrainingSession({
      roosterTraining: options.roosterTraining,
      ev: chicken.ev,
      category,
      stat,
      baseGain: EV_PER_TRAIN,
      trainingFatigue: trainingState.trainingFatigue,
      lifeStageMultiplier,
      intensity,
      extremeSessionStreak: options.extremeSessionStreak ?? 0,
      rng: options.rng ?? Math.random,
    });

    const energy = Math.max(0, chicken.energy - ENERGY_PER_TRAIN * session.energyMultiplier);
    const nextTrainingState: TrainingState = {
      trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
      trainingFatigue: Math.min(
        100,
        trainingState.trainingFatigue + TRAINING_FATIGUE_PER_SESSION * session.fatigueMultiplier
      ),
      history: [...trainingState.history, { category, at: Date.now() }].slice(-50),
    };

    return {
      ev: session.ev,
      energy,
      trainingState: nextTrainingState,
      stressGain: session.stressGain,
      roosterTraining: session.roosterTraining,
      breakthrough: session.breakthrough,
    };
  }

  const ev = applyDevelopment({
    ev: chicken.ev,
    category,
    baseGain: EV_PER_TRAIN,
    trainingFatigue: trainingState.trainingFatigue,
    lifeStageMultiplier,
  });
  const energy = Math.max(0, chicken.energy - ENERGY_PER_TRAIN);
  const nextTrainingState: TrainingState = {
    trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
    trainingFatigue: Math.min(100, trainingState.trainingFatigue + TRAINING_FATIGUE_PER_SESSION),
    history: [...trainingState.history, { category, at: Date.now() }].slice(-50),
  };
  return { ev, energy, trainingState: nextTrainingState };
}

export function restEnergy(): { energy: number } {
  return { energy: MAX_ENERGY };
}
