import type { Facility } from "@prisma/client";

import { prisma } from "../db";
import { applyRecovery } from "../recovery/engine";
import type { Chicken, IllnessRecord, InjuryRecord } from "../types";
import {
  CLINIC_LEVELS,
  CLINIC_MAX_LEVEL,
  CLINIC_UPGRADE_COST,
  canTreatSeverity,
  clinicConfig,
} from "./config";
import { MedicalError } from "./errors";
import { medicalStatus } from "./status";
import { markInTreatment, resolveTreatment, treatmentPlan } from "./treatment";

const CLINIC = "ROOSTER_CLINIC" as const;

export async function getOrCreateClinic(playerId: string): Promise<Facility> {
  const existing = await prisma.facility.findUnique({
    where: { playerId_type: { playerId, type: CLINIC } },
  });
  if (existing) return existing;
  return prisma.facility.create({ data: { playerId, type: CLINIC, level: 1 } });
}

export function clinicView(facility: Facility) {
  const config = clinicConfig(facility.level);
  const nextCost = CLINIC_UPGRADE_COST[facility.level + 1];
  return {
    id: facility.id,
    type: facility.type,
    level: facility.level,
    name: config.name,
    treatmentSpeed: config.treatmentSpeed,
    maxSeverityTreatable: config.maxSeverityTreatable,
    permanentDamageReduction: config.permanentDamageReduction,
    maxLevel: CLINIC_MAX_LEVEL,
    nextUpgradeCost: nextCost,
    nextLevelName: CLINIC_LEVELS[facility.level + 1]?.name,
  };
}

/** Advances any due treatments for the player and applies their result to the chicken (spec §41, §127). */
export async function claimExpiredTreatments(playerId: string): Promise<void> {
  const due = await prisma.medicalTreatment.findMany({
    where: { playerId, status: "ACTIVE" },
  });

  for (const treatment of due) {
    const dueAt = treatment.startedAt.getTime() + treatment.durationMinutes * 60_000;
    if (Date.now() < dueAt) continue;

    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "MedicalTreatment" WHERE id = ${treatment.id} FOR UPDATE
      `;
      if (!locked[0] || locked[0].status !== "ACTIVE") return;

      const chicken = await tx.chicken.findUnique({ where: { id: treatment.chickenId } });
      if (!chicken) {
        await tx.medicalTreatment.update({
          where: { id: treatment.id },
          data: { status: "COMPLETED", completedAt: new Date(), result: { cleared: false, reason: "chicken_gone" } },
        });
        return;
      }

      const injuries = (chicken.injuries as unknown as InjuryRecord[]) ?? [];
      let nextInjuries = injuries;
      let cleared = false;
      let illnesses = (chicken.illnesses as unknown as IllnessRecord[]) ?? [];

      if (treatment.type === "TREAT_INJURY" && treatment.injuryId) {
        const resolved = resolveTreatment(injuries, treatment.injuryId, treatment.clinicLevel);
        nextInjuries = resolved.injuries;
        cleared = resolved.cleared;
      } else if (treatment.type === "TREAT_ILLNESS" && treatment.injuryId) {
        illnesses = illnesses.filter((i) => i.id !== treatment.injuryId);
        cleared = true;
      }

      await tx.chicken.update({
        where: { id: chicken.id },
        data: {
          injuries: nextInjuries as object,
          illnesses: illnesses as object,
          injured: nextInjuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
          status:
            nextInjuries.some((i) => !i.permanent && i.recoveryRemaining > 0) || chicken.status === "injured"
              ? nextInjuries.some((i) => !i.permanent && i.recoveryRemaining > 0)
                ? "injured"
                : "active"
              : chicken.status,
        },
      });

      await tx.medicalTreatment.update({
        where: { id: treatment.id },
        data: { status: "COMPLETED", completedAt: new Date(), result: { cleared } },
      });
    });
  }
}

/** Starts a clinic treatment for one injury (spec §126). Server calculates cost/duration; deducts credits up front. */
export async function startInjuryTreatment(playerId: string, chickenId: string, injuryId: string) {
  const clinic = await getOrCreateClinic(playerId);
  await claimExpiredTreatments(playerId);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Facility" WHERE id = ${clinic.id} FOR UPDATE`;

    const chicken = await tx.chicken.findUnique({ where: { id: chickenId } });
    if (!chicken) throw new MedicalError("CHICKEN_NOT_FOUND");
    if (chicken.playerId !== playerId) throw new MedicalError("CHICKEN_NOT_OWNED");

    const injuries = (chicken.injuries as unknown as InjuryRecord[]) ?? [];
    const injury = injuries.find((i) => i.id === injuryId);
    if (!injury) throw new MedicalError("INJURY_NOT_FOUND");
    if (injury.inTreatment) throw new MedicalError("INJURY_ALREADY_IN_TREATMENT");
    if (!canTreatSeverity(clinic.level, injury.severity)) throw new MedicalError("SEVERITY_NOT_TREATABLE");

    const plan = treatmentPlan(injury.severity, clinic.level);

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.credits < plan.cost) throw new MedicalError("INSUFFICIENT_CREDITS");

    await tx.player.update({ where: { id: playerId }, data: { credits: player.credits - plan.cost } });
    await tx.chicken.update({
      where: { id: chickenId },
      data: { injuries: markInTreatment(injuries, injuryId) as object },
    });

    return tx.medicalTreatment.create({
      data: {
        playerId,
        chickenId,
        injuryId,
        type: "TREAT_INJURY",
        status: "ACTIVE",
        effectiveness: plan.effectiveness,
        clinicLevel: clinic.level,
        cost: plan.cost,
        durationMinutes: plan.durationMinutes,
      },
    });
  });
}

