/**
 * Hit reactions, played on the DEFENDER at impact. The hit pushes the bird
 * away from the attacker — i.e. "outward" from ring centre, which is
 * `-inward(ctx)`. The controller also kicks the recoil springs on entry, so
 * these functions supply the readable base shape and the springs add the
 * organic settle on top.
 */

import { bell, easeIn, easeOut, smoothstep } from "../math";
import { add, type AnimContext, type PoseMap } from "../types";
import { combatBase, inOutWindow, inward, wingSpread } from "./helpers";

function base(t: number, ctx: AnimContext, out: PoseMap): void {
  combatBase(out, inOutWindow(t, 0.15), ctx.gains.headThrow);
}

/** HIT LIGHT — a flinch: small head/chest recoil, one wing twitch, quick recover. */
export function hitLight(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const away = -inward(ctx);
  const b = bell(t);
  add(out, "Head", { rx: -b * 0.22 * ctx.gains.headThrow, ry: away * b * 0.12 });
  add(out, "Neck", { rx: -b * 0.1 * ctx.gains.headThrow });
  add(out, "Chest", { rx: -b * 0.07 });
  add(out, "WingR", { rz: b * 0.3 * ctx.gains.wingForce });
}

/** HIT MEDIUM — head recoil + twist, neck & body rotate, both wings react, weight to the back foot. */
export function hitMedium(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const away = -inward(ctx);
  const hit = easeOut(Math.min(1, t / 0.3));
  const settle = smoothstep(Math.max(0, (t - 0.3) / 0.7));
  const amp = hit * (1 - settle);

  add(out, "Head", { rx: -0.5 * amp * ctx.gains.headThrow, ry: away * 0.3 * amp });
  add(out, "Neck", { rx: -0.22 * amp * ctx.gains.headThrow, ry: away * 0.15 * amp });
  add(out, "Spine", { ry: away * 0.15 * amp, rx: -0.08 * amp });
  add(out, "Hips", { ry: away * 0.12 * amp, px: away * 0.02 * amp });
  add(out, "WingL", { rz: -0.35 * amp * ctx.gains.wingForce });
  add(out, "WingR", { rz: 0.45 * amp * ctx.gains.wingForce });
  // Weight onto the back (away-side) leg.
  add(out, "ThighL", { rx: 0.2 * amp });
  add(out, "ShankL", { rx: 0.28 * amp });
  add(out, "Tail", { rx: 0.15 * amp * ctx.gains.tailCounter });
  // Small over-settle the other way.
  if (settle > 0.4) add(out, "Head", { rx: 0.06 * bell((settle - 0.4) / 0.6) * ctx.gains.headThrow });
}

/** HIT HEAVY — head snaps back, neck & torso recoil, wings spread, support leg buckles then catches. */
export function hitHeavy(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const away = -inward(ctx);
  const snap = easeIn(Math.min(1, t / 0.22));
  const hold = Math.max(0, 1 - Math.max(0, (t - 0.22) / 0.4));
  const recover = smoothstep(Math.max(0, (t - 0.62) / 0.38));
  const amp = snap * hold * (1 - recover) + (1 - recover) * 0.15 * (t > 0.22 ? 1 : 0);

  add(out, "Head", { rx: -0.9 * amp * ctx.gains.headThrow, ry: away * 0.4 * amp, rz: away * 0.2 * amp });
  add(out, "Neck", { rx: -0.4 * amp * ctx.gains.headThrow, ry: away * 0.2 * amp });
  add(out, "Chest", { rx: -0.18 * amp });
  add(out, "Spine", { ry: away * 0.3 * amp, rx: -0.12 * amp });
  add(out, "Hips", { ry: away * 0.22 * amp, rz: away * 0.14 * amp, px: away * 0.03 * amp });
  wingSpread(out, 0.7 * amp * ctx.gains.wingForce);

  // Support (toward-attacker) leg buckles, then a corrective catch.
  const buckle = bell(Math.min(1, t / 0.5));
  add(out, "ThighR", { rx: 0.35 * buckle });
  add(out, "ShankR", { rx: 0.55 * buckle });
  add(out, "ThighL", { rx: -0.15 * buckle });
  add(out, "Tail", { rx: 0.3 * amp * ctx.gains.tailCounter, ry: away * 0.2 * amp });
}

