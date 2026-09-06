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
import { makeChicken, statBlock } from "./testHelpers";

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
