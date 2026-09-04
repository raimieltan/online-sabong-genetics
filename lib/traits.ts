import type { Trait, TraitRarity } from "./types";

export type Rng = () => number;

export const TRAIT_POOL: readonly Trait[] = [
  { id: "iron-stamina", name: "Iron Stamina", rarity: "common", description: "Reduced stamina consumption." },
  { id: "calm", name: "Calm", rarity: "common", description: "Less likely to make inefficient attacks." },
  { id: "quick-starter", name: "Quick Starter", rarity: "uncommon", description: "Higher performance during the opening phase." },
  { id: "counter-fighter", name: "Counter Fighter", rarity: "uncommon", description: "Higher counterattack probability." },
  { id: "heavy-striker", name: "Heavy Striker", rarity: "rare", description: "Higher damage but higher stamina consumption." },
  { id: "survivor", name: "Survivor", rarity: "rare", description: "More resistant to injury effects." },
  { id: "glass-cannon", name: "Glass Cannon", rarity: "epic", description: "Very high attack potential but lower durability." },
];

const PASS_THROUGH_CHANCE = 0.4;
const WILD_TRAIT_CHANCE = 0.05;

const RARITY_WEIGHT: Record<TraitRarity, number> = {
  common: 10,
  uncommon: 6,
  rare: 3,
  epic: 1,
  legendary: 0,
};

function pickWeightedTrait(pool: readonly Trait[], rng: Rng): Trait {
  const totalWeight = pool.reduce((sum, t) => sum + RARITY_WEIGHT[t.rarity], 0);
  let roll = rng() * totalWeight;
  for (const trait of pool) {
    roll -= RARITY_WEIGHT[trait.rarity];
    if (roll < 0) return trait;
  }
  return pool[pool.length - 1];
}

/**
 * Each parent trait gets an independent pass-through roll (consumed in
 * father-then-mother order, duplicates skipped without consuming a roll),
 * then one wild-trait roll (and, only if it fires, one weighted-pick roll).
 * Tests rely on this exact rng consumption order.
 */
export function inheritTraits(
  fatherTraits: readonly Trait[],
  motherTraits: readonly Trait[],
  rng: Rng = Math.random
): Trait[] {
  const inherited: Trait[] = [];
  const seen = new Set<string>();

  for (const trait of [...fatherTraits, ...motherTraits]) {
    if (seen.has(trait.id)) continue;
    seen.add(trait.id);
    if (rng() < PASS_THROUGH_CHANCE) {
      inherited.push(trait);
    }
  }

  if (rng() < WILD_TRAIT_CHANCE) {
    const wild = pickWeightedTrait(TRAIT_POOL, rng);
    if (!seen.has(wild.id)) {
      inherited.push(wild);
    }
  }

  return inherited;
}
