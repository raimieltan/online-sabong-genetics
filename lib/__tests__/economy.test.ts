import test from "node:test";
import assert from "node:assert/strict";

import { BATTLE_WIN_CREDITS, canAfford, earnCredits, spendCredits, STARTING_CREDITS } from "../economy";

test("STARTING_CREDITS and BATTLE_WIN_CREDITS are positive constants", () => {
  assert.ok(STARTING_CREDITS > 0);
  assert.ok(BATTLE_WIN_CREDITS > 0);
});

test("canAfford is true when balance equals the cost", () => {
  assert.equal(canAfford(100, 100), true);
});

test("canAfford is false when balance is below the cost", () => {
  assert.equal(canAfford(99, 100), false);
});

test("spendCredits subtracts the amount", () => {
  assert.equal(spendCredits(100, 40), 60);
});

test("spendCredits floors at zero rather than going negative", () => {
  assert.equal(spendCredits(10, 40), 0);
});

test("earnCredits adds the amount", () => {
  assert.equal(earnCredits(100, 25), 125);
});
