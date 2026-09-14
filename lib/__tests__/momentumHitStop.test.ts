import test from "node:test";
import assert from "node:assert/strict";
import { momentumHitStopBonus, MOMENTUM_HITSTOP_BONUS_CAP } from "../animation/momentumHitStop";

test("momentumHitStopBonus is 0 for a small momentum swing", () => {
  assert.equal(momentumHitStopBonus(2), 0);
});

test("momentumHitStopBonus grows with a bigger swing but never exceeds the cap", () => {
  assert.ok(momentumHitStopBonus(10) > momentumHitStopBonus(5));
  assert.ok(momentumHitStopBonus(100) <= MOMENTUM_HITSTOP_BONUS_CAP);
});
