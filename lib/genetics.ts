import { MUTATION_POOL } from "./mutations";
import {
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  PHYSICAL_TRAIT_RANGE,
  type MutationGenome,
  type PhysicalBlock,
  type StatBlock,
} from "./types";

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

/** Physical proportions are a genetic block, not a mutation — no mutation-bonus roll, just blend + noise. */
export function inheritPhysicalTrait(
  fatherValue: number,
  motherValue: number,
  range: { min: number; max: number },
  rng: Rng = Math.random
): number {
  const weight = 0.35 + rng() * 0.3;
  const weighted = fatherValue * weight + motherValue * (1 - weight);

  const spread = (range.max - range.min) * 0.08;
  const noise = ((rng() - 0.5) + (rng() - 0.5) + (rng() - 0.5)) / 1.5;
  const result = weighted + noise * spread;

  return Number(clamp(result, range.min, range.max).toFixed(2));
}

export function inheritPhysicalBlock(
  father: PhysicalBlock,
  mother: PhysicalBlock,
  rng: Rng = Math.random
): PhysicalBlock {
  const result = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => {
    result[key] = inheritPhysicalTrait(father[key], mother[key], PHYSICAL_TRAIT_RANGE[key], rng);
  });
  return result;
}

function hasAllele(genome: MutationGenome, id: string): boolean {
  const state = genome[id];
  return Boolean(state?.carrier || state?.expressed);
}

/**
 * Draws father-pass-roll then mother-pass-roll for every catalog mutation (in
 * catalog order), then — only for a single-copy "random" inheritance gene —
 * an expression roll, then a spontaneous-mutation roll. Tests rely on this
 * exact per-mutation sequence to drive deterministic fake rngs. After all
 * mutations resolve, incompatible pairs that both express are resolved
 * deterministically: an inherited expression beats a spontaneous one; ties
 * fall back to catalog order.
 */
export function inheritMutations(
  fatherGenome: MutationGenome,
  motherGenome: MutationGenome,
  rng: Rng = Math.random
): MutationGenome {
  const result: MutationGenome = {};
  const spontaneousIds = new Set<string>();

  for (const def of MUTATION_POOL) {
    const fromFather = hasAllele(fatherGenome, def.id) && rng() < 0.5;
    const fromMother = hasAllele(motherGenome, def.id) && rng() < 0.5;
    const copies = (fromFather ? 1 : 0) + (fromMother ? 1 : 0);

    let carrier = false;
    let expressed = false;

    if (copies === 2) {
      carrier = true;
      expressed = true;
    } else if (copies === 1) {
      carrier = true;
      if (def.inheritance === "dominant" || def.inheritance === "codominant") {
        expressed = true;
      } else if (def.inheritance === "random") {
        expressed = rng() < 0.5;
      }
    }

    if (!expressed && rng() < def.spontaneousChance) {
      expressed = true;
      carrier = true;
      spontaneousIds.add(def.id);
    }

    if (carrier || expressed) {
      result[def.id] = { carrier, expressed };
    }
  }

  for (const def of MUTATION_POOL) {
    if (!result[def.id]?.expressed) continue;

    for (const otherId of def.incompatibleMutations) {
      if (!result[def.id]?.expressed) break;
      const other = result[otherId];
      if (!other?.expressed) continue;

      const thisIsSpontaneous = spontaneousIds.has(def.id);
      const otherIsSpontaneous = spontaneousIds.has(otherId);

      if (thisIsSpontaneous && !otherIsSpontaneous) {
        result[def.id] = { ...result[def.id], expressed: false };
      } else if (otherIsSpontaneous && !thisIsSpontaneous) {
        result[otherId] = { ...other, expressed: false };
      } else {
        const defIndex = MUTATION_POOL.findIndex((m) => m.id === def.id);
        const otherIndex = MUTATION_POOL.findIndex((m) => m.id === otherId);
        if (defIndex < otherIndex) {
          result[otherId] = { ...other, expressed: false };
        } else {
          result[def.id] = { ...result[def.id], expressed: false };
        }
      }
    }
  }

  return result;
}
