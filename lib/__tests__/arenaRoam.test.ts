import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_ROAM, roamPose } from "../animation/arenaRoam";

test("neutral roam provides style-aware spacing inside the enlarged arena", () => {
  const pose = roamPose(12_000, DEFAULT_ROAM, { styleA: "aggressive", styleB: "endurance" });
  assert.ok(pose.preferredB > pose.preferredA, "endurance fighter prefers more space than aggressive fighter");
  assert.ok(Math.hypot(pose.a.x, pose.a.z) <= DEFAULT_ROAM.arenaRadius + 1e-6);
  assert.ok(Math.hypot(pose.b.x, pose.b.z) <= DEFAULT_ROAM.arenaRadius + 1e-6);
  assert.notEqual(pose.intentA, pose.intentB, "neutral can be asymmetric");
});

test("neutral separation breathes and clash reset creates additional space", () => {
  const context = { styleA: "balanced" as const, styleB: "counter" as const };
  const gaps = [0, 4_000, 8_000, 12_000, 16_000].map((now) => {
    const p = roamPose(now, DEFAULT_ROAM, context);
    return Math.hypot(p.a.x - p.b.x, p.a.z - p.b.z);
  });
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 1, "neutral is not a fixed-radius orbit");
  const normal = roamPose(10_000, DEFAULT_ROAM, context);
  const reset = roamPose(10_000, DEFAULT_ROAM, { ...context, resetBias: 1 });
  const normalGap = Math.hypot(normal.a.x - normal.b.x, normal.a.z - normal.b.z);
  const resetGap = Math.hypot(reset.a.x - reset.b.x, reset.a.z - reset.b.z);
  assert.ok(resetGap > normalGap + .5, "post-clash reset opens meaningful space");
});
