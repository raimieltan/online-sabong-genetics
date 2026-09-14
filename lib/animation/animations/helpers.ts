/**
 * Semantic pose helpers shared by the animation functions. Everything writes
 * additively (via `add`/`addPair`) into the accumulator pose.
 *
 * Axis conventions (verified against the pre-existing hand-written poses in
 * ChickenModel; the rest are best-guess and flagged in the design's
 * "bone-axis limitations" section for manual confirmation):
 *   Head/Neck/Spine/Chest  rx > 0  → pitch DOWN / forward flexion
 *   Head/Neck               ry     → yaw (turn); pass `inward()` * amt to face opponent
 *   Wing (via wingRaise)    +amt   → both wings lift away from the body
 *   Thigh                   rx > 0 → leg swings FORWARD / knee lifts
 *   Shank                   rx > 0 → knee folds (calf back)   [UNVERIFIED]
 *   Tail                    rx > 0 → fan / raise
 *   Hips                    py < 0 → body lowers; px → weight shift; rz → roll; ry → twist
 */

import { clamp01, lerp } from "../math";
import { add, addPair, type AnimContext, type PoseMap } from "../types";

/** +1 if the fighter should turn toward +local, given which way it faces the opponent. */
export function inward(ctx: AnimContext): number {
  return ctx.facing === "right" ? 1 : -1;
}

/** Raise (amt > 0) or tuck (amt < 0) both wings symmetrically, matching the rig's flap sign. */
export function wingRaise(out: PoseMap, amt: number, forward = 0): void {
  add(out, "WingL", { rz: -amt, rx: forward });
  add(out, "WingR", { rz: amt, rx: forward });
}

/**
 * Drive the corrected rig from its folded runtime neutral pose toward its
 * authored symmetric T-pose. This is deliberately an explicit local pose,
 * not a tiny flap offset: `open=1` restores the source GLB's fully extended
 * wing orientation, while flaps and strikes layer on top of it.
 */
export function wingOpen(out: PoseMap, amount: number, side?: "L" | "R"): void {
  const k = clamp01(amount);
  const open = (s: "L" | "R") => {
    const mirror = s === "L" ? -1 : 1;
    add(out, `Wing${s}`, {
      rx: 0.226 * k,
      ry: mirror * 1.292 * k,
      rz: -mirror * 1.512 * k,
    });
  };
  if (side) open(side);
  else {
    open("L");
    open("R");
  }
}

/** Spread wings wide for balance / display — lift plus a forward cup. */
export function wingSpread(out: PoseMap, amt: number): void {
  wingOpen(out, Math.abs(amt) * 0.62);
  wingRaise(out, amt, amt * 0.35);
}

/**
 * Blend a resting COMBAT stance into the pose at weight `w` (0..1): chest
 * puffed, body slightly lowered and coiled, wings held a touch off the body,
 * neck forward with the head levelled at the opponent. Attack / hit / stance
 * functions call this so a blend from `ready` doesn't pop through rest pose.
 */
export function combatBase(out: PoseMap, w: number, gains = 1): void {
  if (w <= 0) return;
  const k = clamp01(w);
  add(out, "Chest", { rx: -0.12 * k });
  add(out, "Spine", { rx: -0.05 * k });
  add(out, "Hips", { py: -0.03 * k, rx: 0.02 * k });
  add(out, "Neck", { rx: 0.14 * k * gains });
  add(out, "Head", { rx: -0.06 * k * gains });
  addPair(out, "Thigh", { rx: 0.1 * k });
  addPair(out, "Shank", { rx: 0.14 * k });
  addPair(out, "Foot", { rx: -0.08 * k });
  // A rooster in guard keeps the wings folded but visibly tense, ready to
  // flare. Large strikes/aerial moves open farther through wingOpen().
  wingOpen(out, 0.16 * k);
  wingRaise(out, 0.06 * k);
  add(out, "Tail", { rx: 0.05 * k });
}

/** Keep the sole roughly level while the knee bends: Foot counter-rotates the Shank. */
export function plantFeet(out: PoseMap, shankBendL: number, shankBendR: number): void {
  add(out, "FootL", { rx: -shankBendL * 0.6 });
  add(out, "FootR", { rx: -shankBendR * 0.6 });
}

/** Ease a value in over the first `frac` of the clip and back out over the last `frac`. */
export function inOutWindow(t: number, frac = 0.15): number {
  if (t < frac) return t / frac;
  if (t > 1 - frac) return (1 - t) / frac;
  return 1;
}

export { add, addPair, lerp };
