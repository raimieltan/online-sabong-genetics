import type { InjuryRecord, InjurySeverity } from "../types";
import { clinicConfig, type IllnessSeverity } from "./config";

/** Credits per missing HP point, before the clinic's level discount. */
const HEALTH_COST_PER_POINT = 8;
/** Minutes per missing HP point, before the clinic's speed multiplier. */
const HEALTH_DURATION_PER_POINT_MIN = 0.08;

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

const ILLNESS_BASE_COST: Record<IllnessSeverity, number> = {
  minor: 180,
  moderate: 520,
  severe: 950,
};

const ILLNESS_BASE_DURATION_MIN: Record<IllnessSeverity, number> = {
  minor: 4,
  moderate: 9,
  severe: 14,
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

/** What it costs / how long to fully heal `missingHealth` points at a clinic of `clinicLevel` — same cost/speed levers as injury treatment. */
export function healthTreatmentPlan(missingHealth: number, clinicLevel: number): TreatmentPlan {
  const config = clinicConfig(clinicLevel);
  const cost = Math.round(missingHealth * HEALTH_COST_PER_POINT * (1 - config.costDiscount));
  const durationMinutes = Math.max(1, Math.round((missingHealth * HEALTH_DURATION_PER_POINT_MIN) / config.treatmentSpeed));
  return { cost, durationMinutes, effectiveness: config.treatmentSpeed };
}

/** Credits and time required to clear an illness. Facility discounts and speed apply normally. */
export function illnessTreatmentPlan(severity: IllnessSeverity, clinicLevel: number): TreatmentPlan {
  const config = clinicConfig(clinicLevel);
  return {
    cost: Math.round(ILLNESS_BASE_COST[severity] * (1 - config.costDiscount)),
    durationMinutes: Math.max(1, Math.round(ILLNESS_BASE_DURATION_MIN[severity] / config.treatmentSpeed)),
    effectiveness: config.treatmentSpeed,
  };
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
