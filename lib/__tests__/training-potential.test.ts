import test from "node:test";
import assert from "node:assert/strict";

import { rollTrainingPotential, potentialBand, discoverPotential } from "../training/potential";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("rollTrainingPotential clamps to [0, 100] and biases at least iv-5", () => {
  const rng = () => 0; // rng()=0 -> offset = -5 (minimum roll)
  const iv = statBlock(50);
  const potential = rollTrainingPotential(iv, rng);

  assert.equal(potential.power, 45);
});

test("rollTrainingPotential never exceeds 100", () => {
  const rng = () => 0.999; // pushes offset to its max (+15)
  const iv = statBlock(95);
  const potential = rollTrainingPotential(iv, rng);

  assert.equal(potential.power, 100);
});

test("potentialBand reports the correct band per threshold", () => {
  assert.equal(potentialBand(10), "Below Average");
  assert.equal(potentialBand(40), "Average");
  assert.equal(potentialBand(70), "Above Average");
  assert.equal(potentialBand(90), "Exceptional");
});

test("discoverPotential flips discovered true once effortSpent hits the per-stat cap", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 100;
  const next = discoverPotential(state);

  assert.equal(next.discovered.power, true);
  assert.equal(next.discovered.speed, undefined);
});
