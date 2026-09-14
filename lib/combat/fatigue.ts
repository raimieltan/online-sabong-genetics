import type { CombatAction } from "../types";

/**
 * Fatigue is accumulated exhaustion, separate from the moment-to-moment
 * stamina pool (V2 spec §10) — a fighter can top stamina back up while still
 * carrying fatigue from earlier commitment-heavy turns.
 */
export function fatigueGain(staminaSpent: number, commitment: number): number {
  return Math.max(0, staminaSpent) * 0.15 + commitment * 4;
}

export function fatigueRecoveryPerTurn(action: CombatAction): number {
  if (action === "RECOVER") return 6;
  if (action === "GUARD" || action === "REPOSITION") return 1.5;
  return 0.5;
}

export function clampFatigue(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** Multiplies effective SPD/AGI/STR-equivalent output — fatigue punishes explosive builds (spec §10, non-negotiable rule 11). */
export function fatigueStatMultiplier(fatigue: number): number {
  return Math.max(0.55, 1 - (fatigue / 100) * 0.45);
}

/** Subtracted from derivedAccuracy — fatigued fighters get sloppier, not just weaker (spec §4, §10). */
export function fatigueAccuracyPenalty(fatigue: number): number {
  return (fatigue / 100) * 15;
}

/** Fatigue also dulls decision quality — feeds into recovery/behavior bias rather than raw stats (spec §10 "decision quality"). */
export function fatigueDecisionPenalty(fatigue: number): number {
  return (fatigue / 100) * 0.3;
}
