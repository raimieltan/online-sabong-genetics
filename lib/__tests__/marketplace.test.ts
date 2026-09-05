import test from "node:test";
import assert from "node:assert/strict";

import { generateListing, listingToChicken, sellPrice } from "../marketplace";
import { chickenValue } from "../valuation";
import { GENETIC_STAT_KEYS, type Chicken, type StatBlock } from "../types";

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

test("generateListing produces a positively-priced listing with a fresh id", () => {
  const a = generateListing();
  const b = generateListing();
  assert.ok(a.price > 0);
  assert.notEqual(a.id, b.id);
});

test("generateListing prices above the chicken's raw value (market markup)", () => {
  const listing = generateListing();
  const rawValue = chickenValue(listingToChicken(listing));
  assert.ok(listing.price >= rawValue);
});

test("listingToChicken produces a fresh gen-0-shaped chicken ready to own", () => {
  const listing = generateListing();
  const chicken = listingToChicken(listing);

  assert.equal(chicken.age, 0);
  assert.equal(chicken.health, 100);
  assert.equal(chicken.energy, 100);
  assert.equal(chicken.growthStage, "adult");
  assert.equal(chicken.record.wins, 0);
  assert.deepEqual(chicken.iv, listing.iv);
  Object.values(chicken.ev).forEach((v) => assert.equal(v, 0));
});

test("sellPrice pays out less than the chicken's full value", () => {
  const chicken = baseChicken();
  assert.ok(sellPrice(chicken) < chickenValue(chicken));
  assert.ok(sellPrice(chicken) > 0);
});
