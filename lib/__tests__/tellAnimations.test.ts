import test from "node:test";
import assert from "node:assert/strict";
import { ANIMATIONS } from "../animation/animations/index";
import { PRIORITY } from "../animation/stateMachine";

test("all 3 tell AnimStates are registered with duration in the 300-500ms readable window", () => {
  for (const state of ["tell_aggression", "tell_patience", "tell_risk"] as const) {
    const def = ANIMATIONS[state];
    assert.ok(def, `${state} missing from ANIMATIONS`);
    assert.ok(def.duration >= 0.3 && def.duration <= 0.5, `${state} duration ${def.duration}s outside 300-500ms`);
    assert.equal(def.loop, false);
  }
});

test("tell priority sits above idle/ready/taunt so it interrupts idle, but below any attack/hit-reaction", () => {
  for (const state of ["tell_aggression", "tell_patience", "tell_risk"] as const) {
    assert.ok(PRIORITY[state] > PRIORITY.taunt);
    assert.ok(PRIORITY[state] < PRIORITY.peck_attack);
  }
});
