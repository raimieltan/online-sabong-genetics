import test from "node:test";
import assert from "node:assert/strict";

import {
  EV_PER_TRAIN,
  ENERGY_PER_TRAIN,
  MAX_EV,
  MAX_ENERGY,
  canAffordTraining,
  trainStat,
  restEnergy,
} from "../training";
import { GENETIC_STAT_KEYS, type Chicken, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

function makeChicken(overrides: Partial<Chicken> = {}): Chicken {
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
    createdAt: Date.now(),
    ...overrides,
  };
}

test("canAffordTraining is true at exactly the energy cost", () => {
  assert.equal(canAffordTraining(ENERGY_PER_TRAIN), true);
  assert.equal(canAffordTraining(ENERGY_PER_TRAIN - 1), false);
  assert.equal(canAffordTraining(0), false);
});

test("trainStat raises the trained stat's EV by EV_PER_TRAIN and leaves others untouched", () => {
  const chicken = makeChicken({ ev: statBlock(10) });
  const result = trainStat(chicken, "power");

  assert.equal(result.ev.power, 10 + EV_PER_TRAIN);
  assert.equal(result.ev.speed, 10);
  assert.equal(result.energy, 100 - ENERGY_PER_TRAIN);
});

test("trainStat clamps EV at MAX_EV", () => {
  const chicken = makeChicken({ ev: statBlock(MAX_EV - 2) });
  const result = trainStat(chicken, "stamina");

  assert.equal(result.ev.stamina, MAX_EV);
});

test("trainStat floors energy at 0", () => {
  const chicken = makeChicken({ energy: ENERGY_PER_TRAIN - 1 });
  const result = trainStat(chicken, "agility");

  assert.equal(result.energy, 0);
});

test("restEnergy resets energy to MAX_ENERGY", () => {
  assert.equal(restEnergy().energy, MAX_ENERGY);
});
