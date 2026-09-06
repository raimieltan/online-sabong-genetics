import type { HitZone, PhysicalBlock } from "@/lib/types";

/**
 * Simplified collider volumes for the 7 combat hit zones plus one solid body
 * capsule (V2 battle spec §30-31: "do not use the detailed GLB mesh as the
 * primary physics collider"). Dimensions scale off the same raw proportion
 * ratios `ChickenModel.tsx`'s `applyProportions` uses for bone scaling, so a
 * bigger-bodied/longer-legged bird gets bigger/longer colliders to match —
 * approximated against the rig's ~0.75-world-unit standing height since we
 * don't have exact GLB measurements to read from.
 */

export type CapsuleSpec = { kind: "capsule"; radius: number; halfHeight: number; position: [number, number, number] };
export type SphereSpec = { kind: "sphere"; radius: number; position: [number, number, number] };
export type ZoneColliderSpec = CapsuleSpec | SphereSpec;

const BASELINE_LEG_HEIGHT = 0.34;
const BASELINE_BODY_RADIUS = 0.15;
const BASELINE_BODY_HALF_HEIGHT = 0.16;
const BASELINE_NECK_LENGTH = 0.16;
const BASELINE_HEAD_RADIUS = 0.09;
const BASELINE_WING_RADIUS = 0.05;
const BASELINE_WING_HALF_HEIGHT = 0.14;
const BASELINE_WING_OFFSET_X = 0.13;

export function getZoneColliders(physical: PhysicalBlock): Record<HitZone, ZoneColliderSpec> {
  const { body, neck, legs, wings } = physical;

  const legHeight = BASELINE_LEG_HEIGHT * legs;
  const bodyRadius = BASELINE_BODY_RADIUS * body;
  const bodyHalfHeight = BASELINE_BODY_HALF_HEIGHT * body;
  const bodyCenterY = legHeight + bodyHalfHeight;
  const neckLength = BASELINE_NECK_LENGTH * (neck / body);
  const wingHalfHeight = BASELINE_WING_HALF_HEIGHT * (wings / body);
  const wingX = BASELINE_WING_OFFSET_X * body;

  return {
    head: {
      kind: "sphere",
      radius: BASELINE_HEAD_RADIUS,
      position: [0, bodyCenterY + bodyHalfHeight + neckLength, 0.05],
    },
    neck: {
      kind: "capsule",
      radius: bodyRadius * 0.55,
      halfHeight: neckLength * 0.5,
      position: [0, bodyCenterY + bodyHalfHeight + neckLength * 0.5, 0.02],
    },
    body: {
      kind: "capsule",
      radius: bodyRadius,
      halfHeight: bodyHalfHeight,
      position: [0, bodyCenterY, 0],
    },
    left_wing: {
      kind: "capsule",
      radius: BASELINE_WING_RADIUS,
      halfHeight: wingHalfHeight,
      position: [-wingX, bodyCenterY, 0],
    },
    right_wing: {
      kind: "capsule",
      radius: BASELINE_WING_RADIUS,
      halfHeight: wingHalfHeight,
      position: [wingX, bodyCenterY, 0],
    },
    left_leg: {
      kind: "capsule",
      radius: bodyRadius * 0.4,
      halfHeight: legHeight * 0.5,
      position: [-bodyRadius * 0.5, legHeight * 0.5, 0],
    },
    right_leg: {
      kind: "capsule",
      radius: bodyRadius * 0.4,
      halfHeight: legHeight * 0.5,
      position: [bodyRadius * 0.5, legHeight * 0.5, 0],
    },
  };
}

/** One solid capsule approximating the whole standing bird — drives the real rigid-body physics. */
export function getBodyCapsule(physical: PhysicalBlock): CapsuleSpec {
  const { body, legs } = physical;
  const legHeight = BASELINE_LEG_HEIGHT * legs;
  const bodyRadius = BASELINE_BODY_RADIUS * body;
  const bodyHalfHeight = BASELINE_BODY_HALF_HEIGHT * body;

  return {
    kind: "capsule",
    radius: bodyRadius * 1.15,
    halfHeight: bodyHalfHeight + legHeight * 0.5,
    position: [0, legHeight * 0.5 + bodyHalfHeight * 0.5, 0],
  };
}
