import type { Chicken, IllnessRecord, InjuryRecord, MedicalStatus } from "../types";

function activeInjuries(injuries: readonly InjuryRecord[]): InjuryRecord[] {
  return injuries.filter((i) => i.permanent || i.recoveryRemaining > 0);
}

function activeIllnesses(illnesses: readonly IllnessRecord[]): IllnessRecord[] {
  return illnesses.filter((i) => i.recoveryRemaining > 0);
}

/**
 * Player-facing medical state (spec §35). Ordered worst-first: the first
 * matching condition wins, so a critically injured + ill chicken still reads
 * "critical".
 */
export function medicalStatus(chicken: Pick<Chicken, "injuries" | "illnesses" | "condition" | "health">): MedicalStatus {
  const injuries = activeInjuries(chicken.injuries ?? []);
  const illnesses = activeIllnesses(chicken.illnesses ?? []);
  const condition = chicken.condition ?? 100;
  const health = chicken.health ?? 100;

  const hasCareerAltering = injuries.some((i) => i.severity === "career_altering");
  const hasSerious = injuries.some((i) => i.severity === "serious");
  const hasMinor = injuries.some((i) => i.severity === "minor");
  const hasSevereIllness = illnesses.some((i) => i.severity === "severe");
  const inTreatment = injuries.some((i) => i.inTreatment);

  if (hasCareerAltering && injuries.some((i) => i.severity === "career_altering" && !i.inTreatment)) return "critical";
  if (health < 25 || condition < 20) return "critical";
  if (hasSerious || hasSevereIllness) return "injured";
  if (illnesses.length > 0) return "ill";
  if (inTreatment || (injuries.length > 0 && injuries.every((i) => i.inTreatment))) return "recovering";
  if (hasMinor) return "needs_attention";
  if (condition < 60 || health < 70) return "minor_issue";
  return "healthy";
}

const STATUS_LABEL: Record<MedicalStatus, string> = {
  healthy: "Healthy",
  minor_issue: "Minor Issue",
  needs_attention: "Needs Attention",
  injured: "Injured",
  ill: "Ill",
  recovering: "Recovering",
  critical: "Critical",
};

export function describeMedicalStatus(status: MedicalStatus): string {
  return STATUS_LABEL[status];
}

const STATUS_TONE: Record<MedicalStatus, "ok" | "warn" | "bad"> = {
  healthy: "ok",
  minor_issue: "ok",
  needs_attention: "warn",
  recovering: "warn",
  ill: "warn",
  injured: "bad",
  critical: "bad",
};

export function medicalStatusTone(status: MedicalStatus): "ok" | "warn" | "bad" {
  return STATUS_TONE[status];
}
