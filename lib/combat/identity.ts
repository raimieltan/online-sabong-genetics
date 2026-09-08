import type { BehavioralProfile } from "../types";

/**
 * Reduced 3-axis identity (spec cut #2): aggression, patience, riskTolerance
 * only, for the Phase A prototype. Not a player-set input — always derived
 * from the existing BehavioralProfile, which already carries these 3 fields
 * among its 8.
 */
export type CombatIdentity = {
  aggression: number;
  patience: number;
  riskTolerance: number;
};

export function deriveCombatIdentity(profile: BehavioralProfile): CombatIdentity {
  return {
    aggression: profile.aggression,
    patience: profile.patience,
    riskTolerance: profile.riskTolerance,
  };
}

/** Writes an adjusted identity back into a full BehavioralProfile for scoreAction, leaving the other 5 fields untouched. */
export function withIdentity(profile: BehavioralProfile, identity: CombatIdentity): BehavioralProfile {
  return { ...profile, ...identity };
}
