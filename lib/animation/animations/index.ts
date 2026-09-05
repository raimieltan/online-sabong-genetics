/** Registry: AnimState → AnimationDef (duration, loop, priority, pose fn). */

import { PRIORITY } from "../stateMachine";
import type { AnimState, AnimationDef } from "../types";
import { idle, ready, taunt } from "./idle";
import { backstep, run, walk } from "./locomotion";
import {
  chargeAttack,
  doubleKick,
  flyingKick,
  heavyKick,
  jumpAttack,
  peckAttack,
  quickKick,
  wingStrike,
} from "./attacks";
import { hitCritical, hitHeavy, hitLight, hitMedium, stagger, staggerHeavy } from "./hitReactions";
import { death, getup, knockback, knockdown } from "./downed";
import { defeat, recovery, victory } from "./outcomes";

function def(duration: number, loop: boolean, state: AnimState, fn: AnimationDef["fn"]): AnimationDef {
  return { duration, loop, priority: PRIORITY[state], fn };
}

export const ANIMATIONS: Record<AnimState, AnimationDef> = {
  idle: def(6, true, "idle", idle),
  idle_alert: def(6, true, "idle_alert", ready),
  ready: def(6, true, "ready", ready),
  walk: def(0.6, true, "walk", walk),
  run: def(0.38, true, "run", run),
  backstep: def(0.4, false, "backstep", backstep),
  recovery: def(0.28, false, "recovery", recovery),

  peck_attack: def(0.55, false, "peck_attack", peckAttack),
  quick_kick: def(0.7, false, "quick_kick", quickKick),
  heavy_kick: def(1.1, false, "heavy_kick", heavyKick),
  wing_strike: def(0.6, false, "wing_strike", wingStrike),
  jump_attack: def(0.8, false, "jump_attack", jumpAttack),
  flying_kick: def(0.95, false, "flying_kick", flyingKick),
  double_kick: def(0.9, false, "double_kick", doubleKick),
  charge_attack: def(0.85, false, "charge_attack", chargeAttack),

  hit_light: def(0.28, false, "hit_light", hitLight),
  hit_medium: def(0.42, false, "hit_medium", hitMedium),
  hit_heavy: def(0.55, false, "hit_heavy", hitHeavy),
  hit_critical: def(0.7, false, "hit_critical", hitCritical),
  stagger: def(0.6, false, "stagger", stagger),
  stagger_heavy: def(0.9, false, "stagger_heavy", staggerHeavy),

  knockback: def(0.5, false, "knockback", knockback),
  knockdown: def(0.9, false, "knockdown", knockdown),
  getup: def(0.8, false, "getup", getup),
  death: def(1.0, false, "death", death),

  victory: def(4, true, "victory", victory),
  defeat: def(4, true, "defeat", defeat),
  taunt: def(1.2, false, "taunt", taunt),
};
