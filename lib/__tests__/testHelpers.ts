import { GENETIC_STAT_KEYS, type Chicken, type StatBlock } from "../types";

export function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
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
    traits: [],
    age: 1,
    health: 100,
    energy: 100,
    record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
    status: "active",
    growthStage: "adult",
    fightingStyle: "balanced",
    colorScheme: { body: "#111111", head: "#222222", comb: "#ff0000", tail: "#333333", feet: "#ff8c00" },
    injured: false,
    createdAt: Date.now(),
    ...overrides,
  };
}
