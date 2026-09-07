import type { InjuryRecord, InjurySeverity } from "../types";
import { clinicConfig } from "./config";

/** Base treatment cost in credits, before the clinic's level discount (spec §39). */
const BASE_COST: Record<InjurySeverity, number> = {
  minor: 120,
  serious: 450,
  career_altering: 1200,
};

/** Base treatment duration in minutes, before the clinic's speed multiplier (spec §39). */
const BASE_DURATION_MIN: Record<InjurySeverity, number> = {
  minor: 2,
  serious: 6,
  career_altering: 12,
};

export type TreatmentPlan = {
  cost: number;
  durationMinutes: number;
  /** Multiplier applied to injury recovery progress while under treatment (spec §38). */
  effectiveness: number;
};

/** What it costs / how long / how effective to treat one injury at a clinic of `clinicLevel` (spec §38-39). */
export function treatmentPlan(severity: InjurySeverity, clinicLevel: number): TreatmentPlan {
  const config = clinicConfig(clinicLevel);
  const cost = Math.round(BASE_COST[severity] * (1 - config.costDiscount));
  const durationMinutes = Math.max(1, Math.round(BASE_DURATION_MIN[severity] / config.treatmentSpeed));
  const effectiveness = config.treatmentSpeed;
  return { cost, durationMinutes, effectiveness };
}

/**
 * Resolves a completed treatment against the chicken's injury list (spec §41).
 * A finished treatment clears a non-permanent injury outright; for a permanent
 * injury it eases the stat penalty in proportion to the clinic's permanent-
 * damage reduction, and marks it as managed.
 */
export function resolveTreatment(
  injuries: readonly InjuryRecord[],
  injuryId: string,
  clinicLevel: number,
): { injuries: InjuryRecord[]; cleared: boolean } {
  const config = clinicConfig(clinicLevel);
  let cleared = false;

  const next = injuries.flatMap((injury): InjuryRecord[] => {
    if (injury.id !== injuryId) return [injury];

    if (!injury.permanent) {
      cleared = true;
      return [];
    }

    const easedPenalty = injury.statPenalty
      ? Object.fromEntries(
          Object.entries(injury.statPenalty).map(([k, v]) => [k, Math.round((v ?? 0) * (1 - config.permanentDamageReduction))]),
        )
      : undefined;

    return [{ ...injury, inTreatment: false, statPenalty: easedPenalty as InjuryRecord["statPenalty"] }];
  });

  return { injuries: next, cleared };
}

/** Marks an injury as under treatment so medical status reads "recovering" (spec §35). */
export function markInTreatment(injuries: readonly InjuryRecord[], injuryId: string): InjuryRecord[] {
  return injuries.map((i) => (i.id === injuryId ? { ...i, inTreatment: true } : i));
}
