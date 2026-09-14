import test from "node:test";
import assert from "node:assert/strict";
import { momentumRiskNudge, MOMENTUM_RISK_NUDGE_CAP } from "../combat/momentum";

test("momentumRiskNudge is 0 at neutral momentum", () => {
  assert.equal(momentumRiskNudge(0), 0);
});

test("momentumRiskNudge is positive under positive momentum, negative under negative momentum", () => {
  assert.ok(momentumRiskNudge(50) > 0);
  assert.ok(momentumRiskNudge(-50) < 0);
});

test("momentumRiskNudge never exceeds the cap even at max momentum (prevents a runaway snowball)", () => {
  assert.equal(momentumRiskNudge(100), MOMENTUM_RISK_NUDGE_CAP);
  assert.equal(momentumRiskNudge(-100), -MOMENTUM_RISK_NUDGE_CAP);
});
