/**
 * Attack animations. Each is authored "from rest" but layers in a combat
 * stance (eased in/out at the clip edges) so a blend from `ready` doesn't pop
 * through the T-pose. The attack leg is the RIGHT leg by convention (both
 * fighters face inward). Amplitudes are pre-gain; genetics scale them.
 *
 * Shared phase map (fraction of duration) — kept so BattleCanvas's IMPACT_AT
 * still lines up with the strike regardless of clip length:
 *   windup/load ~0.00–0.30 · leap/release ~0.30–0.60 · strike ~0.52–0.72 ·
 *   recoil ~0.70–0.84 · recover ~0.84–1.00
 */

import { bell, clamp01, easeIn, easeOut, easeOutBack, smoothstep } from "../math";
import { add, addPair, type AnimContext, type PoseMap } from "../types";
import { combatBase, inOutWindow, inward, wingRaise, wingSpread } from "./helpers";

/** Normalized progress within [a,b], clamped to 0..1 outside. */
function seg(t: number, a: number, b: number): number {
  return clamp01((t - a) / (b - a));
}

function base(t: number, ctx: AnimContext, out: PoseMap): void {
  combatBase(out, inOutWindow(t, 0.12), ctx.gains.headThrow);
}

// ---------------------------------------------------------------------------

/** PECK — sharp head-first jab: pull back, accelerate in, contact ~0.5, snap back. */
export function peckAttack(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const g = ctx.gains.headThrow;
  const inn = inward(ctx);

  if (t < 0.25) {
    const p = easeOut(seg(t, 0, 0.25));
    add(out, "Neck", { rx: -0.35 * p * g });
    add(out, "Head", { rx: -0.15 * p * g });
    add(out, "Chest", { rx: -0.06 * p });
    add(out, "Hips", { px: inn * 0.02 * p });
  } else if (t < 0.6) {
    const p = easeIn(seg(t, 0.25, 0.6));
    add(out, "Neck", { rx: (-0.35 + 0.9 * (1 + 0.35) * p) * g });
    add(out, "Head", { rx: (-0.15 + 0.45 * p) * g });
    add(out, "Chest", { rx: 0.15 * p });
    add(out, "Spine", { rx: 0.08 * p });
    add(out, "Hips", { px: inn * (0.02 + 0.03 * p) });
    add(out, "Tail", { rx: -0.1 * p });
  } else if (t < 0.8) {
    const p = easeOutBack(seg(t, 0.6, 0.8));
    add(out, "Neck", { rx: (0.9 * 1.35 * (1 - p) - 0.12 * p) * g });
    add(out, "Head", { rx: (0.3 * (1 - p) - 0.1 * p) * g });
    add(out, "Chest", { rx: 0.15 * (1 - p) });
    add(out, "Spine", { rx: 0.08 * (1 - p) });
  } else {
    const p = smoothstep(seg(t, 0.8, 1));
    add(out, "Neck", { rx: -0.12 * (1 - p) * g });
    add(out, "Head", { rx: -0.1 * (1 - p) * g });
  }
}

// ---------------------------------------------------------------------------

/** QUICK KICK — weight shift, support bends, attack leg raises then snaps out, retract. */
export function quickKick(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const k = ctx.gains.kickReach;
  const w = ctx.gains.wingForce;
  const inn = inward(ctx);

  // Weight onto the support (left) leg for the whole active window.
  const load = bell(seg(t, 0, 0.85));
  add(out, "ThighL", { rx: 0.32 * load });
  add(out, "ShankL", { rx: 0.5 * load });
  add(out, "Hips", { px: -inn * 0.02 * load, py: -0.02 * load, rz: inn * 0.05 * load });

  let thighR = 0;
  let shankR = 0;
  if (t < 0.3) {
    const p = easeOut(seg(t, 0, 0.3));
    thighR = 0.45 * p; // knee lifts
    shankR = 0.6 * p; // calf folded, cocked
  } else if (t < 0.62) {
    const p = easeOut(seg(t, 0.3, 0.62));
    thighR = 0.45 + 0.35 * p; // drive up/forward
    shankR = 0.6 * (1 - p); // snap straight → the kick
  } else if (t < 0.8) {
    const p = seg(t, 0.62, 0.8);
    thighR = (0.8) * (1 - easeOut(p) * 0.6);
    shankR = 0.15 * easeOut(p);
  } else {
    const p = smoothstep(seg(t, 0.8, 1));
    thighR = 0.32 * (1 - p);
    shankR = 0.15 * (1 - p);
  }
  add(out, "ThighR", { rx: thighR * k });
  add(out, "ShankR", { rx: shankR * k });
  add(out, "FootR", { rx: -shankR * 0.5 });

  // Chest slight forward, tail up as counterweight, wings flare opposite the kick.
  add(out, "Chest", { rx: 0.08 * load });
  add(out, "Tail", { rx: 0.28 * load * ctx.gains.tailCounter });
  add(out, "WingL", { rz: -0.45 * load * w });
  add(out, "WingR", { rz: 0.25 * load * w });
  add(out, "Head", { rx: 0.05 * load });
}

