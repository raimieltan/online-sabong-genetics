/**
 * Core types for the procedural rooster animation system.
 *
 * The unit of work is a POSE: a per-bone set of local-space rotation and
 * position *deltas from the captured rest pose*. Animation functions and
 * additive layers all write additively into a preallocated `PoseMap`; the
 * controller resets it to zero every frame, so rotations never accumulate
 * across frames (see design §3, "no accumulation").
 */

import type { PhysicalBlock } from "@/lib/types";

/** Every bone in the 14-bone rig we drive. `ChickenRoot` is left to mutation scaling. */
export const BONE_NAMES = [
  "Hips",
  "Spine",
  "Chest",
  "Neck",
  "Head",
  "WingL",
  "WingR",
  "Tail",
  "ThighL",
  "ShankL",
  "FootL",
  "ThighR",
  "ShankR",
  "FootR",
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

/** Mutable per-bone transform delta (Euler XYZ radians + local position offset). */
export interface BoneDelta {
  rx: number;
  ry: number;
  rz: number;
  px: number;
  py: number;
  pz: number;
}

export type PoseMap = Record<BoneName, BoneDelta>;

export function makePose(): PoseMap {
  const pose = {} as PoseMap;
  for (const name of BONE_NAMES) {
    pose[name] = { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 };
  }
  return pose;
}

export function resetPose(pose: PoseMap): void {
  for (const name of BONE_NAMES) {
    const b = pose[name];
    b.rx = 0;
    b.ry = 0;
    b.rz = 0;
    b.px = 0;
    b.py = 0;
    b.pz = 0;
  }
}

export function copyPose(src: PoseMap, dst: PoseMap): void {
  for (const name of BONE_NAMES) {
    const s = src[name];
    const d = dst[name];
    d.rx = s.rx;
    d.ry = s.ry;
    d.rz = s.rz;
    d.px = s.px;
    d.py = s.py;
    d.pz = s.pz;
  }
}

/** dst = lerp(a, b, t), field by field. */
export function lerpPose(a: PoseMap, b: PoseMap, t: number, dst: PoseMap): void {
  const inv = 1 - t;
  for (const name of BONE_NAMES) {
    const x = a[name];
    const y = b[name];
    const d = dst[name];
    d.rx = x.rx * inv + y.rx * t;
    d.ry = x.ry * inv + y.ry * t;
    d.rz = x.rz * inv + y.rz * t;
    d.px = x.px * inv + y.px * t;
    d.py = x.py * inv + y.py * t;
    d.pz = x.pz * inv + y.pz * t;
  }
}

/** Small helper: add a sparse delta into a bone of the accumulator pose. */
export function add(
  pose: PoseMap,
  bone: BoneName,
  d: Partial<Pick<BoneDelta, "rx" | "ry" | "rz" | "px" | "py" | "pz">>
): void {
  const b = pose[bone];
  if (d.rx) b.rx += d.rx;
  if (d.ry) b.ry += d.ry;
  if (d.rz) b.rz += d.rz;
  if (d.px) b.px += d.px;
  if (d.py) b.py += d.py;
  if (d.pz) b.pz += d.pz;
}

/** Mirror-add: same delta to a left/right pair, with rz/ry sign-flipped on the R bone. */
export function addPair(
  pose: PoseMap,
  base: "Wing" | "Thigh" | "Shank" | "Foot",
  d: Partial<BoneDelta>
): void {
  add(pose, `${base}L` as BoneName, d);
  add(pose, `${base}R` as BoneName, {
    ...d,
    rz: d.rz != null ? -d.rz : undefined,
    ry: d.ry != null ? -d.ry : undefined,
  });
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export type AnimState =
  | "idle"
  | "idle_alert"
  | "ready"
  | "walk"
  | "run"
  | "recovery"
  | "peck_attack"
  | "quick_kick"
  | "heavy_kick"
  | "wing_strike"
  | "jump_attack"
  | "flying_kick"
  | "double_kick"
  | "charge_attack"
  | "hit_light"
  | "hit_medium"
  | "hit_heavy"
  | "hit_critical"
  | "stagger"
  | "stagger_heavy"
  | "knockback"
  | "knockdown"
  | "getup"
  | "death"
  | "victory"
  | "defeat"
  | "taunt"
  | "backstep";

export const ATTACK_STATES: readonly AnimState[] = [
  "peck_attack",
  "quick_kick",
  "heavy_kick",
  "wing_strike",
  "jump_attack",
  "flying_kick",
  "double_kick",
  "charge_attack",
];

/** Visual-only animation gains derived from raw physical genetics (design §7). */
export interface AnimationGains {
  inertia: number;
  headThrow: number;
  kickReach: number;
  wingForce: number;
  tailCounter: number;
  bob: number;
}

export const NEUTRAL_GAINS: AnimationGains = {
  inertia: 1,
  headThrow: 1,
  kickReach: 1,
  wingForce: 1,
  tailCounter: 1,
  bob: 1,
};

/** Everything an animation function or layer needs for the current frame. */
export interface AnimContext {
  /** Seconds since this state started (already divided by playback speed). */
  stateTime: number;
  /** Normalized [0,1] progress through the current clip (1 and held for loops handled by fn). */
  t: number;
  /** Clamped frame delta in seconds (<= 1/30). */
  dt: number;
  /** Absolute ms timestamp (shared clock with FighterAnim). */
  now: number;
  gains: AnimationGains;
  facing: "left" | "right";
  /** Planar speed in world units/sec, derived from FighterAnim offset deltas. */
  speed: number;
  /** Signed forward/strafe velocity components (world units/sec). */
  velX: number;
  velZ: number;
  /** Vertical velocity of the whole fighter (world units/sec) — landing/launch cues. */
  velY: number;
  /** Move variant for attack states that share a base state. */
  moveKind?: string;
  stagger?: string;
  /** Target head yaw toward the opponent in the model's local frame (rad, pre-clamped). */
  aimYaw: number;
  /** False once dead — disables breathing / head-tracking layers. */
  alive: boolean;
}

export interface AnimationDef {
  /** Nominal clip length in seconds. Looping clips still declare a cycle length. */
  duration: number;
  loop: boolean;
  /** Higher wins in the state machine. */
  priority: number;
  /** Writes local-space deltas additively into `out`. */
  fn: (t: number, ctx: AnimContext, out: PoseMap) => void;
}

/** Intent handed from BattleCanvas to the model each turn / at impact. */
export interface AnimIntent {
  state: AnimState;
  /** ms timestamp when this intent began. */
  startedAt: number;
  /** Playback multiplier (1 = nominal; >1 faster). */
  speed: number;
  moveKind?: string;
  stagger?: string;
  /** This hit is the KO — route to death and suppress physics upright-recovery. */
  fatal?: boolean;
  facing: "left" | "right";
}

export type { PhysicalBlock };
