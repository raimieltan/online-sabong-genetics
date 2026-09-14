import test from "node:test";
import assert from "node:assert/strict";
import { inactivityPressureBonus, shouldForceEngagement } from "../combat/inactivity";

test("inactivityPressureBonus is 0 for a fresh fight (no stalemate yet)", () => {
  assert.equal(inactivityPressureBonus(0), 0);
});

test("inactivityPressureBonus increases monotonically with a longer no-damage streak", () => {
  assert.ok(inactivityPressureBonus(10) > inactivityPressureBonus(3));
});

test("shouldForceEngagement is false early and true once the streak crosses the stalemate threshold", () => {
  assert.equal(shouldForceEngagement(5), false);
  assert.equal(shouldForceEngagement(15), true);
});