// ---------------------------------------------------------------------------

/** HEAVY KICK — deep load, body winds away then whips through, huge extension, follow-through. */
export function heavyKick(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const k = ctx.gains.kickReach;
  const inn = inward(ctx);
  const iner = ctx.gains.inertia;

  // LOAD 0.00–0.30: deep weight shift, body rotates AWAY from the target.
  const loadP = easeOut(seg(t, 0, 0.3));
  // RELEASE 0.30–0.62: unwind hard.
  const relP = easeIn(seg(t, 0.3, 0.62));
  // IMPACT 0.62–0.70 + RECOIL 0.70–0.84.
  const recoil = seg(t, 0.7, 0.84);
  const recover = smoothstep(seg(t, 0.84, 1));

  const active = 1 - recover;
  // Hip twist: -away during load, whip +through during release, small overshoot.
  const hipYaw = (-0.35 * loadP + 0.7 * relP) * inn - easeOutBack(recoil) * 0.12 * inn;
  add(out, "Hips", {
    ry: hipYaw * active,
    py: (-0.06 * loadP + 0.02 * relP) * active,
    px: (-inn * 0.03 * loadP) * active,
    rz: inn * 0.08 * loadP * active,
  });
  add(out, "Spine", { ry: -hipYaw * 0.35 * active, rx: (0.05 + 0.2 * relP) * active });
  add(out, "Chest", { rx: (-0.1 * loadP + 0.15 * relP) * active });

  // Support leg (left) sinks deep on the load.
  add(out, "ThighL", { rx: (0.5 * loadP) * active });
  add(out, "ShankL", { rx: (0.8 * loadP) * active });
  add(out, "FootL", { rx: -0.4 * loadP * active });

  // Attack leg (right): cocked back during load, enormous extension on release.
  const thighR = (-0.2 * loadP + 1.0 * relP) - recoil * 0.5;
  const shankR = (0.7 * loadP) * (1 - relP) + relP * 0.1;
  add(out, "ThighR", { rx: thighR * k * active + (recover ? 0 : 0) });
  add(out, "ShankR", { rx: shankR * k * active });
  add(out, "FootR", { rx: -shankR * 0.5 * active });

  // Wings: sweep back on load, thrown forward on the follow-through.
  const wing = -0.5 * loadP + 0.6 * relP;
  add(out, "WingL", { rz: -wing * ctx.gains.wingForce * active });
  add(out, "WingR", { rz: wing * ctx.gains.wingForce * active });

  // Tail fans for counterbalance, head/neck track the target through the turn.
  add(out, "Tail", { rx: (0.4 * loadP + 0.2 * relP) * ctx.gains.tailCounter * active });
  add(out, "Neck", { rx: (0.1 + 0.15 * relP) * ctx.gains.headThrow * active, ry: -hipYaw * 0.5 * active });
  add(out, "Head", { rx: -0.05 * active, ry: -hipYaw * 0.3 * active });

  // Heavier birds hold the follow-through longer (inertia) — a touch of extra lean lingering.
  if (recover > 0 && recover < 1) {
    add(out, "Spine", { rx: 0.12 * (1 - recover) * (iner - 0.9) });
  }
}

// ---------------------------------------------------------------------------

