import type { CombatExperience } from "../types";
import type { CombatIdentity } from "./identity";

/** A single pure function, not six independent state machines (spec Phase B). */
export type MentalState = "calm" | "confident" | "nervous" | "frustrated" | "desperate" | "exhausted";

export type MentalStateInput = {
  hpRatio: number;
  staminaRatio: number;
  momentum: number;
  recentExchangeResult: "landed" | "taken" | "neutral";
  experience: CombatExperience;
};

export function deriveMentalState(input: MentalStateInput): MentalState {
  const { hpRatio, staminaRatio, momentum, recentExchangeResult } = input;
  if (staminaRatio <= 0.15) return "exhausted";
  if (hpRatio <= 0.3 && momentum <= -20) return "desperate";
  if (momentum <= -25 && recentExchangeResult === "taken") return "frustrated";
  if (momentum <= -15 || (hpRatio <= 0.4 && recentExchangeResult !== "landed")) return "nervous";
  if (momentum >= 25 && recentExchangeResult === "landed") return "confident";
  return "calm";
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Feeds back into CombatIdentity's effective weights for the rest of the fight (spec Phase B) — small, capped nudges per state, not a stat overhaul. */
export function applyMentalState(identity: CombatIdentity, state: MentalState): CombatIdentity {
  switch (state) {
    case "confident":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance + 0.1), aggression: clamp01(identity.aggression + 0.05) };
    case "nervous":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance - 0.1), patience: clamp01(identity.patience + 0.05) };
    case "frustrated":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance + 0.15), patience: clamp01(identity.patience - 0.1) };
    case "desperate":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance + 0.25) };
    case "exhausted":
      return { ...identity, aggression: clamp01(identity.aggression - 0.15) };
    case "calm":
      return identity;
  }
}
