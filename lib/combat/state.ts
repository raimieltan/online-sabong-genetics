import { deriveBehaviorProfile } from "./behavior";
import { emptyExperience, emptyOpponentModel } from "./experience";
import { maxHealth } from "./stats";
import type { MentalState } from "./mentalState";
import type { PlayerCommand } from "./command";
import type { BehavioralProfile, Chicken, CombatDistance, CombatExperience, OpponentModel } from "../types";

export const MAX_HEALTH = 100;

/**
 * Server-side per-fighter simulation state for one battle (V2 spec §6). Built
 * fresh from a persisted Chicken at battle start, mutated turn by turn, and
 * discarded once the battle produces its CombatResult + experience/condition/
 * injury deltas — this is simulation-internal, not itself persisted.
 */
export type CombatantState = {
  chicken: Chicken;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  fatigue: number;
  momentum: number;
  position: number;
  distance: CombatDistance;
  staggerTurns: number;
  recoveryTurns: number;
  behavior: BehavioralProfile;
  experience: CombatExperience;
  opponentModel: OpponentModel;
  battleExperienceGain: CombatExperience;
  wasHitLastTurn: boolean;
  mentalState: MentalState;
  commandPoints: number;
  pendingCommand: PlayerCommand | null;
  pendingCommandTurnsLeft: number;
};

export function makeCombatantState(chicken: Chicken): CombatantState {
  const hp = maxHealth(chicken);
  return {
    chicken,
    hp,
    maxHp: hp,
    stamina: 100,
    maxStamina: 100,
    fatigue: 0,
    momentum: 0,
    position: 0,
    distance: "MID",
    staggerTurns: 0,
    recoveryTurns: 0,
    behavior: chicken.behavior ?? deriveBehaviorProfile(chicken.fightingStyle, chicken.traits),
    experience: chicken.experience ?? emptyExperience(),
    opponentModel: emptyOpponentModel(),
    battleExperienceGain: emptyExperience(),
    wasHitLastTurn: false,
    mentalState: "calm",
    commandPoints: 0,
    pendingCommand: null,
    pendingCommandTurnsLeft: 0,
  };
}
