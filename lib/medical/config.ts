import type { InjurySeverity } from "../types";

/** Rooster Clinic level configs (spec §38). Level gates the worst injury it can treat and how fast. */
export type ClinicLevelConfig = {
  level: number;
  name: string;
  /** Multiplier on per-tick treatment progress (spec §38: higher levels treat faster). */
  treatmentSpeed: number;
  /** Worst injury severity this level can start a treatment for (spec §38). */
  maxSeverityTreatable: InjurySeverity;
  /** Fraction by which a career-altering roll's permanent damage is softened (spec §38: "reduced permanent damage probability"). */
  permanentDamageReduction: number;
  /** Flat discount fraction on treatment cost. */
  costDiscount: number;
};

const SEVERITY_RANK: Record<InjurySeverity, number> = { minor: 0, serious: 1, career_altering: 2 };

export function severityRank(severity: InjurySeverity): number {
  return SEVERITY_RANK[severity];
}

export const CLINIC_LEVELS: Record<number, ClinicLevelConfig> = {
  1: {
    level: 1,
    name: "Basic Clinic",
    treatmentSpeed: 1.0,
    maxSeverityTreatable: "minor",
    permanentDamageReduction: 0,
    costDiscount: 0,
  },
  2: {
    level: 2,
    name: "Veterinary Center",
    treatmentSpeed: 1.4,
    maxSeverityTreatable: "serious",
    permanentDamageReduction: 0.1,
    costDiscount: 0.05,
  },
  3: {
    level: 3,
    name: "Advanced Medical Center",
    treatmentSpeed: 1.8,
    maxSeverityTreatable: "career_altering",
    permanentDamageReduction: 0.25,
    costDiscount: 0.1,
  },
  4: {
    level: 4,
    name: "Elite Veterinary Facility",
    treatmentSpeed: 2.4,
    maxSeverityTreatable: "career_altering",
    permanentDamageReduction: 0.4,
    costDiscount: 0.2,
  },
};

export const CLINIC_MAX_LEVEL = 4;

export const CLINIC_UPGRADE_COST: Record<number, number> = {
  2: 1500,
  3: 4000,
  4: 9000,
};

export function clinicConfig(level: number): ClinicLevelConfig {
  return CLINIC_LEVELS[Math.max(1, Math.min(CLINIC_MAX_LEVEL, level))];
}

/** True when a clinic of `level` may start a treatment for `severity` (spec §38). */
export function canTreatSeverity(level: number, severity: InjurySeverity): boolean {
  return severityRank(severity) <= severityRank(clinicConfig(level).maxSeverityTreatable);
}
