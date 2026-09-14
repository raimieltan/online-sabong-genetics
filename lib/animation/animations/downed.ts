/**
 * Knockback / knockdown / getup / death.
 *
 * World-space displacement and the body topple are Rapier's job
 * (ChickenPhysicsRig.applyKnockback). These functions only pose the BODY's
 * reaction on top of the toppling rigid body — limbs going limp, torso
 * curling, wings splaying — so hip rotations stay modest (no baked 90° fall).
 * `knockdown` and `death` hold their final pose (the controller keeps feeding
 * t≈1) until released.
 */

import { bell, clamp01, easeIn, easeOut, smoothstep } from "../math";
import { add, addPair, type AnimContext, type PoseMap } from "../types";
import { combatBase, inOutWindow, inward, wingSpread } from "./helpers";

/** KNOCKBACK — torso/head recoil + wing spread + a braced back leg, then spring back to stance. */
export function knockback(t: number, ctx: AnimContext, out: PoseMap): void {
  combatBase(out, inOutWindow(t, 0.12), ctx.gains.headThrow);
  const away = -inward(ctx);
  const hit = easeOut(Math.min(1, t / 0.25));
  const recover = smoothstep(Math.max(0, (t - 0.35) / 0.65));
  const amp = hit * (1 - recover);

  add(out, "Spine", { rx: -0.25 * amp, ry: away * 0.15 * amp });
  add(out, "Chest", { rx: -0.15 * amp });
  add(out, "Neck", { rx: -0.3 * amp * ctx.gains.headThrow });
  add(out, "Head", { rx: -0.4 * amp * ctx.gains.headThrow, ry: away * 0.2 * amp });
  wingSpread(out, 0.8 * amp * ctx.gains.wingForce);
  // Rear leg braces back against the shove; front leg gives a little.
  add(out, "ThighL", { rx: -0.3 * amp });
  add(out, "ShankL", { rx: 0.3 * amp });
  add(out, "ThighR", { rx: 0.2 * amp });
  add(out, "Tail", { rx: 0.35 * amp * ctx.gains.tailCounter });
}

/**
 * KNOCKDOWN — balance lost, legs collapse, wings splay to break the fall,
 * head/neck whip then go slack. Settles into a stable grounded curl held until
 * GETUP. (The rigid body is simultaneously toppling under Rapier.)
 */
export function knockdown(tRaw: number, ctx: AnimContext, out: PoseMap): void {
  const t = clamp01(tRaw);
  const g = ctx.gains;
  const away = -inward(ctx);

  // Fade the standing combat base out over the first third — the bird is going down.
  combatBase(out, Math.max(0, 1 - t / 0.35) * 0.7, g.headThrow);

  // 0.00–0.30 balance lost: arms/wings flail, one leg lifts.
  if (t < 0.35) {
    const p = easeOut(t / 0.35);
    wingSpread(out, 1.1 * p * g.wingForce);
    add(out, "ThighR", { rx: -0.5 * p * g.kickReach });
    add(out, "ShankR", { rx: 0.6 * p });
    add(out, "Hips", { rz: away * 0.25 * p, ry: away * 0.15 * p });
    add(out, "Head", { rx: -0.5 * p * g.headThrow, rz: away * 0.3 * p });
    add(out, "Neck", { rx: -0.3 * p * g.headThrow });
  }

  // 0.20–0.65 collapse: thighs fold under, shanks tuck, torso curls.
  const collapse = smoothstep(clamp01((t - 0.2) / 0.45));
  addPair(out, "Thigh", { rx: 0.9 * collapse });
  addPair(out, "Shank", { rx: 1.2 * collapse });
  add(out, "Hips", { rx: 0.3 * collapse, py: -0.08 * collapse });
  add(out, "Spine", { rx: 0.35 * collapse });
  add(out, "Chest", { rx: 0.25 * collapse });

  // 0.45–0.8 head/neck whip then slack.
  const whip = bell(clamp01((t - 0.4) / 0.35));
  add(out, "Neck", { rx: (0.4 * collapse - 0.5 * whip) * g.headThrow });
  add(out, "Head", { rx: (0.5 * collapse - 0.3 * whip) * g.headThrow, ry: away * 0.2 * whip });

  // Wings settle half-open against the ground.
  const wingSettle = smoothstep(clamp01((t - 0.5) / 0.5));
  wingSpread(out, (1.1 * (1 - wingSettle) + 0.4 * wingSettle) * g.wingForce * Math.max(collapse, t < 0.35 ? 1 : collapse));
  add(out, "Tail", { rx: 0.4 * collapse * g.tailCounter, rz: away * 0.2 * collapse });
}

