import type { Facility } from "@prisma/client";

import { declineMultiplier, deriveLifeStage } from "../career/aging";
import { createInjuryRecord } from "../combat/injuries";
import { prisma } from "../db";
import { canTrain } from "../growth";
import { isTrainingLocked } from "../medical/rehab";
import { applyDevelopment } from "../training/development";
import { canAffordTrainingPoints, defaultTrainingState, overtrainingInjuryChance, TRAINING_POINT_COST } from "../training/limits";
import {
  TRAINING_GYM_LEVELS,
  TRAINING_GYM_MAX_LEVEL,
  TRAINING_GYM_UPGRADES,
  TRAINING_PROGRAMS,
  isProgramUnlocked,
} from "./config";
import { FacilityError } from "./errors";
import type { FacilityType, ProgramId } from "./types";
import {
  TRAINING_CATEGORIES,
  type Chicken,
  type GrowthStage,
  type InjuryRecord,
  type StatBlock,
  type TrainingCategory,
  type TrainingState,
} from "../types";

const TRAINING_GYM: FacilityType = "TRAINING_GYM";

export async function getOrCreateTrainingGym(playerId: string): Promise<Facility> {
  const existing = await prisma.facility.findUnique({
    where: { playerId_type: { playerId, type: TRAINING_GYM } },
  });
  if (existing) return existing;

  return prisma.facility.create({ data: { playerId, type: TRAINING_GYM, level: 1 } });
}

export function facilityView(facility: Facility): {
  id: string;
  type: string;
  level: number;
  capacity: number;
  efficiency: number;
  unlockedPrograms: ProgramId[];
} {
  const config = TRAINING_GYM_LEVELS[facility.level];
  return {
    id: facility.id,
    type: facility.type,
    level: facility.level,
    capacity: config.capacity,
    efficiency: config.efficiency,
    unlockedPrograms: config.programs,
  };
}

function resolveCategory(programId: ProgramId, requestedCategory?: TrainingCategory): TrainingCategory {
  const program = TRAINING_PROGRAMS[programId];
  if (program.category !== "custom") return program.category;
  if (!requestedCategory || !TRAINING_CATEGORIES.includes(requestedCategory)) {
    throw new FacilityError("INVALID_CATEGORY");
  }
  return requestedCategory;
}

export async function startTrainingSession(
  playerId: string,
  chickenId: string,
  programId: ProgramId,
  category?: TrainingCategory,
) {
  const program = TRAINING_PROGRAMS[programId];
  if (!program) throw new FacilityError("PROGRAM_NOT_FOUND");

  const facility = await getOrCreateTrainingGym(playerId);
  await claimExpiredSessions(playerId);

  if (!isProgramUnlocked(programId, facility.level)) throw new FacilityError("PROGRAM_LOCKED");
  const resolvedCategory = resolveCategory(programId, category);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Facility" WHERE id = ${facility.id} FOR UPDATE`;

    const chicken = await tx.chicken.findUnique({ where: { id: chickenId } });
    if (!chicken) throw new FacilityError("CHICKEN_NOT_FOUND");
    if (chicken.playerId !== playerId) throw new FacilityError("CHICKEN_NOT_OWNED");
    if (!canTrain(chicken.growthStage as GrowthStage)) throw new FacilityError("CHICKEN_NOT_ELIGIBLE");
    if (chicken.energy < program.energyCost) throw new FacilityError("INSUFFICIENT_ENERGY");

    const activeInjuries = ((chicken.injuries as unknown as InjuryRecord[]) ?? []).filter(
      (i) => i.permanent || i.recoveryRemaining > 0,
    );
    if (isTrainingLocked(activeInjuries, resolvedCategory)) throw new FacilityError("TRAINING_LOCKED_BY_INJURY");

    const trainingState = (chicken.trainingState as unknown as TrainingState) ?? defaultTrainingState();
    if (!canAffordTrainingPoints(trainingState)) throw new FacilityError("TRAINING_LIMIT_REACHED");

    const alreadyTraining = await tx.trainingSession.findFirst({
      where: { chickenId, status: "ACTIVE" },
    });
    if (alreadyTraining) throw new FacilityError("CHICKEN_ALREADY_TRAINING");

    const activeCount = await tx.trainingSession.count({
      where: { facilityId: facility.id, status: "ACTIVE" },
    });
    if (activeCount >= TRAINING_GYM_LEVELS[facility.level].capacity) {
      throw new FacilityError("FACILITY_CAPACITY_FULL");
    }

    return tx.trainingSession.create({
      data: {
        playerId,
        chickenId,
        facilityId: facility.id,
        programId,
        category: resolvedCategory,
        status: "ACTIVE",
        durationMinutes: program.durationMinutes,
        energyCost: program.energyCost,
        fatigueCost: program.fatigueCost,
        workload: program.workload,
      },
    });
  });
}

