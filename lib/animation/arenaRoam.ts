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
import type { FightingStyle } from "@/lib/types";

export interface RoamConfig {
  /** Usable pit-floor radius (world units) — neither bird's centre leaves this. */
  arenaRadius: number;
  /** Resting centre-to-centre gap between the two birds (world units). */
  clashDistance: number;
}

export const DEFAULT_ROAM: RoamConfig = {
  // Model-derived world units: a bird is roughly a unit wide.  This leaves
  // room for meaningful long-range reads while remaining inside the painted ring.
  arenaRadius: 7,
  clashDistance: 1.05,
};

export type NeutralIntent = "CIRCLE_LEFT" | "CIRCLE_RIGHT" | "PRESSURE" | "YIELD" | "STALK" | "RESET";

export interface RoamContext {
  styleA: FightingStyle;
  styleB: FightingStyle;
  activeAttacker?: "r1" | "r2" | null;
  /** 0..1, immediately after contact: explicitly create space. */
  resetBias?: number;
}

export interface RoamPose {
  /** Fighter-A stage position, world units, relative to arena centre. */
  a: { x: number; z: number };
  b: { x: number; z: number };
  /** Yaw (radians) to face the opponent — already relative to A's "+X forward" base. */
  yawA: number;
  /** Yaw (radians) to face the opponent — already relative to B's "−X forward" base. */
  yawB: number;
  preferredA: number;
  preferredB: number;
  distanceBandA: "LONG" | "MEDIUM" | "CLOSE";
  distanceBandB: "LONG" | "MEDIUM" | "CLOSE";
  intentA: NeutralIntent;
  intentB: NeutralIntent;
  pressureA: number;
  pressureB: number;
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
function preferredDistance(style: FightingStyle): number {
  if (style === "aggressive") return 4.35;
  if (style === "counter") return 6.7;
  if (style === "endurance") return 7.25;
  return 5.55;
}

function distanceBand(distance: number): "LONG" | "MEDIUM" | "CLOSE" {
  return distance > 6.2 ? "LONG" : distance > 3.7 ? "MEDIUM" : "CLOSE";
}

/**
 * Continuous but deliberately non-uniform neutral choreography. Attack clips
 * traverse the last metres; this only establishes the spatial situation they
 * launch from, preventing STALK/CIRCLE from becoming a tiny permanent orbit.
 */
export function roamPose(nowMs: number, cfg: RoamConfig = DEFAULT_ROAM, context?: RoamContext): RoamPose {
  const t = nowMs / 1000;
  const styleA = context?.styleA ?? "balanced";
  const styleB = context?.styleB ?? "balanced";
  const preferredA = preferredDistance(styleA) + Math.sin(t * .19 + .6) * .8 + Math.sin(t * .61) * .32;
  const preferredB = preferredDistance(styleB) + Math.sin(t * .17 + 2.1) * .8 + Math.sin(t * .53 + 1) * .32;
  const aggressionA = styleA === "aggressive" ? .28 : styleA === "counter" ? -.2 : 0;
  const aggressionB = styleB === "aggressive" ? .28 : styleB === "counter" ? -.2 : 0;
  const tempo = Math.sin(t * .23) * .42 + Math.sin(t * .071 + .8) * .3;
  const pressureA = clamp(.5 + tempo + aggressionA - aggressionB * .35, 0, 1);
  const pressureB = clamp(.5 - tempo + aggressionB - aggressionA * .35, 0, 1);
  const reset = clamp(context?.resetBias ?? 0, 0, 1);

  // Shared engagement centre drifts a slow Lissajous well inside the rim.
  const cr = cfg.arenaRadius * 0.3;
  const cx = Math.sin(t * 0.11) * cr + Math.sin(t * 0.037 + 1.3) * cr * 0.28;
  const cz = Math.cos(t * 0.09 + 0.7) * cr + Math.cos(t * 0.041) * cr * 0.28;

  // Engagement axis rotates steadily (the birds circle each other), with a
  // couple of slower harmonics layered on so they visibly swing round to a new
  // angle now and then rather than turning at a constant rate.
  const theta = t * (0.18 + Math.sin(t * .13) * .06) + Math.sin(t * .37) * .75;

  // Repeated long/medium/close bands, with a deliberately wider post-clash
  // reset. No neutral target is ever held at clash range.
  const breathing = Math.sin(t * .31 + .4) * 1.15 + Math.sin(t * .097) * .7;
  let separation = (preferredA + preferredB) * .5 + breathing + reset * 2.5;
  if (context?.activeAttacker) separation = Math.max(separation, 4.5);
  separation = clamp(separation, 3.1, cfg.arenaRadius * 1.62);
  const half = separation * .5;
  const nx = Math.cos(theta);
  const nz = Math.sin(theta);
  const px = -nz; // perpendicular to the axis
  const pz = nx;

  // Personal footwork — small independent in/out bob and lateral shuffle so
  // neither bird looks welded to the axis.
  const netPressure = pressureA - pressureB;
  const aIn = Math.sin(t * 1.7) * .2 - netPressure * .75;
  const bIn = Math.sin(t * 1.9 + 1.1) * .2 + netPressure * .75;
  const aSide = Math.sin(t * .79 + .3) * .62 + netPressure * .35;
  const bSide = Math.sin(t * .71 + 2.2) * .62 + netPressure * .15;

  const [ax, az] = clampToDisc(
    cx - nx * (half + aIn) + px * aSide,
    cz - nz * (half + aIn) + pz * aSide,
    cfg.arenaRadius
  );
  const [bx, bz] = clampToDisc(
    cx + nx * (half + bIn) + px * bSide,
    cz + nz * (half + bIn) + pz * bSide,
    cfg.arenaRadius
  );

  // Face the opponent. ChickenModel's base facing is "+X forward" for A and
  // "−X forward" for B, so the yaw we return is (angle-to-opponent − base).
  const angA = Math.atan2(bx - ax, bz - az);
  const angB = Math.atan2(ax - bx, az - bz);

  const aPresses = pressureA > pressureB + .12;
  const bPresses = pressureB > pressureA + .12;
  const directionA = Math.sin(t * .29) > 0 ? "CIRCLE_LEFT" : "CIRCLE_RIGHT";
  const directionB = directionA === "CIRCLE_LEFT" ? "CIRCLE_RIGHT" : "CIRCLE_LEFT";
  const intentA: NeutralIntent = reset > .15 ? "RESET" : aPresses ? "PRESSURE" : bPresses ? "YIELD" : Math.sin(t * .43) > .68 ? "STALK" : directionA;
  const intentB: NeutralIntent = reset > .15 ? "RESET" : bPresses ? "PRESSURE" : aPresses ? "YIELD" : Math.cos(t * .43) > .68 ? "STALK" : directionB;
  return {
    a: { x: ax, z: az },
    b: { x: bx, z: bz },
    yawA: angA - Math.PI / 2,
    yawB: angB + Math.PI / 2,
    preferredA,
    preferredB,
    distanceBandA: distanceBand(preferredA),
    distanceBandB: distanceBand(preferredB),
    intentA,
    intentB,
    pressureA,
    pressureB,
  };
}
