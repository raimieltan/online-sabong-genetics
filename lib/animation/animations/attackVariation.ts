/**
 * Additive secondary motion for attacks.
 *
 * The authored attack clips own the readable silhouette and impact frame. This
 * pass adds the motion that normally trails a primary action: planted weight,
 * feather drag, tail counterbalance and a small choice of strike arcs. The
 * envelopes are zero at both clip edges so variants remain safe to blend.
 */

import { smootherstep } from "../math";
import { add, type AnimContext, type AnimState, type PoseMap } from "../types";
import { inward } from "./helpers";

const ATTACKS = new Set<AnimState>([
  "peck_attack", "quick_kick", "heavy_kick", "wing_strike",
  "jump_attack", "flying_kick", "double_kick", "charge_attack",
]);

/** Smooth zero-slope pulse within a section of a clip. */
function pulse(t: number, start: number, end: number): number {
  if (t <= start || t >= end) return 0;
  const u = (t - start) / (end - start);
  return smootherstep(Math.min(1, u * 2)) * smootherstep(Math.min(1, (1 - u) * 2));
}

export function applyAttackVariation(state: AnimState, t: number, ctx: AnimContext, out: PoseMap): void {
  if (!ATTACKS.has(state)) return;

  const variant = Math.abs(Math.trunc(ctx.attackVariant ?? 0)) % 3;
  const inn = inward(ctx);
  const load = pulse(t, 0.02, 0.5);
  const release = pulse(t, 0.34, 0.82);
  const settle = pulse(t, 0.62, 0.99);
  const whole = pulse(t, 0.01, 0.99);
  const side = variant === 1 ? inn : variant === 2 ? -inn : 0;

  // Feather masses do not stop with the shoulders. Mid/tip joints follow a
  // fraction later, giving every attack a soft overlapping finish.
  const featherDrag = (0.05 * load - 0.12 * release + 0.07 * settle) * ctx.gains.wingForce;
  add(out, "WingL_Mid", { rx: featherDrag, rz: -featherDrag * 0.7 });
  add(out, "WingL_Tip", { rx: featherDrag * 1.45, rz: -featherDrag });
  add(out, "WingR_Mid", { rx: featherDrag, rz: featherDrag * 0.7 });
  add(out, "WingR_Tip", { rx: featherDrag * 1.45, rz: featherDrag });
  add(out, "Tail", {
    rx: (0.08 * load - 0.1 * release + 0.04 * settle) * ctx.gains.tailCounter,
    ry: -side * 0.08 * release * ctx.gains.tailCounter,
  });

  if (state === "peck_attack") {
    // Straight jab, inward hook and low shovel-peck silhouettes.
    if (variant === 1) {
      add(out, "Hips", { ry: -inn * 0.12 * load });
      add(out, "Chest", { ry: inn * 0.2 * release });
      add(out, "Neck", { ry: inn * 0.24 * release });
      add(out, "Head", { ry: inn * 0.18 * release, rz: -inn * 0.07 * settle });
    } else if (variant === 2) {
      add(out, "Hips", { py: -0.035 * load });
      add(out, "Spine", { rx: 0.11 * load - 0.08 * release });
      add(out, "Neck", { rx: 0.18 * release });
      add(out, "Head", { rx: 0.16 * release - 0.08 * settle });
    } else {
      add(out, "Chest", { px: inn * 0.018 * release });
      add(out, "Head", { rz: inn * 0.035 * settle });
    }
    return;
  }

  if (state === "wing_strike") {
    // Change the plane of the blow while the base clip preserves timing.
    add(out, "Hips", { py: variant === 2 ? -0.035 * load : 0, ry: side * 0.1 * whole });
    add(out, "Chest", { rx: variant === 1 ? -0.1 * release : variant === 2 ? 0.12 * release : 0 });
    add(out, "WingR_Mid", { ry: side * 0.25 * release, rx: (variant - 1) * 0.1 * release });
    add(out, "WingR_Tip", { ry: side * 0.34 * release, rx: (variant - 1) * 0.16 * release });
    add(out, "Head", { ry: -side * 0.09 * settle });
    return;
  }

  if (state === "charge_attack") {
    // Head-led rush, left shoulder check, or right shoulder check.
    add(out, "Hips", { ry: side * 0.13 * whole, rz: side * 0.045 * release });
    add(out, "Spine", { ry: -side * 0.16 * release });
    add(out, "Chest", { ry: -side * 0.2 * release, rz: -side * 0.06 * release });
    add(out, "Neck", { ry: side * 0.11 * load });
    add(out, "Head", { ry: side * 0.14 * load - side * 0.08 * settle });
    return;
  }

  // Kicks vary the body line around the existing leg mechanics: square,
  // rising, or twisting through like a hooking spur.
  add(out, "Hips", { py: -0.018 * load, ry: side * (0.13 * load + 0.16 * release), rz: side * 0.055 * release });
  add(out, "Spine", { ry: -side * 0.16 * release, rx: variant === 1 ? -0.07 * release : 0.04 * settle });
  add(out, "Chest", { ry: -side * 0.1 * release });
  add(out, "Neck", { ry: side * 0.1 * load - side * 0.07 * release });
  add(out, "Head", { ry: side * 0.08 * load - side * 0.05 * settle });
  add(out, "FootR", { ry: side * 0.16 * release, rx: -0.08 * release });
  if (state === "double_kick") add(out, "FootL", { ry: -side * 0.14 * settle, rx: -0.07 * settle });
}
