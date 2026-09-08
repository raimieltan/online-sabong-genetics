import { GENETIC_STAT_KEYS, type GeneticStatKey, type RoosterTrainingState, type StatBlock } from "../types";

export type Rng = () => number;

const MAX_EFFORT_PER_STAT = 100;

/** Hidden per-stat ceiling, rolled once at RoosterTraining creation (design spec: Training Potential) — iv + [-5, +15), clamped to 100. */
export function rollTrainingPotential(iv: StatBlock, rng: Rng): StatBlock {
  const potential = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => {
    const offset = Math.floor(rng() * 20) - 5; // -5..14
    potential[key] = Math.min(100, Math.max(0, iv[key] + offset));
  });
  return potential;
}

/** Fuzzy display band for an un-discovered trainingPotential value. */
export function potentialBand(value: number): "Below Average" | "Average" | "Above Average" | "Exceptional" {
  if (value >= 90) return "Exceptional";
  if (value >= 70) return "Above Average";
  if (value >= 40) return "Average";
  return "Below Average";
}

/** Reveals the exact trainingPotential for any stat where effort has been seriously invested. */
export function discoverPotential(state: RoosterTrainingState): RoosterTrainingState {
  const discovered = { ...state.discovered };
  GENETIC_STAT_KEYS.forEach((key: GeneticStatKey) => {
    if (state.effortSpent[key] >= MAX_EFFORT_PER_STAT) discovered[key] = true;
  });
  return { ...state, discovered };
}
