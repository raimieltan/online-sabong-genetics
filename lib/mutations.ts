import type { GeneticStatKey, MutationInheritance, MutationRarity } from "./types";

/**
 * Data-driven mutation catalog (spec section 6) — inheritance, rarity, stat
 * effects, and conflicts live here so the breeding/combat logic never
 * hardcodes a specific mutation's behavior.
 */
export type MutationDefinition = {
  id: string;
  name: string;
  rarity: MutationRarity;
  inheritance: MutationInheritance;
  /** Probability of a fresh (non-inherited) expression per breeding event. */
  spontaneousChance: number;
  /** Multiplicative deltas applied in effectiveStat(), e.g. 0.05 = +5%. */
  statModifiers: Partial<Record<GeneticStatKey, number>>;
  /** Tag emitted by resolveVisualTraits() for the render layer to react to. */
  visualEffect: string;
  compatibleMutations: string[];
  incompatibleMutations: string[];
  canBeCarrier: boolean;
  canStack: boolean;
};

export const MUTATION_POOL: readonly MutationDefinition[] = [
  {
    id: "iron_spurs",
    name: "Iron Spurs",
    rarity: "common",
    inheritance: "recessive",
    spontaneousChance: 1 / 100,
    statModifiers: { power: 0.35 },
    visualEffect: "IRON_SPURS",
    compatibleMutations: ["albino", "giant"],
    incompatibleMutations: ["two_headed"],
    canBeCarrier: true,
    canStack: false,
  },
  {
    id: "extra_wings",
    name: "Quad-Wing",
    rarity: "rare",
    inheritance: "recessive",
    spontaneousChance: 1 / 1_000,
    statModifiers: { agility: 0.15, speed: 0.1 },
    visualEffect: "EXTRA_WINGS",
    compatibleMutations: ["albino", "giant"],
    incompatibleMutations: ["two_headed"],
    canBeCarrier: true,
    canStack: false,
  },
  {
    id: "albino",
    name: "Albino",
    rarity: "rare",
    inheritance: "recessive",
    spontaneousChance: 1 / 1_000,
    statModifiers: {},
    visualEffect: "ALBINO",
    compatibleMutations: ["iron_spurs", "extra_wings", "giant"],
    incompatibleMutations: ["luminescent"],
    canBeCarrier: true,
    canStack: false,
  },
  {
    id: "luminescent",
    name: "Luminescent",
    rarity: "epic",
    inheritance: "dominant",
    spontaneousChance: 1 / 10_000,
    statModifiers: { accuracy: 0.05 },
    visualEffect: "LUMINESCENT",
    compatibleMutations: ["iron_spurs", "extra_wings", "giant"],
    incompatibleMutations: ["albino"],
    canBeCarrier: false,
    canStack: false,
  },
  {
    id: "giant",
    name: "Giant",
    rarity: "epic",
    inheritance: "codominant",
    spontaneousChance: 1 / 10_000,
    statModifiers: { power: 0.15, speed: -0.1 },
    visualEffect: "GIANT",
    compatibleMutations: ["albino", "iron_spurs", "extra_wings", "two_headed", "luminescent"],
    incompatibleMutations: [],
    canBeCarrier: false,
    canStack: false,
  },
  {
    id: "two_headed",
    name: "Two-Headed",
    rarity: "anomalous",
    inheritance: "recessive",
    spontaneousChance: 1 / 1_000_000,
    statModifiers: { accuracy: 0.05, agility: -0.1 },
    visualEffect: "TWO_HEADED",
    compatibleMutations: ["giant"],
    incompatibleMutations: ["iron_spurs", "extra_wings"],
    canBeCarrier: true,
    canStack: false,
  },
];

export const MUTATION_IDS: readonly string[] = MUTATION_POOL.map((m) => m.id);

export function getMutationDefinition(id: string): MutationDefinition | undefined {
  return MUTATION_POOL.find((m) => m.id === id);
}
