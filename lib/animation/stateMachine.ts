/**
 * Animation state machine. Guards against conflicting animations: a lower or
 * equal priority request is rejected while the current clip is still playing,
 * DEATH is terminal, and KNOCKDOWN only releases to GETUP. Every accepted
 * transition exposes a blend factor (`transitionT` 0→1) the controller uses to
 * slerp out of the previous pose.
 */

import { clamp01 } from "./math";
import type { AnimState } from "./types";

/** Low → high. A request only wins if it strictly out-priorities the current state (or the current clip has finished). */
export const PRIORITY: Record<AnimState, number> = {
  idle: 0,
  walk: 1,
  run: 2,
  backstep: 2,
  ready: 3,
  idle_alert: 3,
  recovery: 4,
  taunt: 5,
  tell_aggression: 5.5,
  tell_patience: 5.5,
  tell_risk: 6.5,
  victory: 6,
  defeat: 6,
  peck_attack: 10,
  quick_kick: 10,
  wing_strike: 10,
  charge_attack: 10,
  jump_attack: 11,
  double_kick: 11,
  heavy_kick: 12,
  flying_kick: 12,
  hit_light: 20,
  hit_medium: 22,
  stagger: 24,
  hit_heavy: 26,
  stagger_heavy: 28,
  knockback: 30,
  hit_critical: 34,
  knockdown: 40,
  getup: 42,
  death: 100,
};

/** Per-target blend-in time (seconds). Falls back to DEFAULT_BLEND. */
const BLEND: Partial<Record<AnimState, number>> = {
  idle: 0.18,
  ready: 0.14,
  idle_alert: 0.14,
  walk: 0.16,
  run: 0.16,
  hit_light: 0.06,
  hit_medium: 0.07,
  hit_heavy: 0.08,
  hit_critical: 0.08,
  stagger: 0.08,
  stagger_heavy: 0.09,
  knockback: 0.06,
  knockdown: 0.05,
  getup: 0.2,
  death: 0.05,
};
const DEFAULT_BLEND = 0.1;

export class AnimationStateMachine {
  current: AnimState = "idle";
  previous: AnimState = "idle";
  /** 0 → 1 across the blend window; 1 means fully in `current`. */
  transitionT = 1;
  /** Seconds elapsed in `current`. */
  stateTime = 0;

  private blendDur = DEFAULT_BLEND;

  /**
   * Attempt a transition. Returns true if accepted. `currentFinished` lets the
   * caller allow same/lower-priority states once the running clip has played
   * out (e.g. attack → recovery → ready).
   */
  request(next: AnimState, currentFinished: boolean, blendScale = 1): boolean {
    if (next === this.current) return false;

    // DEATH is a one-way door.
    if (this.current === "death") return false;

    // KNOCKDOWN only releases to GETUP (or DEATH, already handled by priority).
    if (this.current === "knockdown" && next !== "getup" && next !== "death") {
      return false;
    }
    // GETUP must resolve to a stance, not straight back into a hit-less action.
    if (this.current === "getup" && !currentFinished && PRIORITY[next] < PRIORITY.knockdown) {
      return false;
    }

    const outranks = PRIORITY[next] > PRIORITY[this.current];
    if (!outranks && !currentFinished) return false;

    this.previous = this.current;
    this.current = next;
    this.stateTime = 0;
    this.transitionT = 0;
    this.blendDur = Math.max(0.01, (BLEND[next] ?? DEFAULT_BLEND) * blendScale);
    return true;
  }

  update(dt: number): void {
    this.stateTime += dt;
    if (this.transitionT < 1) {
      this.transitionT = clamp01(this.transitionT + dt / this.blendDur);
    }
  }
}