/** WING STRIKE — one wing opens & accelerates through, torso rotates in, off-wing tucks. */
export function wingStrike(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const w = ctx.gains.wingForce;
  const inn = inward(ctx);

  const openP = easeOut(seg(t, 0, 0.32));
  const swingP = easeIn(seg(t, 0.32, 0.56));
  const followP = seg(t, 0.56, 0.78);
  const recover = smoothstep(seg(t, 0.78, 1));
  const active = 1 - recover;

  // Strike wing (right): open wide, then whip forward through contact.
  const strikeWing = (1.1 * openP + 0.5 * swingP - 1.2 * followP) * active;
  add(out, "WingR", { rz: strikeWing * w, rx: (0.3 * openP + 0.5 * swingP) * active, ry: -swingP * 0.4 * active });
  // Off wing tucks for balance.
  add(out, "WingL", { rz: -(0.3 + 0.2 * swingP) * w * active });

  // Torso rotates into the swing, unwinds on the follow-through.
  const twist = (0.1 * openP + 0.35 * swingP - 0.15 * followP) * inn * active;
  add(out, "Hips", { ry: twist, rz: twist * 0.4 });
  add(out, "Spine", { ry: twist * 0.6, rx: 0.06 * swingP * active });
  add(out, "Chest", { ry: twist * 0.4, rx: -0.05 * openP * active });

  // Neck/head lead the rotation; tail counter-rotates.
  add(out, "Neck", { ry: twist * 0.5, rx: 0.08 * swingP * ctx.gains.headThrow * active });
  add(out, "Head", { ry: twist * 0.4 });
  add(out, "Tail", { ry: -twist * 1.3 * ctx.gains.tailCounter, rx: 0.2 * swingP * active });

  // A small brace step on the near leg.
  add(out, "ThighR", { rx: 0.15 * swingP * active });
  add(out, "ShankL", { rx: 0.2 * swingP * active });
}

// ---------------------------------------------------------------------------

/** JUMP ATTACK — crouch, launch, airborne strike, descend, absorbed landing. Root Y is BattleCanvas's. */
export function jumpAttack(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const k = ctx.gains.kickReach;

  if (t < 0.22) {
    // Crouch — compress both legs.
    const p = easeOut(seg(t, 0, 0.22));
    addPair(out, "Thigh", { rx: 0.5 * p });
    addPair(out, "Shank", { rx: 0.9 * p });
    add(out, "Hips", { py: -0.06 * p });
    add(out, "Spine", { rx: 0.1 * p });
    wingRaise(out, -0.2 * p * ctx.gains.wingForce);
  } else if (t < 0.45) {
    // Launch — legs extend hard, wings snap down for lift.
    const p = easeIn(seg(t, 0.22, 0.45));
    addPair(out, "Thigh", { rx: 0.5 * (1 - p) - 0.15 * p });
    addPair(out, "Shank", { rx: 0.9 * (1 - p) });
    add(out, "Hips", { py: -0.06 * (1 - p) });
    add(out, "Spine", { rx: 0.1 * (1 - p) - 0.05 * p });
    wingRaise(out, (-0.2 + 0.9 * p) * ctx.gains.wingForce);
  } else if (t < 0.7) {
    // Airborne — legs tuck then strike out, chest forward, wings hold spread.
    const p = seg(t, 0.45, 0.7);
    const tuck = bell(p);
    addPair(out, "Thigh", { rx: 0.6 * tuck - 0.4 * easeIn(p) });
    addPair(out, "Shank", { rx: 0.7 * tuck });
    add(out, "ThighR", { rx: 0.5 * easeIn(p) * k });
    add(out, "ShankR", { rx: -0.3 * easeIn(p) * k });
    add(out, "Spine", { rx: 0.2 * easeIn(p) });
    add(out, "Chest", { rx: 0.15 * easeIn(p) });
    wingSpread(out, 0.6 * ctx.gains.wingForce);
    add(out, "Head", { rx: 0.1 * p });
    add(out, "Tail", { rx: -0.2 * p * ctx.gains.tailCounter });
  } else if (t < 0.86) {
    // Descend — legs reach for the ground, wings ease back.
    const p = seg(t, 0.7, 0.86);
    addPair(out, "Thigh", { rx: -0.4 * (1 - p) + 0.2 * p });
    addPair(out, "Shank", { rx: 0.2 * p });
    wingSpread(out, 0.6 * (1 - p) * ctx.gains.wingForce);
    add(out, "Spine", { rx: 0.2 * (1 - p) });
  } else {
    // Landing — deep knee-bend absorb, then settle.
    const p = seg(t, 0.86, 1);
    const absorb = bell(p);
    addPair(out, "Thigh", { rx: 0.55 * absorb });
    addPair(out, "Shank", { rx: 0.85 * absorb });
    add(out, "Hips", { py: -0.07 * absorb });
    add(out, "Spine", { rx: 0.12 * absorb });
    wingRaise(out, 0.25 * absorb * ctx.gains.wingForce);
  }
}

// ---------------------------------------------------------------------------

