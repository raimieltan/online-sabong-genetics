import { GENETIC_STAT_KEYS, PHYSICAL_TRAIT_KEYS, type Chicken, type PhysicalBlock, type StatBlock } from "../types";

export function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

/** All-1 physical block — a "baseline" chicken whose physique modifiers are all identity (1.0). */
export function physicalBlock(value = 1): PhysicalBlock {
  const block = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

export function makeChicken(overrides: Partial<Chicken> = {}): Chicken {
  return {
    id: "test",
    name: "Test",
    sex: "rooster",
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: "test",
    iv: statBlock(50),
    ev: statBlock(0),
    physical: physicalBlock(),
    mutations: {},
    traits: [],
    age: 1,
    health: 100,
    energy: 100,
    record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
    status: "active",
    growthStage: "adult",
    fightingStyle: "balanced",
    colorScheme: {
      body: "#111111",
      hackle: "#c9a24f",
      wings: "#4c1708",
      tail: "#333333",
      comb: "#b8100f",
      beak: "#d9a83a",
      shanks: "#cc9e33",
      pattern: "SOLID",
      patternColor: "#222222",
    },
    injured: false,
    createdAt: Date.now(),
    ...overrides,
  };
}
