/**
 * Procedural walk / run cycles. `t` here is the CYCLE PHASE [0,1) — the
 * controller advances it from planar speed (not wall-clock) so foot speed
 * matches travel and the feet visually stick to the ground.
 *
 * Legs run in anti-phase. Each leg: swing half (foot off the ground, knee
 * bends, thigh drives forward) then stance half (leg straightens, plants,
 * pushes back under the body). Hips bob down on each footfall; head counter-
 * rotates the bob so it glides level; wings and tail counterbalance.
 */

import { TAU } from "../math";
import { add, type AnimContext, type PoseMap } from "../types";
import { combatBase, plantFeet, wingRaise } from "./helpers";

interface LegPose {
  thigh: number;
  shank: number;
  foot: number;
}

/** One leg's angles at cycle phase `ph` (0..1), amplitude scaled by `amp`. */
function legCycle(ph: number, amp: number): LegPose {
  const a = ph * TAU;
  // Thigh swings fore/aft roughly sinusoidally.
  const thigh = Math.sin(a) * amp;
  // Knee folds during the swing (front half of the cycle), stays near straight
  // through stance so the planted leg reads solid.
  const swing = Math.max(0, -Math.cos(a)); // 0 in stance, 1 at mid-swing
  const shank = swing * amp * 1.4;
  // Ankle keeps the sole level: opposes the shank fold, plus a toe-off flick
  // as the leg leaves the ground.
  const toeOff = Math.max(0, Math.sin(a - 0.6)) * (1 - swing);
  const foot = -shank * 0.5 + toeOff * amp * 0.6;
  return { thigh, shank, foot };
}

function locomotion(t: number, ctx: AnimContext, out: PoseMap, cfg: {
  thighAmp: number;
  bob: number;
  lean: number;
  hipYaw: number;
  wing: number;
  baseWeight: number;
}): void {
  const g = ctx.gains;
  combatBase(out, cfg.baseWeight, g.headThrow);

  const ph = ((t % 1) + 1) % 1;
  const left = legCycle(ph, cfg.thighAmp * g.kickReach);
  const right = legCycle((ph + 0.5) % 1, cfg.thighAmp * g.kickReach);

  add(out, "ThighL", { rx: left.thigh });
  add(out, "ShankL", { rx: left.shank });
  add(out, "ThighR", { rx: right.thigh });
  add(out, "ShankR", { rx: right.shank });
  plantFeet(out, left.shank, right.shank);
  add(out, "FootL", { rx: left.foot });
  add(out, "FootR", { rx: right.foot });

  // Two footfalls per cycle → bob at double frequency, down on each contact.
  const bob = -Math.abs(Math.sin(ph * TAU)) * cfg.bob * g.bob;
  add(out, "Hips", { py: bob, rx: cfg.lean });

  // Hip yaw/roll counter-rotation as weight passes over each leg.
  const hipTwist = Math.sin(ph * TAU) * cfg.hipYaw;
  add(out, "Hips", { ry: hipTwist, rz: hipTwist * 0.5 });
  add(out, "Spine", { rx: cfg.lean * 0.6, ry: -hipTwist * 0.4 });

  // Head stabilization — cancel most of the bob and yaw so the gaze holds.
  add(out, "Head", { rx: -bob * 1.1, ry: -hipTwist * 0.6 });
  add(out, "Neck", { rx: -bob * 0.5 });

  // Wing counterbalance, anti-phase to the leading leg.
  wingRaise(out, cfg.wing * g.wingForce);
  add(out, "WingL", { rz: -Math.sin(ph * TAU) * cfg.wing * 0.6 });
  add(out, "WingR", { rz: -Math.sin(ph * TAU) * cfg.wing * 0.6 });

  // Tail sway lagging the hips.
  add(out, "Tail", { ry: -hipTwist * 1.2 * g.tailCounter, rx: (0.05 + Math.abs(bob) * 2) * g.tailCounter });
}

export function walk(t: number, ctx: AnimContext, out: PoseMap): void {
  locomotion(t, ctx, out, {
    thighAmp: 0.5,
    bob: 0.02,
    lean: 0.04,
    hipYaw: 0.045,
    wing: 0.09,
    baseWeight: 0.5,
  });
}

export function run(t: number, ctx: AnimContext, out: PoseMap): void {
  locomotion(t, ctx, out, {
    thighAmp: 0.82,
    bob: 0.035,
    lean: 0.13,
    hipYaw: 0.06,
    wing: 0.22,
    baseWeight: 0.35,
  });
  // Extra forward drive on the torso and a streamed tail.
  add(out, "Spine", { rx: 0.06 });
  add(out, "Chest", { rx: 0.04 });
  add(out, "Tail", { rx: -0.15 * ctx.gains.tailCounter });
}

/** BACKSTEP — a quick hop back onto the rear foot; built for later use. */
export function backstep(t: number, ctx: AnimContext, out: PoseMap): void {
  combatBase(out, 1, ctx.gains.headThrow);
  const push = Math.sin(Math.min(1, t / 0.4) * Math.PI);
  add(out, "Hips", { py: -push * 0.03, rx: -push * 0.12 });
  add(out, "ThighL", { rx: push * 0.4 });
  add(out, "ThighR", { rx: -push * 0.25 });
  add(out, "ShankL", { rx: push * 0.5 });
  wingRaise(out, push * 0.25 * ctx.gains.wingForce);
  add(out, "Head", { rx: -push * 0.1 });
}