/** A supervised medical rest cycle at the clinic (spec §24 "medical rest") — no credit cost, uses the recovery engine. */
export async function medicalRest(playerId: string, chickenId: string) {
  const clinic = await getOrCreateClinic(playerId);

  return prisma.$transaction(async (tx) => {
    const row = await tx.chicken.findUnique({ where: { id: chickenId } });
    if (!row) throw new MedicalError("CHICKEN_NOT_FOUND");
    if (row.playerId !== playerId) throw new MedicalError("CHICKEN_NOT_OWNED");

    const chicken = row as unknown as Chicken;
    const result = applyRecovery(chicken, "medical_rest", clinic.level);

    return tx.chicken.update({
      where: { id: chickenId },
      data: {
        energy: result.energy,
        condition: result.condition,
        stress: result.stress,
        morale: result.morale,
        trainingState: result.trainingState as object,
        injuries: result.injuries as object,
        illnesses: result.illnesses as object,
        injured: result.injuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
      },
    });
  });
}

export async function upgradeClinic(playerId: string, facilityId: string) {
  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new MedicalError("CLINIC_NOT_FOUND");
    if (facility.playerId !== playerId) throw new MedicalError("CLINIC_NOT_OWNED");
    if (facility.level >= CLINIC_MAX_LEVEL) throw new MedicalError("CLINIC_MAX_LEVEL");

    const nextLevel = facility.level + 1;
    const cost = CLINIC_UPGRADE_COST[nextLevel];

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.credits < cost) throw new MedicalError("INSUFFICIENT_CREDITS");

    await tx.player.update({ where: { id: playerId }, data: { credits: player.credits - cost } });
    return tx.facility.update({ where: { id: facilityId }, data: { level: nextLevel } });
  });
}

/** Roster-wide medical snapshot for the clinic dashboard (spec §91). */
export async function rosterMedicalOverview(playerId: string) {
  const chickens = await prisma.chicken.findMany({ where: { playerId }, orderBy: { createdAt: "asc" } });
  const treatments = await prisma.medicalTreatment.findMany({ where: { playerId, status: "ACTIVE" } });

  return chickens.map((c) => {
    const chicken = c as unknown as Chicken;
    const activeTreatment = treatments.find((t) => t.chickenId === c.id) ?? null;
    return {
      id: c.id,
      name: c.name,
      status: medicalStatus(chicken),
      condition: chicken.condition ?? 100,
      health: chicken.health ?? 100,
      stress: chicken.stress ?? 0,
      morale: chicken.morale ?? 75,
      injuries: chicken.injuries ?? [],
      illnesses: chicken.illnesses ?? [],
      activeTreatment: activeTreatment
        ? {
            id: activeTreatment.id,
            injuryId: activeTreatment.injuryId,
            startedAt: activeTreatment.startedAt,
            durationMinutes: activeTreatment.durationMinutes,
          }
        : null,
    };
  });
}
