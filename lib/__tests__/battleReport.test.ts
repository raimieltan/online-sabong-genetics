import test from "node:test";
import assert from "node:assert/strict";

import { buildBattleReport } from "../combat/battleReport";
import { applyFightOutcome } from "../combat";
import { makeChicken } from "./testHelpers";
import type { CombatResult } from "../types";

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

test("buildBattleReport surfaces only earned experience categories", () => {
  const chicken = makeChicken({ id: "a", confidence: 50, morale: 75, stress: 20 });
  const r = result({
    experienceGained: { a: { offensive: 12, defensive: 0, evasion: 0, counter: 0, pressure: 5, recovery: 0, adaptation: 0 } },
  });
  const outcome = applyFightOutcome(chicken, r);
  const report = buildBattleReport(chicken, r, "a", outcome);

  assert.equal(report.won, true);
  assert.deepEqual(report.experienceGained, { offensive: 12, pressure: 5 });
  assert.equal(report.totalExperienceGained, 17);
  assert.equal(report.confidenceDelta, 6);
  assert.equal(report.moraleDelta, 5);
});

test("buildBattleReport reports injuries and negative deltas on a loss", () => {
  const chicken = makeChicken({ id: "b", confidence: 50, morale: 75, stress: 20 });
  const r = result({
    winnerId: "a",
    loserId: "b",
    injuredChickenId: "b",
    newInjuries: {
      b: [
        {
          id: "inj-1",
          severity: "minor",
          label: "Scratch",
          incurredAt: Date.now(),
          recoveryRemaining: 1,
          permanent: false,
        },
      ],
    },
  });
  const outcome = applyFightOutcome(chicken, r);
  const report = buildBattleReport(chicken, r, "b", outcome);

  assert.equal(report.won, false);
  assert.equal(report.newInjuries.length, 1);
  assert.ok(report.confidenceDelta < 0);
  assert.ok(report.moraleDelta < 0);
  assert.ok(report.stressDelta > 0);
  assert.equal(report.insight, null);
});
