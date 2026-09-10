import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleWingFlapCycle } from "../animation/wingFlap";

test("wing flap separates shoulder axes and folds only during recovery", () => {
  const top = sampleWingFlapCycle(0.06);
  const down = sampleWingFlapCycle(0.28);
  const bottom = sampleWingFlapCycle(0.43);
  const recovery = sampleWingFlapCycle(0.7);

  assert.ok(down.flap > top.flap);
  assert.ok(down.sweep > top.sweep);
  assert.notEqual(down.twist, down.flap);
  assert.ok(bottom.flap > recovery.flap);
  assert.ok(down.fold < 0.1);
  assert.ok(recovery.fold > 0.8);
  assert.ok(recovery.tipFollow > down.tipFollow);
  assert.ok(down.downstroke > 0);
  assert.ok(recovery.settle > 0);
});

test("wing flap is continuous at the loop and includes reversal holds", () => {
  const beforeWrap = sampleWingFlapCycle(0.9999);
  const afterWrap = sampleWingFlapCycle(0.0001);
  assert.ok(Math.abs(beforeWrap.flap - afterWrap.flap) < 0.01);
  assert.ok(Math.abs(beforeWrap.sweep - afterWrap.sweep) < 0.01);

  const topA = sampleWingFlapCycle(0.02);
  const topB = sampleWingFlapCycle(0.08);
  const powerA = sampleWingFlapCycle(0.16);
  const powerB = sampleWingFlapCycle(0.3);
  assert.ok(Math.abs(topB.flap - topA.flap) < Math.abs(powerB.flap - powerA.flap));
});
