import test from "node:test";
import assert from "node:assert/strict";
import { scoreAction, ARCHETYPE_PROFILES, type DecisionContext } from "../combat/behavior";
import { emptyExperience, emptyOpponentModel } from "../combat/experience";

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

test("styleWeight shifts HEAVY_ATTACK score: aggressive scores it higher than counter, same profile otherwise", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const aggressiveScore = scoreAction(profile, "HEAVY_ATTACK", baseCtx({ style: "aggressive" }));
  const counterScore = scoreAction(profile, "HEAVY_ATTACK", baseCtx({ style: "counter" }));
  assert.ok(aggressiveScore > counterScore);
});

test("low mobility makes REPOSITION/EVADE score lower than baseline mobility", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const lowMobility = baseCtx({ physical: { mass: 1, reach: 1, mobility: 0.85, stability: 1, wingControl: 1, kickPower: 1 } });
  const baseline = baseCtx();
  assert.ok(scoreAction(profile, "REPOSITION", lowMobility) < scoreAction(profile, "REPOSITION", baseline));
  assert.ok(scoreAction(profile, "EVADE", lowMobility) < scoreAction(profile, "EVADE", baseline));
});

test("high mass does not directly boost PRESSURE/HEAVY_ATTACK score (mass is not a hidden fighting style)", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const highMass = baseCtx({ physical: { mass: 1.15, reach: 1, mobility: 1, stability: 1, wingControl: 1, kickPower: 1 } });
  const baseline = baseCtx();
  assert.equal(scoreAction(profile, "HEAVY_ATTACK", highMass), scoreAction(profile, "HEAVY_ATTACK", baseline));
});
