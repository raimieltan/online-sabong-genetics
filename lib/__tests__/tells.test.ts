import test from "node:test";
import assert from "node:assert/strict";
import { selectTell } from "../combat/tells";
import { ARCHETYPE_PROFILES } from "../combat/behavior";
import { emptyExperience, emptyOpponentModel } from "../combat/experience";
import type { DecisionContext } from "../combat/behavior";

function baseCtx(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    stamina: 100,
    maxStamina: 100,
    fatigue: 0,
    momentum: 0,
    position: 0,
    distance: "MID",
    contextState: "NEUTRAL",
    opponentContextState: "NEUTRAL",
    experience: emptyExperience(),
    opponentModel: emptyOpponentModel(),
    style: "balanced",
    physical: { mass: 1, reach: 1, mobility: 1, stability: 1, wingControl: 1, kickPower: 1 },
    rng: () => 0.5,
    ...overrides,
  };
}

test("PRESSURE/HEAVY_ATTACK/LIGHT_ATTACK from a high-aggression profile reads as the aggression tell", () => {
  assert.equal(selectTell(ARCHETYPE_PROFILES.aggressive, "PRESSURE", baseCtx()), "aggression");
});

test("REPOSITION/GUARD/EVADE from a high-patience profile reads as the patience tell", () => {
  assert.equal(selectTell(ARCHETYPE_PROFILES.counter, "REPOSITION", baseCtx()), "patience");
});

test("HEAVY_ATTACK while stamina is low (a real overcommit) reads as the risk tell, overriding the aggression read", () => {
  const lowStamina = baseCtx({ stamina: 20, maxStamina: 100 });
  assert.equal(selectTell(ARCHETYPE_PROFILES.aggressive, "HEAVY_ATTACK", lowStamina), "risk");
});

test("a routine LIGHT_ATTACK from a balanced profile at full health/stamina has no tell", () => {
  assert.equal(selectTell(ARCHETYPE_PROFILES.balanced, "LIGHT_ATTACK", baseCtx()), null);
});
