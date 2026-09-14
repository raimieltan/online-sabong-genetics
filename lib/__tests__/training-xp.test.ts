import test from "node:test";
import assert from "node:assert/strict";

import { creditXp } from "../training/xp";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("creditXp adds XP_PER_SESSION to every pool mapped from the category", () => {
  const state = defaultRoosterTrainingState(statBlock(50));
  const next = creditXp(state, "speed");

  assert.equal(next.physicalXP, 10);
  assert.equal(next.combatXP, 10);
  assert.equal(next.tacticalXP, 0);
  assert.equal(next.recoveryXP, 0);
});

test("creditXp only credits recoveryXP for the recovery category", () => {
  const state = defaultRoosterTrainingState(statBlock(50));
  const next = creditXp(state, "recovery");

  assert.equal(next.recoveryXP, 10);
  assert.equal(next.physicalXP, 0);
  assert.equal(next.combatXP, 0);
});

test("creditXp only credits tacticalXP for discipline", () => {
  const state = defaultRoosterTrainingState(statBlock(50));
  const next = creditXp(state, "discipline");

  assert.equal(next.tacticalXP, 10);
  assert.equal(next.physicalXP, 0);
});