/** HIT CRITICAL — everything in hit-heavy, larger, with a balance-loss leg lift and a long recover. */
export function hitCritical(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const away = -inward(ctx);
  const snap = easeIn(Math.min(1, t / 0.2));
  const recover = smoothstep(Math.max(0, (t - 0.55) / 0.45));
  const amp = snap * (1 - recover);

  add(out, "Head", { rx: -1.2 * amp * ctx.gains.headThrow, ry: away * 0.5 * amp, rz: away * 0.35 * amp });
  add(out, "Neck", { rx: -0.55 * amp * ctx.gains.headThrow, ry: away * 0.3 * amp });
  add(out, "Chest", { rx: -0.25 * amp });
  add(out, "Spine", { ry: away * 0.5 * amp, rx: -0.2 * amp, rz: away * 0.15 * amp });
  add(out, "Hips", { ry: away * 0.35 * amp, rz: away * 0.28 * amp, px: away * 0.05 * amp });
  wingSpread(out, 1.0 * amp * ctx.gains.wingForce);

  // One leg lifts off — balance genuinely lost.
  const lift = bell(Math.min(1, t / 0.6));
  add(out, "ThighR", { rx: -0.45 * lift * ctx.gains.kickReach });
  add(out, "ShankR", { rx: 0.4 * lift });
  add(out, "ThighL", { rx: 0.3 * lift });
  add(out, "ShankL", { rx: 0.45 * lift });
  add(out, "Tail", { rx: 0.45 * amp * ctx.gains.tailCounter, ry: away * 0.3 * amp });
  add(out, "Head", { rx: 0.1 * recover * bell(recover) * ctx.gains.headThrow });
}

/**
 * STAGGER — a genuine fight to stay upright: impact tilt → over-correction the
 * other way → a corrective step (one leg swings out and plants, weight shifts
 * over it) → wings spread → head stabilizes → settle with a decaying wobble.
 */
export function stagger(t: number, ctx: AnimContext, out: PoseMap): void {
  staggerImpl(t, ctx, out, 1);
}

/** STAGGER HEAVY — deeper wobble, a second corrective step. */
export function staggerHeavy(t: number, ctx: AnimContext, out: PoseMap): void {
  staggerImpl(t, ctx, out, 1.6);
}

function staggerImpl(t: number, ctx: AnimContext, out: PoseMap, scale: number): void {
  base(t, ctx, out);
  const away = -inward(ctx);
  const g = ctx.gains;

  // Phase 1 (0–0.2) impact tilt outward. Phase 2 (0.2–0.4) over-correct inward.
  // Phase 3 (0.35–0.7) corrective step. Phase 4 (0.6–1) settle wobble.
  const tilt =
    (t < 0.2 ? easeOut(t / 0.2) : t < 0.45 ? 1 - 1.8 * easeInOutLocal((t - 0.2) / 0.25) : 0) * scale;
  add(out, "Hips", { rz: away * 0.16 * tilt, ry: away * 0.1 * tilt, px: away * 0.03 * tilt });
  add(out, "Spine", { rz: away * 0.1 * tilt, rx: -0.06 * Math.abs(tilt) });

  // Corrective step: the outward leg swings wide and plants, body moves over it.
  if (t > 0.3 && t < 0.75) {
    const s = bell((t - 0.3) / 0.45);
    const stepLeg = away > 0 ? "ThighR" : "ThighL";
    const stepShank = away > 0 ? "ShankR" : "ShankL";
    add(out, stepLeg as "ThighR", { rx: -0.1 * s, ry: away * 0.3 * s });
    add(out, stepShank as "ShankR", { rx: 0.4 * s });
    add(out, "Hips", { px: away * 0.04 * s * scale });
  }
  // Second step for the heavy variant.
  if (scale > 1.3 && t > 0.6 && t < 0.95) {
    const s = bell((t - 0.6) / 0.35);
    const stepLeg = away > 0 ? "ThighL" : "ThighR";
    add(out, stepLeg as "ThighL", { rx: -0.08 * s, ry: -away * 0.2 * s });
  }

  // Wings out for balance the whole time, tapering as it settles.
  const balance = bell(Math.min(1, t / 0.85));
  wingSpread(out, 0.5 * balance * scale * g.wingForce);

  // Head stabilizes — counter the hip tilt so the gaze stays roughly on the opponent.
  add(out, "Head", { rz: -away * 0.12 * tilt, rx: -0.05 * Math.abs(tilt) * g.headThrow });
  add(out, "Neck", { rz: -away * 0.06 * tilt });

  // Decaying wobble on the settle.
  if (t > 0.55) {
    const decay = 1 - (t - 0.55) / 0.45;
    add(out, "Hips", { rz: Math.sin((t - 0.55) * 40) * 0.04 * decay * scale });
  }
  add(out, "Tail", { rx: 0.2 * balance * g.tailCounter, ry: away * 0.15 * tilt * g.tailCounter });
}

function easeInOutLocal(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
