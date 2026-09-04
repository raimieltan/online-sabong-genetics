import test from "node:test";
import assert from "node:assert/strict";

import { createChicken, generateRandomChicken } from "../chickenGenerator";
import { GENETIC_STAT_KEYS } from "../types";

test("createChicken fills EVs at zero, full health/energy, and a zeroed record", () => {
  const chicken = createChicken({
    name: "Test",
    sex: "rooster",
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: "test-bloodline",
    iv: {
      power: 80,
      speed: 70,
      stamina: 60,
      defense: 50,
      accuracy: 40,
      agility: 30,
    },
  });

  for (const key of GENETIC_STAT_KEYS) {
    assert.equal(chicken.ev[key], 0);
  }
  assert.equal(chicken.health, 100);
  assert.equal(chicken.energy, 100);
  assert.equal(chicken.age, 0);
  assert.equal(chicken.status, "active");
  assert.deepEqual(chicken.record, {
    wins: 0,
    losses: 0,
    championships: 0,
    koTko: 0,
    decisions: 0,
  });
  assert.deepEqual(chicken.traits, []);
  assert.ok(chicken.id.length > 0);
  assert.ok(chicken.createdAt > 0);
});

test("createChicken defaults growthStage to adult and traits to empty", () => {
  const chicken = createChicken({
    name: "Test",
    sex: "rooster",
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: "test-bloodline",
    iv: {
      power: 50,
      speed: 50,
      stamina: 50,
      defense: 50,
      accuracy: 50,
      agility: 50,
    },
  });

  assert.equal(chicken.growthStage, "adult");
  assert.deepEqual(chicken.traits, []);
});

test("createChicken accepts explicit growthStage and traits", () => {
  const trait = { id: "iron-stamina", name: "Iron Stamina", rarity: "common" as const, description: "x" };
  const chicken = createChicken({
    name: "Test",
    sex: "hen",
    generation: 1,
    parents: { fatherId: "f", motherId: "m" },
    bloodlineId: "test-bloodline",
    iv: {
      power: 50,
      speed: 50,
      stamina: 50,
      defense: 50,
      accuracy: 50,
      agility: 50,
    },
    growthStage: "chick",
    traits: [trait],
  });

  assert.equal(chicken.growthStage, "chick");
  assert.deepEqual(chicken.traits, [trait]);
});

test("createChicken respects an explicit id instead of generating one", () => {
  const chicken = createChicken({
    id: "fixed-id",
    name: "Test",
    sex: "hen",
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: "test-bloodline",
    iv: {
      power: 50,
      speed: 50,
      stamina: 50,
      defense: 50,
      accuracy: 50,
      agility: 50,
    },
  });

  assert.equal(chicken.id, "fixed-id");
});

test("generateRandomChicken produces a gen-0 chicken with no parents and its own bloodline", () => {
  const chicken = generateRandomChicken();

  assert.equal(chicken.generation, 0);
  assert.deepEqual(chicken.parents, { fatherId: null, motherId: null });
  assert.equal(chicken.bloodlineId, chicken.id);
});

test("generateRandomChicken produces IVs within the 40-99 range for every genetic stat", () => {
  for (let i = 0; i < 200; i += 1) {
    const chicken = generateRandomChicken();
    for (const key of GENETIC_STAT_KEYS) {
      const value = chicken.iv[key];
      assert.ok(value >= 40 && value <= 99, `${key}=${value} out of range`);
    }
  }
});

test("generateRandomChicken uses the provided name and sex when given", () => {
  const chicken = generateRandomChicken({ name: "Custom Name", sex: "hen" });
  assert.equal(chicken.name, "Custom Name");
  assert.equal(chicken.sex, "hen");
});

test("generateRandomChicken falls back to a non-empty name and a valid sex when none is given", () => {
  const chicken = generateRandomChicken();
  assert.ok(chicken.name.length > 0);
  assert.ok(chicken.sex === "rooster" || chicken.sex === "hen");
});

test("generateRandomChicken assigns distinct ids across calls", () => {
  const first = generateRandomChicken();
  const second = generateRandomChicken();
  assert.notEqual(first.id, second.id);
});
