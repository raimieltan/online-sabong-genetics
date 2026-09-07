import type { CombatAction, CombatContextState, CombatDistance, CombatLogEntry, HitZone, StaggerLevel } from "../types";

/**
 * Structured combat events (spec §42) — the CombatLogEntry array remains the
 * one wire format the 3D client replays (spec §43-45: it presents, it never
 * recalculates), so this union documents the same information in the
 * "what happened" shape a future granular event stream could emit without
 * changing what's persisted today.
 */
export type CombatEvent =
  | { type: "AttackStarted"; actorId: string; action: CombatAction }
  | { type: "Movement"; actorId: string; position: number; distance: CombatDistance }
  | { type: "Evade"; actorId: string }
  | { type: "Counter"; actorId: string; targetId: string }
  | { type: "Impact"; actorId: string; targetId: string; hitZone: HitZone; isCrit: boolean }
  | { type: "Damage"; targetId: string; amount: number; remainingHp: number }
  | { type: "Stagger"; targetId: string; level: StaggerLevel }
  | { type: "Recovery"; actorId: string }
  | { type: "FatigueChanged"; actorId: string; fatigue: number }
  | { type: "MomentumChanged"; actorId: string; momentum: number }
  | { type: "PositionChanged"; actorId: string; position: number }
  | { type: "Knockout"; actorId: string; targetId: string }
  | { type: "TurnEnded"; turn: number };

export function buildLogEntry(params: {
  turn: number;
  attackerId: string;
  defenderId: string;
  damage: number;
  hitZone: HitZone | null;
  isMiss: boolean;
  isCrit: boolean;
  isCounter: boolean;
  isCritical: boolean;
  defenderHp: number;
  stagger: StaggerLevel;
  attackerAction: CombatAction;
  defenderAction: CombatAction;
  attackerState: CombatContextState;
  defenderState: CombatContextState;
  momentum: { attacker: number; defender: number };
  position: number;
  distance: CombatDistance;
  fatigue: { attacker: number; defender: number };
}): CombatLogEntry {
  return { ...params, timestamp: Date.now(), damage: Number(params.damage.toFixed(1)), defenderHp: Number(params.defenderHp.toFixed(1)) };
}
