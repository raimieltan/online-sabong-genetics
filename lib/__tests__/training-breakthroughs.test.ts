import test from "node:test";
import assert from "node:assert/strict";

import {
  BONUS_EV_ON_BREAKTHROUGH,
  crossedMilestone,
  rollBreakthrough,
  checkOvertrainedTrigger,
} from "../training/breakthroughs";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("crossedMilestone is true only when a multiple of 100 is crossed", () => {
  assert.equal(crossedMilestone(95, 100), true);
  assert.equal(crossedMilestone(90, 99), false);
  assert.equal(crossedMilestone(100, 105), false);
});

test("rollBreakthrough returns null when the roll misses", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  const rng = () => 0.99; // well above any possible chance
  const result = rollBreakthrough({
    state,
    stat: "power",
    category: "strength",
    xpBefore: state,
    xpAfter: state,
    rng,
  });
  assert.equal(result, null);
});

test("rollBreakthrough grants bonus EV on a low roll within the 70% bonus-EV band", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  const rolls = [0, 0.5]; // first roll: succeeds (0 < chance); second roll: 0.5 < 0.7 -> bonus_ev
  const rng = () => rolls.shift() ?? 0;
  const result = rollBreakthrough({
    state,
    stat: "power",
    category: "strength",
    xpBefore: state,
    xpAfter: state,
    rng,
  });
  assert.equal(result?.kind, "bonus_ev");
  assert.equal(result?.stat, "power");
});

test("rollBreakthrough grants a trait on a low roll within the 30% trait band", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  const rolls = [0, 0.99]; // succeeds, then lands in the trait band
  const rng = () => rolls.shift() ?? 0;
  const result = rollBreakthrough({
    state,
    stat: "power",
    category: "strength",
    xpBefore: state,
    xpAfter: state,
    rng,
  });
  assert.equal(result?.kind, "trait");
  assert.ok(result?.traitId);
});

test("BONUS_EV_ON_BREAKTHROUGH is the flat +5 nudge from the spec", () => {
  assert.equal(BONUS_EV_ON_BREAKTHROUGH, 5);
});

test("checkOvertrainedTrigger fires at the 5-session/high-fatigue threshold and not before", () => {
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 5, trainingFatigue: 85, hasTrait: false }), true);
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 4, trainingFatigue: 85, hasTrait: false }), false);
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 5, trainingFatigue: 84, hasTrait: false }), false);
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 5, trainingFatigue: 85, hasTrait: true }), false);
});
