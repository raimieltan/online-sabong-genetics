import test from "node:test";
import assert from "node:assert/strict";
import { complianceFactor, commandActionModifier } from "../combat/command";
import type { CombatIdentity } from "../combat/identity";

const highAggression: CombatIdentity = { aggression: 0.9, patience: 0.2, riskTolerance: 0.7 };
const highPatience: CombatIdentity = { aggression: 0.2, patience: 0.9, riskTolerance: 0.3 };

test("complianceFactor is never 0 or 1 — a command always biases, never puppets", () => {
  for (const identity of [highAggression, highPatience]) {
    for (const command of ["PRESS", "WAIT", "RECOVER"] as const) {
      const f = complianceFactor(command, identity);
      assert.ok(f > 0 && f < 1, `${command}/${JSON.stringify(identity)} compliance ${f} out of (0,1)`);
    }
  }
});

test("PRESS complies more with a high-aggression identity than a high-patience one", () => {
  assert.ok(complianceFactor("PRESS", highAggression) > complianceFactor("PRESS", highPatience));
});

test("WAIT complies more with a high-patience identity than a high-aggression one", () => {
  assert.ok(complianceFactor("WAIT", highPatience) > complianceFactor("WAIT", highAggression));
});

test("commandActionModifier is 1 (no bias) for an action the command doesn't target", () => {
  assert.equal(commandActionModifier("PRESS", highAggression, "RECOVER"), 1);
});

test("commandActionModifier is >1 for an action the command does target", () => {
  assert.ok(commandActionModifier("PRESS", highAggression, "PRESSURE") > 1);
});

test("commandActionModifier is 1 when no command is active", () => {
  assert.equal(commandActionModifier(null, highAggression, "PRESSURE"), 1);
});
