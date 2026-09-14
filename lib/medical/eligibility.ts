import { canBattle as canBattleStage } from "../growth";
import type { Chicken, GrowthStage, InjuryRecord } from "../types";
import { medicalStatus } from "./status";

export type EligibilityResult = {
  eligible: boolean;
  /** Human-readable blockers (spec §36, §85) — empty when eligible. */
  reasons: string[];
};

const MIN_BATTLE_CONDITION = 40;
const MIN_BATTLE_HEALTH = 50;
const MAX_BATTLE_TRAINING_FATIGUE = 85;

function activeInjuries(injuries: readonly InjuryRecord[]): InjuryRecord[] {
  return injuries.filter((i) => i.permanent || i.recoveryRemaining > 0);
}

/**
 * Full battle-eligibility gate (spec §36). This is stricter than combat.ts's
 * `canFight` (sex + growth stage + injured flag) — it also enforces condition,
 * health, illness and overtraining floors, and explains every failure so the
 * UI can show a medical alert (spec §85).
 */
export function battleEligibility(chicken: Chicken): EligibilityResult {
  const reasons: string[] = [];

  if (chicken.sex !== "rooster") reasons.push("Hens do not fight.");
  if (!canBattleStage(chicken.growthStage as GrowthStage)) {
    reasons.push(`Not battle-age (${chicken.growthStage.replace("_", " ")}).`);
  }
  if (chicken.status === "retired" || chicken.status === "deceased") {
    reasons.push(`Chicken is ${chicken.status}.`);
  }

  const injuries = activeInjuries(chicken.injuries ?? []);
  if (injuries.some((i) => i.severity === "career_altering")) {
    reasons.push("Career-altering injury — cannot compete.");
  }
  if (injuries.some((i) => i.severity === "serious")) {
    reasons.push("Serious injury still healing.");
  }

  const illnesses = (chicken.illnesses ?? []).filter((i) => i.recoveryRemaining > 0);
  if (illnesses.some((i) => i.severity !== "minor")) {
    reasons.push("Ill — needs treatment before competing.");
  }

  const condition = chicken.condition ?? 100;
  if (condition < MIN_BATTLE_CONDITION) reasons.push(`Condition too low (${condition}/${MIN_BATTLE_CONDITION}).`);

  const health = chicken.health ?? 100;
  if (health < MIN_BATTLE_HEALTH) reasons.push(`Health too low (${health}/${MIN_BATTLE_HEALTH}).`);

  const trainingFatigue = chicken.trainingState?.trainingFatigue ?? 0;
  if (trainingFatigue > MAX_BATTLE_TRAINING_FATIGUE) {
    reasons.push(`Overtrained (fatigue ${trainingFatigue}/${MAX_BATTLE_TRAINING_FATIGUE}).`);
  }

  if (medicalStatus(chicken) === "critical") reasons.push("Critical medical status.");

  return { eligible: reasons.length === 0, reasons };
}
