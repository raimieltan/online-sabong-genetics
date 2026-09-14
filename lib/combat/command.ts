import type { CombatAction } from "../types";
import type { CombatIdentity } from "./identity";

/** The one public coaching vocabulary used by every combat surface. */
export type CoachingCommand = "PRESS" | "WAIT" | "COUNTER" | "RECOVER";
/** Internal stalemate breaker; never exposed as a player command. */
export type CombatInstruction = CoachingCommand | "FORCE_ENGAGEMENT";

const COMMAND_TARGET_ACTIONS: Record<CombatInstruction, readonly CombatAction[]> = {
  PRESS: ["PRESSURE", "HEAVY_ATTACK", "LIGHT_ATTACK"],
  COUNTER: ["COUNTER", "EVADE", "REPOSITION"],
  WAIT: ["GUARD", "REPOSITION", "EVADE"],
  RECOVER: ["RECOVER", "GUARD"],
  FORCE_ENGAGEMENT: ["PRESSURE", "LIGHT_ATTACK", "COUNTER"],
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * How strongly a command actually shifts behavior, scaled down the further
 * the command sits from the rooster's own CombatIdentity (spec: "imperfect
 * command compliance" — never 0% or 100%). The 0.35 floor keeps a command
 * always felt even against a totally misaligned identity; the 0.6 spread
 * caps the ceiling well short of 1.0.
 */
export function complianceFactor(command: CombatInstruction, identity: CombatIdentity): number {
  const alignment =
    command === "PRESS"
      ? identity.aggression
      : command === "COUNTER"
        ? identity.patience
      : command === "WAIT"
        ? identity.patience
        : command === "RECOVER"
          ? 1 - identity.riskTolerance
          : identity.aggression; // FORCE_ENGAGEMENT: an aggressive rooster complies most readily with being pushed to engage
  return 0.35 + clamp01(alignment) * 0.6;
}

/** Whether `action` is one `command` biases toward — the same lookup `commandActionModifier` uses, exposed separately so callers (e.g. the log/UI layer) can tell "did the fighter actually do what was asked" without duplicating the table. */
export function commandTargetsAction(command: CombatInstruction, action: CombatAction): boolean {
  return COMMAND_TARGET_ACTIONS[command].includes(action);
}

/** Multiplier applied to a targeted action's base score term; 1 (no-op) for every non-targeted action or when no command is pending. */
export function commandActionModifier(command: CombatInstruction | null, identity: CombatIdentity, action: CombatAction): number {
  if (!command) return 1;
  if (!commandTargetsAction(command, action)) return 1;
  return 1 + complianceFactor(command, identity);
}
