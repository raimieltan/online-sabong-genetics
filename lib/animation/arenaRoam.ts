/**
 * Arena roam — where the two roosters stand on the pit floor between exchanges.
 *
 * Pure math, world units, deterministic from a presentation clock. The old
 * presentation pinned both fighters to ±WORLD_HALF_GAP and only let them jitter
 * a few centimetres; this ranges the whole engagement around the arena disc so a
 * fight reads as two birds working the ring — circling, giving ground, cutting
 * angles — instead of two capsules trading blows on a rail.
 *
 * Framework-agnostic: no THREE, no React. BattleCanvas samples `roamPose(now)`
 * each frame and damps each FighterAnim's offset toward it.
 */

import { clamp } from "./math";

export interface RoamConfig {
  /** Usable pit-floor radius (world units) — neither bird's centre leaves this. */
  arenaRadius: number;
  /** Resting centre-to-centre gap between the two birds (world units). */
  engagementGap: number;
}

export const DEFAULT_ROAM: RoamConfig = {
  arenaRadius: 2.2,
  engagementGap: 2.9,
};

export interface RoamPose {
  /** Fighter-A stage position, world units, relative to arena centre. */
  a: { x: number; z: number };
  b: { x: number; z: number };
  /** Yaw (radians) to face the opponent — already relative to A's "+X forward" base. */
  yawA: number;
  /** Yaw (radians) to face the opponent — already relative to B's "−X forward" base. */
  yawB: number;
}

function clampToDisc(x: number, z: number, r: number): [number, number] {
  const d = Math.hypot(x, z);
  if (d <= r) return [x, z];
  const s = r / d;
  return [x * s, z * s];
}

/**
 * @param nowMs   presentation clock (ms) — the same virtual clock BattleCanvas
 *                already uses for idle bob, so it freezes during hit-stop.
 * @param cfg     arena bounds / spacing.
 * @param engageBias 0..1 — pulls the pair tighter together. BattleCanvas raises
 *                it while an attack is live so the roamer doesn't drag a lunging
 *                bird back out of its own strike range.
 */
export function roamPose(nowMs: number, cfg: RoamConfig = DEFAULT_ROAM, engageBias = 0): RoamPose {
  const t = nowMs / 1000;
  const bias = clamp(engageBias, 0, 1);

  // Shared engagement centre drifts a slow Lissajous well inside the rim.
  const cr = cfg.arenaRadius * 0.4;
  const cx = Math.sin(t * 0.11) * cr + Math.sin(t * 0.037 + 1.3) * cr * 0.28;
  const cz = Math.cos(t * 0.09 + 0.7) * cr + Math.cos(t * 0.041) * cr * 0.28;

  // Engagement axis rotates steadily (the birds circle each other), with a
  // couple of slower harmonics layered on so they visibly swing round to a new
  // angle now and then rather than turning at a constant rate.
  const theta =
    t * 0.24 + Math.sin(t * 0.17) * 0.85 + Math.sin(t * 0.5 + 2.1) * 0.45;

  const half = (cfg.engagementGap * (1 - 0.7 * bias)) * 0.5;
  const nx = Math.cos(theta);
  const nz = Math.sin(theta);
  const px = -nz; // perpendicular to the axis
  const pz = nx;

  // Personal footwork — small independent in/out bob and lateral shuffle so
  // neither bird looks welded to the axis.
  const aIn = Math.sin(t * 1.7) * 0.13;
  const bIn = Math.sin(t * 1.9 + 1.1) * 0.13;
  const aSide = Math.sin(t * 0.9 + 0.4) * 0.2;
  const bSide = Math.cos(t * 0.95) * 0.2;

  const [ax, az] = clampToDisc(
    cx + nx * (half + aIn) + px * aSide,
    cz + nz * (half + aIn) + pz * aSide,
    cfg.arenaRadius
  );
  const [bx, bz] = clampToDisc(
    cx - nx * (half + bIn) + px * bSide,
    cz - nz * (half + bIn) + pz * bSide,
    cfg.arenaRadius
  );

  // Face the opponent. ChickenModel's base facing is "+X forward" for A and
  // "−X forward" for B, so the yaw we return is (angle-to-opponent − base).
  const angA = Math.atan2(bx - ax, bz - az);
  const angB = Math.atan2(ax - bx, az - bz);

  return {
    a: { x: ax, z: az },
    b: { x: bx, z: bz },
    yawA: angA - Math.PI / 2,
    yawB: angB + Math.PI / 2,
  };
}
