import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_TRAINING_EFFORT_TOTAL,
  MAX_TRAINING_EFFORT_PER_STAT,
  effortHeadroom,
  spendEffort,
  redistributeEffort,
} from "../training/effort";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("effortHeadroom is the per-stat cap when nothing spent", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  assert.equal(effortHeadroom(state, "power"), MAX_TRAINING_EFFORT_PER_STAT);
});

test("effortHeadroom is limited by the remaining total budget", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  // Spend everywhere except power, right up to the total cap.
  state.effortSpent = { power: 0, speed: 100, agility: 100, defense: 100, stamina: 100, accuracy: 100 };
  assert.equal(effortHeadroom(state, "power"), MAX_TRAINING_EFFORT_TOTAL - 500);
});

test("spendEffort clamps evGain to available headroom and updates effortSpent", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 98;
  const { evGain, effortSpent } = spendEffort(state, "power", 5);

  assert.equal(evGain, 2);
  assert.equal(effortSpent.power, 100);
});

test("spendEffort gives 0 EV once a stat's effort is exhausted", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 100;
  const { evGain } = spendEffort(state, "power", 5);

  assert.equal(evGain, 0);
});

test("redistributeEffort moves spent effort from one stat to another", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 40;
  const next = redistributeEffort(state, "power", "speed", 10);

  assert.equal(next.power, 30);
  assert.equal(next.speed, 10);
});

test("redistributeEffort throws if moving more than what's spent on the source stat", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 5;
  assert.throws(() => redistributeEffort(state, "power", "speed", 10), RangeError);
});

test("redistributeEffort throws if the destination stat would exceed its per-stat cap", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 50;
  state.effortSpent.speed = 95;
  assert.throws(() => redistributeEffort(state, "power", "speed", 10), RangeError);
});
