import { TRAIT_POOL } from "./traits";
import { RARITY_ORDER } from "./rarity";
import type { Trait, TraitRarity } from "./types";

/**
 * Purely a display estimate for the breeding screen — it mirrors the real
 * inheritTraits() odds (see lib/traits.ts) but simplifies duplicate-trait
 * bookkeeping, so it must never be used to decide an actual breeding outcome.
 */
const PASS_THROUGH_CHANCE = 0.4;
const WILD_TRAIT_CHANCE = 0.05;

const WILD_RARITY_WEIGHT: Record<TraitRarity, number> = {
  common: 10,
  uncommon: 6,
  rare: 3,
  epic: 1,
  legendary: 0,
};

const WILD_TOTAL_WEIGHT = TRAIT_POOL.reduce((sum, t) => sum + WILD_RARITY_WEIGHT[t.rarity], 0);

export type OffspringOdds = { rarity: TraitRarity; percent: number };

/**
 * Estimated chance the egg's best inherited trait lands at each rarity tier.
 * Parents with stronger (higher-rarity) traits raise the odds of a rare
 * outcome, same as the real system — better parents, better odds.
 */
export function computeOffspringOdds(
  fatherTraits: readonly Trait[],
  motherTraits: readonly Trait[]
): OffspringOdds[] {
  const candidates = dedupe([...fatherTraits, ...motherTraits]);

  // P(no independently-passed trait reaches at least `tier`)
  function passThroughMissChance(tier: TraitRarity): number {
    const tierIndex = RARITY_ORDER.indexOf(tier);
    const atOrAbove = candidates.filter((t) => RARITY_ORDER.indexOf(t.rarity) >= tierIndex).length;
    return (1 - PASS_THROUGH_CHANCE) ** atOrAbove;
  }

  // P(the one-shot wild-trait roll doesn't reach at least `tier`)
  function wildMissChance(tier: TraitRarity): number {
    const tierIndex = RARITY_ORDER.indexOf(tier);
    const belowWeight = TRAIT_POOL
      .filter((t) => RARITY_ORDER.indexOf(t.rarity) < tierIndex)
      .reduce((sum, t) => sum + WILD_RARITY_WEIGHT[t.rarity], 0);
    return 1 - WILD_TRAIT_CHANCE * (1 - belowWeight / WILD_TOTAL_WEIGHT);
  }

  function atLeast(tier: TraitRarity): number {
    if (tier === "common") return 1;
    return 1 - passThroughMissChance(tier) * wildMissChance(tier);
  }

  const tiers = [...RARITY_ORDER];
  return tiers.map((rarity, i) => {
    const next = tiers[i + 1];
    const percent = next ? atLeast(rarity) - atLeast(next) : atLeast(rarity);
    return { rarity, percent: Math.max(0, percent) * 100 };
  });
}

function dedupe(traits: readonly Trait[]): Trait[] {
  const seen = new Set<string>();
  const result: Trait[] = [];
  for (const trait of traits) {
    if (seen.has(trait.id)) continue;
    seen.add(trait.id);
    result.push(trait);
  }
  return result;
}
