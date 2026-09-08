import test from "node:test";
import assert from "node:assert/strict";
import { deriveMentalState, applyMentalState } from "../combat/mentalState";
import { emptyExperience } from "../combat/experience";

test("low stamina always reads as exhausted regardless of other inputs", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 1, staminaRatio: 0.1, momentum: 50, recentExchangeResult: "landed", experience: emptyExperience() }),
    "exhausted"
  );
});

test("low HP + very negative momentum reads as desperate", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 0.2, staminaRatio: 0.8, momentum: -40, recentExchangeResult: "taken", experience: emptyExperience() }),
    "desperate"
  );
});

test("high momentum + a landed hit reads as confident", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 0.9, staminaRatio: 0.8, momentum: 40, recentExchangeResult: "landed", experience: emptyExperience() }),
    "confident"
  );
});

test("neutral inputs read as calm", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 0.9, staminaRatio: 0.9, momentum: 0, recentExchangeResult: "neutral", experience: emptyExperience() }),
    "calm"
  );
});

test("applyMentalState('desperate') raises riskTolerance, capped at 1", () => {
  const identity = { aggression: 0.5, patience: 0.5, riskTolerance: 0.9 };
  const adjusted = applyMentalState(identity, "desperate");
  assert.ok(adjusted.riskTolerance > identity.riskTolerance);
  assert.ok(adjusted.riskTolerance <= 1);
});
