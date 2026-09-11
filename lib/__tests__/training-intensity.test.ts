import test from "node:test";
import assert from "node:assert/strict";

import { INTENSITY_MULTIPLIERS, applyIntensity } from "../training/intensity";

test("moderate intensity reproduces the base numbers exactly with no stress or injury risk", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "moderate");
  assert.deepEqual(result, { energy: 10, fatigue: 14, evGain: 5, stress: 0, injuryChance: 0 });
});

test("light intensity scales everything down and adds no stress", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "light");
  assert.equal(result.energy, 6);
  assert.equal(result.stress, 0);
  assert.equal(result.injuryChance, 0);
});

test("hard intensity increases fatigue more than energy and produces stress", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "hard");
  assert.equal(result.energy, 13);
  assert.equal(Math.round(result.fatigue), 20);
  assert.ok(result.stress > 0);
  assert.ok(result.injuryChance > 0);
});

test("extreme intensity is the highest risk tier", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "extreme");
  const hard = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "hard");
  assert.ok(result.stress > hard.stress);
  assert.ok(result.injuryChance > hard.injuryChance);
  assert.ok(INTENSITY_MULTIPLIERS.extreme.injuryChance > INTENSITY_MULTIPLIERS.hard.injuryChance);
});
