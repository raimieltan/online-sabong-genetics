import type { BehavioralProfile, CombatAction, TellKind } from "../types";
import type { DecisionContext } from "./behavior";

export type { TellKind };

const AGGRESSION_ACTIONS: readonly CombatAction[] = ["LIGHT_ATTACK", "HEAVY_ATTACK", "PRESSURE"];
const PATIENCE_ACTIONS: readonly CombatAction[] = ["REPOSITION", "GUARD", "EVADE"];
const LOW_STAMINA_RATIO = 0.3;

function isRiskyCommit(action: CombatAction, ctx: DecisionContext): boolean {
  const staminaRatio = ctx.stamina / ctx.maxStamina;
  if (action === "HEAVY_ATTACK" && staminaRatio <= LOW_STAMINA_RATIO) return true;
  if (action === "PRESSURE" && ctx.position < 0) return true; // committing to press from a bad position
  return false;
}

/**
 * No tell fires for a routine action a fighter takes constantly — only a
 * genuine engage/wait/overcommit reads as a signal. "risk" is triggered by
 * the AI actually entering a high-risk decision state (low-stamina
 * overcommit, or a bad-position swing), not by reading riskTolerance as a
 * personality-stat readout, so it takes priority when both conditions are
 * true this turn.
 */
export function selectTell(profile: BehavioralProfile, chosenAction: CombatAction, ctx: DecisionContext): TellKind | null {
  if (isRiskyCommit(chosenAction, ctx)) return "risk";
  if (AGGRESSION_ACTIONS.includes(chosenAction) && profile.aggression >= 0.6) return "aggression";
  if (PATIENCE_ACTIONS.includes(chosenAction) && profile.patience >= 0.6) return "patience";
  return null;
}