/** FLYING KICK — bigger everything: deep load, both legs extend in a superman line, hard plant. */
export function flyingKick(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const k = ctx.gains.kickReach;
  const inn = inward(ctx);

  if (t < 0.25) {
    const p = easeOut(seg(t, 0, 0.25));
    addPair(out, "Thigh", { rx: 0.65 * p });
    addPair(out, "Shank", { rx: 1.1 * p });
    add(out, "Hips", { py: -0.08 * p, rx: 0.12 * p });
    add(out, "Spine", { rx: 0.14 * p });
    wingRaise(out, -0.3 * p * ctx.gains.wingForce);
    add(out, "Head", { rx: 0.12 * p });
  } else if (t < 0.5) {
    // Launch + start of the airborne rotation (roll carried by FighterAnim).
    const p = easeIn(seg(t, 0.25, 0.5));
    addPair(out, "Thigh", { rx: 0.65 * (1 - p) });
    addPair(out, "Shank", { rx: 1.1 * (1 - p) });
    add(out, "Spine", { rx: 0.14 - 0.24 * p });
    wingSpread(out, (0.3 + 0.6 * p) * ctx.gains.wingForce);
    add(out, "Hips", { py: -0.08 * (1 - p) });
  } else if (t < 0.72) {
    // Extension — BOTH legs snap out together, whole body a straight line.
    const p = easeOut(seg(t, 0.5, 0.72));
    addPair(out, "Thigh", { rx: -0.55 * p * k });
    addPair(out, "Shank", { rx: -0.3 * p * k });
    add(out, "Spine", { rx: -0.15 * p });
    add(out, "Chest", { rx: -0.1 * p });
    add(out, "Neck", { rx: -0.2 * p * ctx.gains.headThrow });
    add(out, "Head", { rx: 0.25 * p * ctx.gains.headThrow }); // snap toward target
    wingSpread(out, 0.8 * ctx.gains.wingForce);
    add(out, "Tail", { rx: -0.3 * p * ctx.gains.tailCounter });
  } else if (t < 0.86) {
    // Recoil + descend.
    const p = seg(t, 0.72, 0.86);
    addPair(out, "Thigh", { rx: -0.55 * (1 - p) * k + 0.3 * p });
    add(out, "Spine", { rx: -0.15 * (1 - p) });
    wingSpread(out, 0.8 * (1 - p) * ctx.gains.wingForce);
  } else {
    // Hard single-leg (right) plant, left trails, knee absorbs.
    const p = seg(t, 0.86, 1);
    const absorb = bell(p);
    add(out, "ThighR", { rx: 0.6 * absorb });
    add(out, "ShankR", { rx: 0.95 * absorb });
    add(out, "ThighL", { rx: -0.3 * absorb });
    add(out, "Hips", { py: -0.09 * absorb, rz: inn * 0.06 * absorb });
    add(out, "Spine", { rx: 0.16 * absorb });
    wingRaise(out, 0.3 * absorb * ctx.gains.wingForce);
  }
}

// ---------------------------------------------------------------------------

/** DOUBLE KICK — right leg, hip re-orient, left leg from a different body angle, recover. */
export function doubleKick(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const k = ctx.gains.kickReach;
  const inn = inward(ctx);

  // Kick 1 — right leg, 0.00–0.40.
  if (t < 0.4) {
    const cock = easeOut(seg(t, 0, 0.18));
    const fire = easeOut(seg(t, 0.18, 0.4));
    add(out, "ThighR", { rx: (0.5 * cock + 0.5 * fire) * k });
    add(out, "ShankR", { rx: (0.7 * cock) * (1 - fire) * k });
    add(out, "ThighL", { rx: 0.3 * (cock + fire) * 0.5 });
    add(out, "ShankL", { rx: 0.4 * (cock + fire) * 0.5 });
    add(out, "Hips", { ry: inn * 0.1 * fire, rz: inn * 0.05 * (cock + fire) * 0.5 });
    add(out, "WingL", { rz: -0.35 * (cock + fire) * 0.5 * ctx.gains.wingForce });
    add(out, "Tail", { rx: 0.25 * fire * ctx.gains.tailCounter });
  } else if (t < 0.55) {
    // Weight transfer + hip flip to the other orientation.
    const p = smoothstep(seg(t, 0.4, 0.55));
    add(out, "ThighR", { rx: 0.9 * (1 - p) * k });
    add(out, "Hips", { ry: inn * (0.1 - 0.35 * p), rz: inn * (0.05 - 0.12 * p) });
    add(out, "Spine", { ry: inn * 0.15 * p });
    add(out, "ThighL", { rx: 0.15 + 0.3 * p });
  } else if (t < 0.85) {
    // Kick 2 — left leg, body now turned the other way.
    const cock = easeOut(seg(t, 0.55, 0.68));
    const fire = easeOut(seg(t, 0.68, 0.85));
    add(out, "ThighL", { rx: (0.45 + 0.5 * cock + 0.5 * fire) * k });
    add(out, "ShankL", { rx: (0.7 * cock) * (1 - fire) * k });
    add(out, "Hips", { ry: -inn * (0.25 - 0.1 * fire), rz: -inn * 0.08 });
    add(out, "Spine", { ry: inn * 0.15 * (1 - fire) });
    add(out, "ThighR", { rx: 0.3 * (1 - fire) });
    add(out, "WingR", { rz: 0.35 * (cock + fire) * 0.5 * ctx.gains.wingForce });
    add(out, "Tail", { rx: 0.25 * fire * ctx.gains.tailCounter, ry: inn * 0.15 });
  } else {
    const p = smoothstep(seg(t, 0.85, 1));
    add(out, "ThighL", { rx: 0.9 * (1 - p) * k });
    add(out, "Hips", { ry: -inn * 0.15 * (1 - p) });
  }
}

