import test from "node:test";
import assert from "node:assert/strict";

import { experienceInsights, matchupInsight } from "../training/insights";
import type { CombatExperience, CombatLogEntry, CombatResult } from "../types";

function experience(overrides: Partial<CombatExperience> = {}): CombatExperience {
  return { offensive: 0, defensive: 0, evasion: 0, counter: 0, pressure: 0, recovery: 0, adaptation: 0, ...overrides };
}

test("experienceInsights returns nothing below the sample-size floor", () => {
  assert.deepEqual(experienceInsights(experience({ offensive: 40 })), []);
});

test("experienceInsights flags a category well below the chicken's own average", () => {
  const exp = experience({ offensive: 100, defensive: 100, evasion: 100, counter: 100, pressure: 100, recovery: 5, adaptation: 100 });
  const insights = experienceInsights(exp);
  assert.equal(insights.length, 1);
  assert.equal(insights[0].weakCategory, "recovery");
  assert.equal(insights[0].recommendedTraining, "recovery");
});

test("experienceInsights returns nothing for a well-rounded chicken", () => {
  const exp = experience({ offensive: 80, defensive: 75, evasion: 78, counter: 82, pressure: 79, recovery: 76, adaptation: 81 });
  assert.deepEqual(experienceInsights(exp), []);
});

function entry(overrides: Partial<CombatLogEntry> = {}): CombatLogEntry {
  return {
    turn: 1,
    attackerId: "opp",
    defenderId: "me",
    damage: 5,
    hitZone: null,
    isMiss: false,
    isCrit: false,
    isCounter: false,
    isCritical: false,
    defenderHp: 50,
    stagger: "none",
    timestamp: Date.now(),
    ...overrides,
  };
}

function result(log: CombatLogEntry[], winnerId = "opp"): CombatResult {
  return { winnerId, loserId: "me", log, totalTurns: log.length, outcomeReason: "ko", injuredChickenId: null };
}

test("matchupInsight calls out repeated pressure from the opponent on a loss", () => {
  const log = Array.from({ length: 10 }, () => entry({ attackerAction: "PRESSURE" }));
  const insight = matchupInsight(result(log), "me");
  assert.match(insight ?? "", /pressured relentlessly/);
});

test("matchupInsight calls out getting countered repeatedly", () => {
  const log = Array.from({ length: 5 }, () => entry({ attackerId: "me", defenderId: "opp", isCounter: true }));
  const insight = matchupInsight(result(log), "me");
  assert.match(insight ?? "", /countered repeatedly/);
});

test("matchupInsight returns null on a win", () => {
  const log = Array.from({ length: 10 }, () => entry({ attackerAction: "PRESSURE" }));
  const insight = matchupInsight(result(log, "me"), "me");
  assert.equal(insight, null);
});
