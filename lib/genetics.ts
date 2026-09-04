import { GENETIC_STAT_KEYS, type StatBlock } from "./types";

export type Rng = () => number;

const MUTATION_CHANCE = 0.03;
const MUTATION_MIN_BONUS = 10;
const MUTATION_MAX_BONUS = 20;
const VARIANCE_SPREAD = 8;
const MIN_STAT = 1;
const MAX_STAT = 99;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * inheritStat draws weight, three noise samples, and a mutation check (and,
 * only if mutation fires, a magnitude) from rng in that exact order — tests
 * rely on this sequence to drive deterministic fake rngs.
 */
export function inheritStat(fatherValue: number, motherValue: number, rng: Rng = Math.random): number {
  const weight = 0.35 + rng() * 0.3;
  const weighted = fatherValue * weight + motherValue * (1 - weight);

  const noise = ((rng() - 0.5) + (rng() - 0.5) + (rng() - 0.5)) / 1.5;
  let result = weighted + noise * VARIANCE_SPREAD;

  if (rng() < MUTATION_CHANCE) {
    result += MUTATION_MIN_BONUS + rng() * (MUTATION_MAX_BONUS - MUTATION_MIN_BONUS);
  }

  return Math.round(clamp(result, MIN_STAT, MAX_STAT));
}

export function inheritStatBlock(father: StatBlock, mother: StatBlock, rng: Rng = Math.random): StatBlock {
  const result = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => {
    result[key] = inheritStat(father[key], mother[key], rng);
  });
  return result;
}
