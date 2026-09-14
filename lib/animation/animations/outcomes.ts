/**
 * End-of-fight states and the generic post-attack `recovery` settle.
 * `victory` and `defeat` loop (t wraps); the intro portion plays once then the
 * held stance breathes.
 */

import { TAU, easeOut, smoothstep } from "../math";
import { add, type AnimContext, type PoseMap } from "../types";
import { combatBase, inward, wingRaise } from "./helpers";

/** RECOVERY — a short neutral settle back toward the ready stance after an attack clip. */
export function recovery(t: number, ctx: AnimContext, out: PoseMap): void {
  const w = smoothstep(t);
  combatBase(out, w, ctx.gains.headThrow);
  // A little exhale on the way in.
  add(out, "Chest", { rx: (1 - w) * 0.05 });
  add(out, "Head", { rx: (1 - w) * 0.06 * ctx.gains.headThrow });
}

/**
 * VICTORY — rise into a proud posture (chest out, head high, wings half-spread,
 * tail fanned) over the first ~0.4, then a looping proud idle.
 */
export function victory(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  const intro = easeOut(Math.min(1, t / 0.4));
  const p = t * TAU;

  add(out, "Chest", { rx: -0.2 * intro });
  add(out, "Spine", { rx: -0.1 * intro });
  add(out, "Hips", { py: 0.03 * intro });
  add(out, "Neck", { rx: -0.25 * intro * g.headThrow });
  add(out, "Head", { rx: -0.2 * intro * g.headThrow });
  wingRaise(out, 0.4 * intro * g.wingForce, 0.1 * intro);
  add(out, "Tail", { rx: 0.5 * intro * g.tailCounter });

  // Looping proud life: slow chest heave, small head bob, occasional wing shuffle.
  add(out, "Chest", { rx: -Math.abs(Math.sin(p * 0.35)) * 0.04 });
  add(out, "Head", { rx: Math.sin(p * 0.5) * 0.06 * g.headThrow, ry: Math.sin(p * 0.3) * 0.05 });
  const shuffle = Math.max(0, Math.sin(p * 0.6) - 0.85) / 0.15;
  wingRaise(out, shuffle * 0.15 * g.wingForce);
  add(out, "Tail", { ry: Math.sin(p * 0.4) * 0.08 * g.tailCounter });
}

/** DEFEAT — head lowers, chest drops, spine slumps, wings droop, tail down; subdued loop. */
export function defeat(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  const intro = easeOut(Math.min(1, t / 0.5));
  const p = t * TAU;

  add(out, "Head", { rx: 0.35 * intro * g.headThrow });
  add(out, "Neck", { rx: 0.3 * intro * g.headThrow });
  add(out, "Chest", { rx: 0.15 * intro });
  add(out, "Spine", { rx: 0.2 * intro });
  add(out, "Hips", { py: -0.04 * intro, rx: 0.06 * intro });
  wingRaise(out, -0.12 * intro * g.wingForce);
  add(out, "Tail", { rx: -0.25 * intro * g.tailCounter });
  add(out, "ThighL", { rx: 0.1 * intro });
  add(out, "ThighR", { rx: 0.1 * intro });

  // Subdued breathing — slow, shallow, with a faint head sway.
  add(out, "Chest", { rx: Math.sin(p * 0.3) * 0.03 });
  add(out, "Head", { ry: inward(ctx) * 0.02 + Math.sin(p * 0.25) * 0.03 });
}
