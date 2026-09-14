import { prisma } from "../db";
import { defaultRoosterTrainingState } from "./state";
import { rollTrainingPotential } from "./potential";
import { redistributeEffort, REDISTRIBUTE_CREDITS_PER_POINT } from "./effort";
import { TrainingError } from "./errors";
import type { GeneticStatKey, RoosterTrainingState, StatBlock } from "../types";

function toState(row: {
  physicalXP: number;
  combatXP: number;
  tacticalXP: number;
  disciplineXP: number;
  recoveryXP: number;
  effortSpent: unknown;
  trainingPotential: unknown;
  discovered: unknown;
  traits: unknown;
  breakthroughs: unknown;
  traitProgress?: unknown;
  specializationProgress?: unknown;
}): RoosterTrainingState {
  return {
    physicalXP: row.physicalXP,
    combatXP: row.combatXP,
    tacticalXP: row.tacticalXP,
    disciplineXP: row.disciplineXP,
    recoveryXP: row.recoveryXP,
    effortSpent: row.effortSpent as StatBlock,
    trainingPotential: row.trainingPotential as StatBlock,
    discovered: row.discovered as RoosterTrainingState["discovered"],
    traits: row.traits as RoosterTrainingState["traits"],
    breakthroughs: row.breakthroughs as RoosterTrainingState["breakthroughs"],
    traitProgress: (row.traitProgress as Record<string, number>) ?? {},
    specializationProgress: (row.specializationProgress as Record<string, number>) ?? {},
  };
}

/** Lazily creates the per-chicken RoosterTraining row, rolling trainingPotential once from IV (design spec: Data model). */
export async function getOrCreateRoosterTraining(
  chickenId: string,
  iv: StatBlock
): Promise<RoosterTrainingState & { id: string }> {
  const existing = await prisma.roosterTraining.findUnique({ where: { chickenId } });
  if (existing) return { id: existing.id, ...toState(existing) };

  const trainingPotential = rollTrainingPotential(iv, Math.random);
  const fresh = defaultRoosterTrainingState(trainingPotential);
  const created = await prisma.roosterTraining.create({
    data: {
      chickenId,
      physicalXP: fresh.physicalXP,
      combatXP: fresh.combatXP,
      tacticalXP: fresh.tacticalXP,
      disciplineXP: fresh.disciplineXP,
      recoveryXP: fresh.recoveryXP,
      effortSpent: fresh.effortSpent as object,
      trainingPotential: fresh.trainingPotential as object,
      discovered: fresh.discovered as object,
      traits: fresh.traits as object,
      breakthroughs: fresh.breakthroughs as object,
      traitProgress: fresh.traitProgress as object,
      specializationProgress: fresh.specializationProgress as object,
    },
  });
  return { id: created.id, ...toState(created) };
}

/** Moves spent Training Effort between two stats for a chicken, debiting the player REDISTRIBUTE_CREDITS_PER_POINT per point moved. */
export async function redistributeEffortForChicken(
  playerId: string,
  chickenId: string,
  from: GeneticStatKey,
  to: GeneticStatKey,
  amount: number
): Promise<RoosterTrainingState> {
  if (amount <= 0) throw new TrainingError("INVALID_REDISTRIBUTE_AMOUNT");

  return prisma.$transaction(async (tx) => {
    const chicken = await tx.chicken.findUnique({ where: { id: chickenId } });
    if (!chicken) throw new TrainingError("CHICKEN_NOT_FOUND");
    if (chicken.playerId !== playerId) throw new TrainingError("CHICKEN_NOT_OWNED");

    const row = await tx.roosterTraining.findUnique({ where: { chickenId } });
    if (!row) throw new TrainingError("ROOSTER_TRAINING_NOT_FOUND");

    const state = toState(row);
    const cost = amount * REDISTRIBUTE_CREDITS_PER_POINT;

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.credits < cost) throw new TrainingError("INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE");

    let effortSpent: StatBlock;
    try {
      effortSpent = redistributeEffort(state, from, to, amount);
    } catch {
      throw new TrainingError("INVALID_REDISTRIBUTE_AMOUNT");
    }

    await tx.player.update({ where: { id: playerId }, data: { credits: player.credits - cost } });
    const updated = await tx.roosterTraining.update({
      where: { chickenId },
      data: { effortSpent: effortSpent as object },
    });

    return toState(updated);
  });
}
