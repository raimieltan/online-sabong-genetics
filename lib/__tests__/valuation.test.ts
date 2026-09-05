import test from "node:test";
import assert from "node:assert/strict";

import { chickenValue } from "../valuation";
import { GENETIC_STAT_KEYS, type Chicken, type StatBlock, type Trait } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

function baseChicken(overrides: Partial<Chicken> = {}): Chicken {
  return {
    id: "c1",
    name: "Test",
    sex: "rooster",
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: "c1",
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
    colorScheme: { body: "#000", head: "#000", comb: "#000", tail: "#000", feet: "#000" },
    injured: false,
    createdAt: 0,
    ...overrides,
  };
}

function trait(rarity: Trait["rarity"]): Trait {
  return { id: rarity, name: rarity, rarity, description: "" };
}

test("chickenValue is always positive, even for a weak chicken", () => {
  assert.ok(chickenValue(baseChicken({ iv: statBlock(1) })) > 0);
});

test("chickenValue increases with higher IVs", () => {
  const weak = chickenValue(baseChicken({ iv: statBlock(30) }));
  const strong = chickenValue(baseChicken({ iv: statBlock(90) }));
  assert.ok(strong > weak);
});

test("chickenValue increases with rarer traits", () => {
  const noTraits = chickenValue(baseChicken());
  const legendary = chickenValue(baseChicken({ traits: [trait("legendary")] }));
  assert.ok(legendary > noTraits);
});

test("chickenValue increases with combat record (wins and championships)", () => {
  const rookie = chickenValue(baseChicken());
  const veteran = chickenValue(
    baseChicken({
      record: { wins: 20, losses: 2, championships: 3, koTko: 10, decisions: 10 },
    }),
  );
  assert.ok(veteran > rookie);
});

test("chickenValue is lower for a chick than an adult with identical genetics", () => {
  const chick = chickenValue(baseChicken({ growthStage: "chick" }));
  const adult = chickenValue(baseChicken({ growthStage: "adult" }));
  assert.ok(chick < adult);
});
