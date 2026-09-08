/**
 * The 3 Phase A.5 tell animations — each maps to a coarse intent tier
 * (selectTell()'s TellKind), never the exact CombatAction that follows. All
 * 3 are short (350-450ms), hold the combat-ready base, and read as a distinct
 * shape so a player can tell them apart at a glance: aggression = forward
 * weight shift + chest puff, patience = weight settles back + head levels,
 * risk = a sharp coiled crouch-and-hold.
 */
import { bell, easeOut, TAU } from "../math";
import { add, type AnimContext, type PoseMap } from "../types";
import { combatBase, wingRaise } from "./helpers";

export function tellAggression(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  combatBase(out, 1, g.headThrow);
  const forward = t < 0.7 ? bell(t / 0.7) : easeOut((1 - t) / 0.3);
  add(out, "Hips", { px: forward * 0.05, rz: forward * 0.02 });
  add(out, "Chest", { rx: -forward * 0.12, px: forward * 0.04 });
  add(out, "Head", { rx: forward * 0.1 * g.headThrow });
}

export function tellPatience(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  combatBase(out, 1 - t * 0.15, g.headThrow);
  const settle = easeOut(Math.min(1, t / 0.6));
  add(out, "Hips", { py: -settle * 0.02, px: -settle * 0.03 });
  add(out, "Head", { rx: -settle * 0.05 * g.headThrow, ry: Math.sin(t * TAU * 0.5) * 0.03 });
  wingRaise(out, 0.05 * (1 - settle));
}

export function tellRisk(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  const coil = t < 0.5 ? easeOut(t / 0.5) : 1;
  combatBase(out, 1 + coil * 0.3, g.headThrow);
  add(out, "Hips", { py: coil * 0.03, rz: 0 });
  add(out, "Chest", { rx: -coil * 0.18 });
  add(out, "Tail", { rx: coil * 0.15 * g.tailCounter });
  if (t > 0.5) {
    const shake = (t - 0.5) / 0.5;
    add(out, "Head", { rz: Math.sin(shake * TAU * 3) * 0.03 * (1 - shake) });
  }
}
