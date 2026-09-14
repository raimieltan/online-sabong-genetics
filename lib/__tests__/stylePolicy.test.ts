import test from "node:test";
import assert from "node:assert/strict";
import { styleWeight, STYLE_POLICIES } from "../combat/stylePolicy";
import { COMBAT_ACTIONS } from "../types";

test("every FightingStyle defines a weight for every CombatAction", () => {
  for (const style of Object.keys(STYLE_POLICIES) as (keyof typeof STYLE_POLICIES)[]) {
    for (const action of COMBAT_ACTIONS) {
      assert.equal(typeof STYLE_POLICIES[style][action], "number");
    }
  }
});

test("aggressive weights HEAVY_ATTACK/PRESSURE above counter's", () => {
  assert.ok(styleWeight("aggressive", "HEAVY_ATTACK", "NEUTRAL") > styleWeight("counter", "HEAVY_ATTACK", "NEUTRAL"));
  assert.ok(styleWeight("aggressive", "PRESSURE", "NEUTRAL") > styleWeight("counter", "PRESSURE", "NEUTRAL"));
});

test("counter weights COUNTER above every other style's", () => {
  const others: (keyof typeof STYLE_POLICIES)[] = ["aggressive", "endurance", "balanced"];
  for (const style of others) {
    assert.ok(styleWeight("counter", "COUNTER", "NEUTRAL") > styleWeight(style, "COUNTER", "NEUTRAL"));
  }
});

test("opponent EXHAUSTED raises PRESSURE weight and lowers RECOVER weight vs NEUTRAL", () => {
  assert.ok(styleWeight("balanced", "PRESSURE", "EXHAUSTED") > styleWeight("balanced", "PRESSURE", "NEUTRAL"));
  assert.ok(styleWeight("balanced", "RECOVER", "EXHAUSTED") < styleWeight("balanced", "RECOVER", "NEUTRAL"));
});
