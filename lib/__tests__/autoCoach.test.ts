import test from "node:test";
import assert from "node:assert/strict";
import { autoCoachPolicy } from "../combat/autoCoach";
import type { CoachObservation } from "../combat/simulator";

function obs(overrides: Partial<CoachObservation> = {}): CoachObservation {
  return {
    turn: 1,
    own: { hp: 80, maxHp: 100, stamina: 80, maxStamina: 100, momentum: 0, mentalState: "calm", commandPoints: 2 },
    opponentContextState: "NEUTRAL",
    opponentRecentActions: [],
    ...overrides,
  };
}

test("autoCoachPolicy issues PRESS when the opponent is EXHAUSTED", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ opponentContextState: "EXHAUSTED" })), "PRESS");
});

test("autoCoachPolicy issues RECOVER when this fighter's own mental state is desperate", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ own: { hp: 20, maxHp: 100, stamina: 30, maxStamina: 100, momentum: -30, mentalState: "desperate", commandPoints: 2 } })), "RECOVER");
});

test("autoCoachPolicy issues WAIT when the opponent is DOMINANT", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ opponentContextState: "DOMINANT" })), "WAIT");
});

test("autoCoachPolicy issues no command (null) in a routine neutral state", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs()), null);
});

test("autoCoachPolicy never issues a command with 0 CommandPoints available", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ opponentContextState: "EXHAUSTED", own: { hp: 80, maxHp: 100, stamina: 80, maxStamina: 100, momentum: 0, mentalState: "calm", commandPoints: 0 } })), null);
});