/**
 * GETUP — wings push off the ground, one leg gathers under, torso rises, the
 * other leg pushes up, a small over-balance forward, catch, resolve to stance.
 * Never snaps — everything eases.
 */
export function getup(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  // Start from the grounded curl, resolve into the combat base by the end.
  const grounded = Math.max(0, 1 - t / 0.85);
  combatBase(out, smoothstep(clamp01((t - 0.55) / 0.45)), g.headThrow);

  // Held-collapse residue fading out.
  addPair(out, "Thigh", { rx: 0.9 * grounded });
  addPair(out, "Shank", { rx: 1.2 * grounded });
  add(out, "Hips", { rx: 0.3 * grounded, py: -0.08 * grounded });
  add(out, "Spine", { rx: 0.35 * grounded });

  // 0.0–0.3 wings push against the ground.
  if (t < 0.35) {
    const p = bell(t / 0.35);
    add(out, "WingL", { rz: -0.6 * p * g.wingForce, rx: -0.3 * p });
    add(out, "WingR", { rz: 0.6 * p * g.wingForce, rx: -0.3 * p });
  }

  // 0.25–0.6 one leg (right) gathers under the body and plants.
  if (t > 0.25 && t < 0.7) {
    const p = easeInOutL((t - 0.25) / 0.45);
    add(out, "ThighR", { rx: (0.9 - 1.1 * p) * g.kickReach });
    add(out, "ShankR", { rx: (1.2 - 0.9 * p) });
    add(out, "FootR", { rx: -0.3 * p });
  }

  // 0.4–0.85 torso rises, second leg pushes up.
  const rise = smoothstep(clamp01((t - 0.4) / 0.45));
  add(out, "Spine", { rx: -0.35 * rise * (1 - 0) });
  add(out, "Hips", { rx: -0.3 * rise, py: 0.06 * rise });
  add(out, "ThighL", { rx: (0.9 - 0.8 * rise) * g.kickReach });
  add(out, "ShankL", { rx: (1.2 - 1.0 * rise) });

  // 0.7–0.9 small forward over-balance, then catch.
  if (t > 0.68) {
    const ob = bell((t - 0.68) / 0.32);
    add(out, "Spine", { rx: 0.12 * ob });
    add(out, "Head", { rx: 0.15 * ob * g.headThrow });
    add(out, "ThighR", { rx: 0.15 * ob });
  }
}

/**
 * DEATH — a limp collapse: final flinch, legs give out (no bracing), wings
 * fall open loosely, neck/head drop, everything eases to a slack pose with NO
 * spring return. Holds the final pose. Breathing layer is disabled by the
 * controller for this state.
 */
export function death(tRaw: number, ctx: AnimContext, out: PoseMap): void {
  const t = clamp01(tRaw);
  const g = ctx.gains;
  const away = -inward(ctx);

  // Standing base fades fast.
  combatBase(out, Math.max(0, 1 - t / 0.25) * 0.6, g.headThrow);

  // 0.0–0.15 final flinch.
  if (t < 0.2) {
    const p = bell(t / 0.2);
    add(out, "Head", { rx: -0.4 * p * g.headThrow, rz: away * 0.2 * p });
    add(out, "Chest", { rx: -0.12 * p });
    wingSpread(out, 0.5 * p * g.wingForce);
  }

  // 0.1–0.7 legs give out — thighs go slack forward, no catch, shanks loose.
  const give = easeIn(clamp01((t - 0.1) / 0.55));
  addPair(out, "Thigh", { rx: 0.7 * give });
  addPair(out, "Shank", { rx: 0.5 * give });
  add(out, "Hips", { py: -0.12 * give, rx: 0.25 * give, rz: away * 0.15 * give });

  // Torso folds loosely.
  const fold = easeOut(clamp01((t - 0.15) / 0.7));
  add(out, "Spine", { rx: 0.3 * fold, rz: away * 0.1 * fold });
  add(out, "Chest", { rx: 0.2 * fold });

  // Wings fall open and stay.
  const wing = easeOut(clamp01((t - 0.1) / 0.6));
  add(out, "WingL", { rz: -0.5 * wing * g.wingForce, rx: 0.2 * wing });
  add(out, "WingR", { rz: 0.5 * wing * g.wingForce, rx: 0.2 * wing });

  // Neck/head drop and stay slack — no recovery.
  const drop = easeIn(clamp01((t - 0.2) / 0.6));
  add(out, "Neck", { rx: 0.5 * drop * g.headThrow });
  add(out, "Head", { rx: 0.6 * drop * g.headThrow, ry: away * 0.15 * drop });
  add(out, "Tail", { rx: -0.1 * drop * g.tailCounter, rz: away * 0.15 * drop });
}

function easeInOutL(x: number): number {
  const c = clamp01(x);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}