export async function cancelTrainingSession(playerId: string, sessionId: string) {
  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.playerId !== playerId) throw new FacilityError("SESSION_NOT_FOUND");
  if (session.status !== "ACTIVE") throw new FacilityError("SESSION_NOT_ACTIVE");

  return prisma.trainingSession.update({
    where: { id: sessionId },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
}

export async function claimExpiredSessions(playerId: string): Promise<void> {
  const candidates = await prisma.trainingSession.findMany({
    where: { playerId, status: "ACTIVE" },
  });

  for (const candidate of candidates) {
    const dueAt = candidate.startedAt.getTime() + candidate.durationMinutes * 60_000;
    if (Date.now() < dueAt) continue;

    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "TrainingSession" WHERE id = ${candidate.id} FOR UPDATE
      `;
      if (!locked[0] || locked[0].status !== "ACTIVE") return; // already claimed by a concurrent call

      const chicken = await tx.chicken.findUnique({ where: { id: candidate.chickenId } });
      if (!chicken) return;

      const program = TRAINING_PROGRAMS[candidate.programId as ProgramId];
      const facility = await tx.facility.findUnique({ where: { id: candidate.facilityId } });
      const efficiency = facility ? TRAINING_GYM_LEVELS[facility.level].efficiency : 1;

      const trainingState = (chicken.trainingState as unknown as TrainingState) ?? defaultTrainingState();
      const lifeStageMultiplier = declineMultiplier(deriveLifeStage(chicken as unknown as Chicken));

      const ev = applyDevelopment({
        ev: chicken.ev as StatBlock,
        category: candidate.category as TrainingCategory,
        baseGain: program.baseGain * efficiency,
        trainingFatigue: trainingState.trainingFatigue,
        lifeStageMultiplier,
      });

      const nextTrainingState: TrainingState = {
        trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
        trainingFatigue: Math.min(100, trainingState.trainingFatigue + candidate.fatigueCost),
        history: [
          ...trainingState.history,
          { category: candidate.category as TrainingCategory, programId: candidate.programId, at: Date.now() },
        ].slice(-50),
      };

      let injuries = (chicken.injuries as unknown as InjuryRecord[]) ?? [];
      if (Math.random() < overtrainingInjuryChance(nextTrainingState.trainingFatigue)) {
        injuries = [...injuries, createInjuryRecord(Math.random, "minor")];
      }

      const adaptationResult = { ev, category: candidate.category, programId: candidate.programId };

      await tx.chicken.update({
        where: { id: candidate.chickenId },
        data: {
          ev,
          energy: Math.max(0, chicken.energy - candidate.energyCost),
          trainingState: nextTrainingState,
          injuries,
          injured: injuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
        },
      });

      await tx.trainingSession.update({
        where: { id: candidate.id },
        data: { status: "COMPLETED", completedAt: new Date(), adaptationResult },
      });
    });
  }
}

export async function upgradeFacility(playerId: string, facilityId: string) {
  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new FacilityError("FACILITY_NOT_FOUND");
    if (facility.playerId !== playerId) throw new FacilityError("FACILITY_NOT_OWNED");
    if (facility.level >= TRAINING_GYM_MAX_LEVEL) throw new FacilityError("FACILITY_MAX_LEVEL");

    const nextLevel = facility.level + 1;
    const cost = TRAINING_GYM_UPGRADES[nextLevel].cost;

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.credits < cost) throw new FacilityError("INSUFFICIENT_RESOURCES");

    await tx.player.update({ where: { id: playerId }, data: { credits: player.credits - cost } });
    return tx.facility.update({ where: { id: facilityId }, data: { level: nextLevel } });
  });
}
