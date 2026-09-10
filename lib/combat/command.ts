import type { CombatAction } from "../types";
import type { CombatIdentity } from "./identity";

/**
 * MVP command set for the Phase A/B validation gate (spec: "3 commands, not
 * the full 8+ of the brainstorm"). FORCE_ENGAGEMENT is never player-issued in
 * this scope — it is auto-triggered by lib/combat/inactivity.ts once a
 * stalemate crosses threshold, exempt from CommandPoints entirely.
 */
export type PlayerCommand = "PRESS" | "COUNTER" | "GUARD" | "WAIT" | "RECOVER" | "FORCE_ENGAGEMENT";

export const COMMAND_POINTS_MAX = 3;
/**
 * Turns of simulator time to regenerate 1 CP — the presentation layer converts this to a felt seconds-countdown from its own turn cadence, not read directly here.
 * Was 5; dropped to 3 (2026-09-09) — real fights were resolving in as few as 7-16 turns
 * (see scripts/validation-gate-sim.ts's Test D traces), so at the old rate a player could
 * bank barely one CP before the fight ended, making the whole command layer nearly
 * unfeelable in normal play regardless of how strongly a command biases scoring.
 */
export const COMMAND_POINT_REGEN_TURNS = 3;
/** A pending command stays live for this many turns (or until it's consumed once), so small latency on issuing it isn't punishing (spec: "accepted for the next relevant decision/exchange"). */
export const COMMAND_ACTIVE_TURNS = 3;

const COMMAND_TARGET_ACTIONS: Record<PlayerCommand, readonly CombatAction[]> = {
  PRESS: ["PRESSURE", "HEAVY_ATTACK", "LIGHT_ATTACK"],
  COUNTER: ["COUNTER", "EVADE", "REPOSITION"],
  GUARD: ["GUARD", "REPOSITION", "EVADE"],
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
export function complianceFactor(command: PlayerCommand, identity: CombatIdentity): number {
  const alignment =
    command === "PRESS"
      ? identity.aggression
      : command === "COUNTER"
        ? identity.counterPreference * 0.6 + identity.patience * 0.4
      : command === "WAIT" || command === "GUARD"
        ? identity.patience
        : command === "RECOVER"
          ? 1 - identity.riskTolerance
          : identity.aggression; // FORCE_ENGAGEMENT: an aggressive rooster complies most readily with being pushed to engage
  return 0.35 + clamp01(alignment) * 0.6;
}

/** Whether `action` is one `command` biases toward — the same lookup `commandActionModifier` uses, exposed separately so callers (e.g. the log/UI layer) can tell "did the fighter actually do what was asked" without duplicating the table. */
export function commandTargetsAction(command: PlayerCommand, action: CombatAction): boolean {
  return COMMAND_TARGET_ACTIONS[command].includes(action);
}

/** Multiplier applied to a targeted action's base score term; 1 (no-op) for every non-targeted action or when no command is pending. */
export function commandActionModifier(command: PlayerCommand | null, identity: CombatIdentity, action: CombatAction): number {
  if (!command) return 1;
  if (!commandTargetsAction(command, action)) return 1;
  return 1 + complianceFactor(command, identity);
}
