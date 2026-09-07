import { recoverCondition } from "../career/condition";
import { tickInjuryRecovery } from "../combat/injuries";
import { tickIllnessRecovery } from "../medical/illness";
import { defaultTrainingState, restTrainingState } from "../training/limits";
import type { Chicken, IllnessRecord, InjuryRecord, TrainingState } from "../types";

export type RecoveryMethod = "rest" | "extended_rest" | "recovery_facility" | "medical_rest";

/** Per-method base strength (spec §24). Facility level scales it further. */
const METHOD_STRENGTH: Record<RecoveryMethod, number> = {
  rest: 1.0,
  extended_rest: 1.6,
  recovery_facility: 2.0,
  medical_rest: 1.3,
};

/**
 * Recovery quality 0-100 (spec §25) — how much a recovery cycle actually
 * delivers, degraded by high fatigue, active injury, illness, high stress and
 * low morale, lifted by the method and a recovery-facility level.
 */
export function recoveryQuality(
  chicken: Pick<Chicken, "trainingState" | "injuries" | "illnesses" | "stress" | "morale">,
  method: RecoveryMethod,
  facilityLevel = 0,
): number {
  let quality = 60 * METHOD_STRENGTH[method];
  quality += facilityLevel * 8;

  const fatigue = chicken.trainingState?.trainingFatigue ?? 0;
  quality -= fatigue * 0.25;

  const activeInjuries = (chicken.injuries ?? []).filter((i) => i.permanent || i.recoveryRemaining > 0);
  quality -= activeInjuries.length * 12;

  const activeIllness = (chicken.illnesses ?? []).filter((i) => i.recoveryRemaining > 0);
  quality -= activeIllness.length * 10;

  quality -= Math.max(0, (chicken.stress ?? 0) - 40) * 0.2;
  quality -= Math.max(0, 50 - (chicken.morale ?? 75)) * 0.15;

  return Math.round(Math.max(5, Math.min(100, quality)));
}

export type RecoveryResult = {
  energy: number;
  condition: number;
  stress: number;
  morale: number;
  trainingState: TrainingState;
  injuries: InjuryRecord[];
  illnesses: IllnessRecord[];
  quality: number;
};

/**
 * Applies one recovery cycle (spec §23-25). Restores energy, reduces fatigue
 * and stress, nudges morale up, advances condition, and ticks injury/illness
 * recovery — all scaled by the computed recovery quality.
 */
export function applyRecovery(
  chicken: Chicken,
  method: RecoveryMethod = "rest",
  facilityLevel = 0,
): RecoveryResult {
  const quality = recoveryQuality(chicken, method, facilityLevel);
  const scale = quality / 100;

  const baseState = restTrainingState(chicken.trainingState ?? defaultTrainingState());
  // restTrainingState already refills points + subtracts a flat fatigue chunk;
  // quality decides how much of that flat chunk actually lands.
  const priorFatigue = chicken.trainingState?.trainingFatigue ?? 0;
  const fatigueDrop = (priorFatigue - baseState.trainingFatigue) * scale;
  const trainingState: TrainingState = {
    ...baseState,
    trainingFatigue: Math.round(Math.max(0, priorFatigue - fatigueDrop)),
  };

  // Energy is the cheap resource — a rest cycle always tops it off (spec §23).
  // Recovery quality governs the strategic layers (fatigue, stress, condition, injury).
  const energy = 100;

  const condition = recoverCondition(chicken.condition ?? 100, Math.round(14 * scale));
  const stress = Math.round(Math.max(0, (chicken.stress ?? 0) - 22 * scale));
  const morale = Math.round(Math.min(100, (chicken.morale ?? 75) + 6 * scale));

  const injuryCycles = method === "extended_rest" || method === "recovery_facility" ? 2 : 1;
  let injuries = chicken.injuries ?? [];
  for (let i = 0; i < injuryCycles; i++) injuries = tickInjuryRecovery(injuries);
  const illnesses = tickIllnessRecovery(chicken.illnesses ?? [], injuryCycles);

  return { energy, condition, stress, morale, trainingState, injuries, illnesses, quality };
}
