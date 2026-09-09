import { ACTION_DEFINITIONS } from "./actions";
import type { PhysicalProfile } from "../physicalProfile";
import type { CombatAction } from "../types";

/**
 * Real wall-clock duration (ms) a single fighter's chosen action takes to
 * play out, given that fighter's physical profile and current fatigue.
 * Heavier/higher-commitment actions (HEAVY_ATTACK) are dominated by mass —
 * a massive body swings and recovers slower. Lower-commitment,
 * footwork-driven actions (EVADE, REPOSITION) are dominated by mobility — a
 * nimble body covers ground faster. `commitment` (already on
 * ACTION_DEFINITIONS) doubles as this blend weight so no new per-action
 * tuning knob is needed. Fatigue universally slows execution on top of that.
 */
export function actionDurationMs(action: CombatAction, physical: PhysicalProfile, fatigue: number): number {
  const def = ACTION_DEFINITIONS[action];
  const massWeight = def.commitment;
  const mobilityWeight = 1 - massWeight;
  const physicalFactor = massWeight * physical.mass + mobilityWeight * (1 / physical.mobility);
  const fatigueFactor = 1 + (Math.max(0, Math.min(100, fatigue)) / 100) * 0.3;
  return def.baseDurationMs * physicalFactor * fatigueFactor;
}

/**
 * An exchange's real duration is however long its slowest committed action
 * takes — both fighters' animations have to finish playing out before the
 * next decision point makes sense, so the exchange can't move on faster than
 * whichever fighter is still mid-HEAVY_ATTACK recovery. This is what lets a
 * heavy attack from a massive rooster visibly take longer than two fast
 * fighters trading LIGHT_ATTACKs, without decoupling each fighter onto an
 * independent clock (a larger change tracked separately).
 */
export function exchangeDurationMs(
  actionA: CombatAction,
  physicalA: PhysicalProfile,
  fatigueA: number,
  actionB: CombatAction,
  physicalB: PhysicalProfile,
  fatigueB: number
): number {
  return Math.max(
    actionDurationMs(actionA, physicalA, fatigueA),
    actionDurationMs(actionB, physicalB, fatigueB)
  );
}
