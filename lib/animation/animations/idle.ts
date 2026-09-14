/**
 * Resting states: `idle` (relaxed, alive-not-frozen), `idle_alert` / `ready`
 * (aggressive neutral combat stance), and `taunt`.
 */

import { TAU, bell, easeOut, oscillate, smoothstep } from "../math";
import { add, type AnimContext, type PoseMap } from "../types";
import { combatBase, inward, wingRaise } from "./helpers";

/**
 * IDLE — every term is a whole-cycle sinusoid over the 6s window so it loops
 * seamlessly. Two detuned frequencies on the neck/head keep it from feeling
 * metronomic. Breathing itself is added by the always-on layer; here we add
 * only the secondary life (weight shift, tail, wing micro-balance, glances).
 */
export function idle(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  const p = t * TAU; // one loop == duration

  // Slow left/right weight transfer — hips roll and drift together so it reads
  // as weight moving, not a lean.
  const shift = Math.sin(p * 0.17);
  add(out, "Hips", { rz: shift * 0.022, px: shift * 0.012, py: -Math.abs(shift) * 0.006 });

  // Neck: two detuned frequencies. Head adds an independent slow yaw plus an
  // occasional downward glance when the slow sine tops out.
  add(out, "Neck", { rx: (Math.sin(p * 0.4) * 0.03 + Math.sin(p * 0.13 + 1.3) * 0.02) * g.headThrow });
  const glance = smoothstep(Math.max(0, Math.sin(p * 0.23 + 0.6) - 0.7) / 0.3);
  add(out, "Head", {
    ry: Math.sin(p * 0.31 + 1.7) * 0.05 * g.headThrow,
    rx: (Math.sin(p * 0.5) * 0.02 + glance * 0.22) * g.headThrow,
  });

  add(out, "Tail", { rx: Math.sin(p * 0.2) * 0.04 * g.tailCounter, ry: shift * 0.03 * g.tailCounter });

  // Barely-there wing balance answering the weight shift.
  wingRaise(out, 0.02 + Math.abs(shift) * 0.015 * g.wingForce);

  // Chest lifts a hair on the shift apex — extra to the breathing layer.
  add(out, "Chest", { rx: -Math.abs(shift) * 0.015 });
}

/**
 * READY / IDLE_ALERT — the neutral COMBAT stance every exchange returns to:
 * chest raised, body lowered and coiled, head levelled at the opponent, wings
 * off the body. Subtle breathing still comes from the layer.
 */
export function ready(t: number, ctx: AnimContext, out: PoseMap): void {
  combatBase(out, 1, ctx.gains.headThrow);
  const p = t * TAU;
  // Small alert bounce + a focused micro-sway toward the opponent.
  add(out, "Hips", { py: -Math.abs(Math.sin(p * 0.9)) * 0.008 });
  add(out, "Head", { ry: inward(ctx) * 0.04 + Math.sin(p * 0.7) * 0.02 });
  add(out, "Chest", { ry: inward(ctx) * 0.03 });
  add(out, "Tail", { rx: 0.04 + Math.sin(p * 0.8) * 0.02 });
}

/**
 * TAUNT — chest puff, two sharp head bobs, an asymmetric wing display flare,
 * a quick body shake, then settle back toward the ready stance.
 */
export function taunt(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  // Hold the combat base, easing out over the last 20%.
  combatBase(out, t > 0.8 ? easeOut((1 - t) / 0.2) : 1, g.headThrow);

  // Chest puff peaks mid-clip.
  add(out, "Chest", { rx: -bell(t) * 0.13 });
  add(out, "Spine", { rx: -bell(t) * 0.05 });

  // Two head bobs in the first 55%.
  if (t < 0.55) {
    const bob = Math.sin((t / 0.55) * TAU * 2);
    add(out, "Head", { rx: bob * 0.28 * g.headThrow });
    add(out, "Neck", { rx: bob * 0.12 * g.headThrow });
  }

  // Wing display flare, 35%-75%, asymmetric (right wing wide).
  if (t > 0.35 && t < 0.75) {
    const f = bell((t - 0.35) / 0.4);
    add(out, "WingR", { rz: f * 1.0 * g.wingForce, rx: f * 0.3 });
    add(out, "WingL", { rz: -f * 0.35 * g.wingForce });
    add(out, "Tail", { rx: f * 0.4 * g.tailCounter });
  }

  // Quick decaying body shake near the end.
  if (t > 0.6) {
    const decay = 1 - (t - 0.6) / 0.4;
    add(out, "Hips", { rz: oscillate(t, 26) * 0.05 * decay, ry: oscillate(t, 22, 1) * 0.04 * decay });
    add(out, "Head", { rz: oscillate(t, 24) * 0.06 * decay });
  }
}
