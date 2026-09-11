import test from "node:test";
import assert from "node:assert/strict";
import { ANIMATIONS } from "../animation/animations/index";
import { PRIORITY } from "../animation/stateMachine";
import { TEMPORARY_COMBAT_EXAGGERATION } from "../combat-v2/constants";

test("all 3 tell AnimStates use the temporary 2x readable window", () => {
  const base = { tell_aggression: 1.2, tell_patience: 1.4, tell_risk: 1.6 } as const;
  for (const state of Object.keys(base) as (keyof typeof base)[]) {
    const def = ANIMATIONS[state];
    assert.ok(def, `${state} missing from ANIMATIONS`);
    assert.equal(def.duration, base[state] * TEMPORARY_COMBAT_EXAGGERATION);
    assert.equal(def.loop, false);
  }
});

test("tell priority sits above idle/ready/taunt so it interrupts idle, but below any attack/hit-reaction", () => {
  for (const state of ["tell_aggression", "tell_patience", "tell_risk"] as const) {
    assert.ok(PRIORITY[state] > PRIORITY.taunt);
    assert.ok(PRIORITY[state] < PRIORITY.peck_attack);
  }
});
