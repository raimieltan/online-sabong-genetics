import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { applyAttackVariation } from "../animation/animations/attackVariation";
import { ProceduralAnimationController } from "../animation/ProceduralAnimationController";
import { ATTACK_STATES, makePose, NEUTRAL_GAINS, type AnimContext } from "../animation/types";

function context(attackVariant: number, facing: "left" | "right" = "right"): AnimContext {
  return {
    stateTime: 0,
    t: 0,
    dt: 1 / 60,
    now: 0,
    gains: NEUTRAL_GAINS,
    facing,
    speed: 0,
    velX: 0,
    velZ: 0,
    velY: 0,
    wingFlapIntensity: 0,
    aimYaw: 0,
    alive: true,
    attackVariant,
  };
}

test("attack secondary motion is blend-safe at clip boundaries", () => {
  for (const state of ATTACK_STATES) {
    for (const t of [0, 1]) {
      const pose = makePose();
      applyAttackVariation(state, t, context(2), pose);
      for (const delta of Object.values(pose)) {
        assert.deepEqual(delta, { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 });
      }
    }
  }
});

test("repeated attacks receive distinct, mirrored silhouettes", () => {
  const inward = makePose();
  const outward = makePose();
  applyAttackVariation("wing_strike", 0.55, context(1), inward);
  applyAttackVariation("wing_strike", 0.55, context(2), outward);
  assert.ok(inward.Hips.ry > 0);
  assert.ok(outward.Hips.ry < 0);
  assert.ok(Math.abs(inward.WingR_Tip.ry) > 0.1);
  assert.ok(Math.abs(outward.WingR_Tip.ry) > 0.1);
});

test("simulation-driven attacks blend in instead of snapping to the full pose", () => {
  const head = new THREE.Object3D();
  const controller = new ProceduralAnimationController({ Head: head }, { gains: NEUTRAL_GAINS, facing: "right" });
  const intent = { state: "peck_attack" as const, startedAt: 17, speed: 1, facing: "right" as const, simulationProgress: 0.58, moveKind: "peck_strike" };
  const frame = { dt: 1 / 60, now: 100, speed: 0, velX: 0, velZ: 0, velY: 0, aimYaw: 0, simulationIntent: intent };

  controller.update(frame);
  const firstAngle = head.quaternion.angleTo(new THREE.Quaternion());
  for (let i = 0; i < 6; i++) controller.update({ ...frame, now: frame.now + i + 1 });
  const settledAngle = head.quaternion.angleTo(new THREE.Quaternion());

  assert.ok(firstAngle > 0);
  assert.ok(settledAngle > firstAngle * 1.5);
});