// ---------------------------------------------------------------------------

/** CHARGE ATTACK — lower, forward lean, driving run, then rise into a body slam. */
export function chargeAttack(t: number, ctx: AnimContext, out: PoseMap): void {
  base(t, ctx, out);
  const inn = inward(ctx);

  if (t < 0.25) {
    // Prep — body lowers and leans forward, wings tighten.
    const p = easeOut(seg(t, 0, 0.25));
    add(out, "Hips", { py: -0.06 * p });
    add(out, "Spine", { rx: 0.15 * p });
    add(out, "Chest", { rx: 0.1 * p });
    add(out, "Head", { rx: 0.1 * p });
    wingRaise(out, -0.15 * p * ctx.gains.wingForce);
  } else if (t < 0.55) {
    // Accelerate — low driving stride, alternating hard leg drive, head down.
    const p = seg(t, 0.25, 0.55);
    const stride = Math.sin(p * Math.PI * 4);
    add(out, "Hips", { py: -0.05, rx: 0.04, ry: stride * 0.05 });
    add(out, "Spine", { rx: 0.18 });
    add(out, "Chest", { rx: 0.12 });
    add(out, "Head", { rx: 0.12 });
    add(out, "ThighL", { rx: stride * 0.55 * ctx.gains.kickReach });
    add(out, "ThighR", { rx: -stride * 0.55 * ctx.gains.kickReach });
    add(out, "ShankL", { rx: Math.max(0, stride) * 0.6 });
    add(out, "ShankR", { rx: Math.max(0, -stride) * 0.6 });
    wingRaise(out, -0.1 * ctx.gains.wingForce);
    add(out, "Tail", { rx: -0.1 * ctx.gains.tailCounter });
  } else if (t < 0.75) {
    // Attack — rise, wings throw forward, chest slams through.
    const p = easeOut(seg(t, 0.55, 0.75));
    add(out, "Hips", { py: -0.05 * (1 - p) + 0.02 * p });
    add(out, "Spine", { rx: 0.18 * (1 - p) - 0.08 * p });
    add(out, "Chest", { rx: 0.12 + 0.15 * p });
    add(out, "Neck", { rx: -0.1 * p * ctx.gains.headThrow });
    add(out, "Head", { rx: 0.12 * (1 - p) - 0.1 * p });
    const wing = 0.7 * p;
    add(out, "WingL", { rz: -wing * ctx.gains.wingForce, rx: wing * 0.3 });
    add(out, "WingR", { rz: wing * ctx.gains.wingForce, rx: wing * 0.3 });
    add(out, "ThighR", { rx: 0.2 * p });
  } else {
    // Follow-through → recover.
    const p = smoothstep(seg(t, 0.75, 1));
    add(out, "Chest", { rx: 0.27 * (1 - p) });
    add(out, "Spine", { rx: -0.08 * (1 - p) });
    const wing = 0.7 * (1 - p);
    add(out, "WingL", { rz: -wing * ctx.gains.wingForce });
    add(out, "WingR", { rz: wing * ctx.gains.wingForce });
    add(out, "Head", { rx: -0.1 * (1 - p), ry: inn * 0.05 * (1 - p) });
  }
}
