import test from "node:test";
import assert from "node:assert/strict";

import { battleAftermath } from "../combat/aftermath";
import type { CombatResult, InjuryRecord } from "../types";

function result(overrides: Partial<CombatResult> = {}): CombatResult {
  return {
    winnerId: "a",
    loserId: "b",
    log: [],
    totalTurns: 10,
    outcomeReason: "ko",
    injuredChickenId: null,
    ...overrides,
  };
}

function injury(overrides: Partial<InjuryRecord> = {}): InjuryRecord {
  return {
    id: "inj-1",
    severity: "minor",
    label: "Scratch",
    incurredAt: Date.now(),
    recoveryRemaining: 1,
    permanent: false,
    ...overrides,
  };
}

test("battleAftermath raises confidence and morale, lowers stress on a clean win", () => {
  const out = battleAftermath({ confidence: 50, morale: 75, stress: 20, battleHardening: 2 }, result(), "a", false, []);
  assert.equal(out.confidence, 56);
  assert.equal(out.morale, 80);
  assert.equal(out.stress, 17);
  assert.equal(out.battleHardening, 3);
});

test("battleAftermath lowers confidence and morale, raises stress on a loss", () => {
  const out = battleAftermath({ confidence: 50, morale: 75, stress: 20, battleHardening: 2 }, result(), "b", false, []);
  assert.equal(out.confidence, 42);
  assert.equal(out.morale, 68);
  assert.equal(out.stress, 28);
  assert.equal(out.battleHardening, 3);
});

test("a career-altering injury craters confidence and does not add battle hardening", () => {
  const out = battleAftermath(
    { confidence: 50, morale: 75, stress: 20, battleHardening: 5 },
    result(),
    "b",
    true,
    [injury({ severity: "career_altering", permanent: true, recoveryRemaining: 0 })]
  );
  assert.equal(out.confidence, 42 - 20);
  assert.equal(out.battleHardening, 5);
});

test("values clamp to the 0-100 range", () => {
  const out = battleAftermath({ confidence: 2, morale: 3, stress: 95, battleHardening: 0 }, result(), "b", true, [
    injury({ severity: "career_altering", permanent: true, recoveryRemaining: 0 }),
  ]);
  assert.equal(out.confidence, 0);
  assert.equal(out.morale, 0);
  assert.equal(out.stress, 100);
});

test("defaults apply when the chicken has no prior emotional state", () => {
  const out = battleAftermath({}, result(), "a", false, []);
  assert.equal(out.confidence, 56);
  assert.equal(out.morale, 80);
  assert.equal(out.stress, 0);
  assert.equal(out.battleHardening, 1);
});
