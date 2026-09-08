import { GENETIC_STAT_KEYS, type RoosterTrainingState, type StatBlock } from "../types";

/** Fresh per-chicken aggregate row (design spec: Data model) — trainingPotential is rolled once by the caller (lib/training/potential.ts) and passed in. */
export function defaultRoosterTrainingState(trainingPotential: StatBlock): RoosterTrainingState {
  const effortSpent = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (effortSpent[key] = 0));

  return {
    physicalXP: 0,
    combatXP: 0,
    tacticalXP: 0,
    disciplineXP: 0,
    recoveryXP: 0,
    effortSpent,
    trainingPotential,
    discovered: {},
    traits: [],
    breakthroughs: [],
  };
}
