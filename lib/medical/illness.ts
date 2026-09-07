import type { IllnessRecord, IllnessType } from "../types";

export type Rng = () => number;

const ILLNESS_LABELS: Record<IllnessType, string> = {
  fatigue_illness: "Fatigue Sickness",
  respiratory: "Respiratory Infection",
  digestive: "Digestive Upset",
  infection: "Wound Infection",
  environmental: "Environmental Stress Illness",
  stress_condition: "Stress-Related Condition",
};

let counter = 0;
function nextId(): string {
  counter += 1;
  return `illness-${Date.now()}-${counter}`;
}

const RECOVERY_CYCLES = { minor: 2, moderate: 4, severe: 7 } as const;

export function createIllness(type: IllnessType, severity: IllnessRecord["severity"]): IllnessRecord {
  return {
    id: nextId(),
    type,
    label: ILLNESS_LABELS[type],
    severity,
    incurredAt: Date.now(),
    recoveryRemaining: RECOVERY_CYCLES[severity],
  };
}

/**
 * Chance one rest/training cycle produces an illness (spec §10, §34). Driven
 * by overtraining load and stress, not by combat. Returns null most of the time.
 */
export function rollIllness(
  rng: Rng,
  params: { trainingFatigue: number; stress: number; condition: number },
): IllnessRecord | null {
  const { trainingFatigue, stress, condition } = params;
  const fatiguePressure = Math.max(0, trainingFatigue - 60) / 40; // 0 at <=60, 1 at 100
  const stressPressure = Math.max(0, stress - 50) / 50;
  const conditionPressure = Math.max(0, 50 - condition) / 50;
  const chance = 0.02 + 0.18 * fatiguePressure + 0.12 * stressPressure + 0.1 * conditionPressure;

  if (rng() >= chance) return null;

  const severity: IllnessRecord["severity"] = fatiguePressure > 0.7 || stressPressure > 0.8 ? "moderate" : "minor";
  const type: IllnessType =
    stressPressure > fatiguePressure ? "stress_condition" : trainingFatigue > 80 ? "fatigue_illness" : "respiratory";
  return createIllness(type, severity);
}

/** One rest/treatment cycle of illness recovery (spec §24). */
export function tickIllnessRecovery(illnesses: readonly IllnessRecord[], cycles = 1): IllnessRecord[] {
  return illnesses
    .map((i) => ({ ...i, recoveryRemaining: Math.max(0, i.recoveryRemaining - cycles) }))
    .filter((i) => i.recoveryRemaining > 0);
}
