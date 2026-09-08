import { NextResponse } from "next/server";

import { createInjuryRecord } from "@/lib/combat/injuries";
import { prisma } from "@/lib/db";
import { canTrain } from "@/lib/growth";
import { getOrCreatePlayer } from "@/lib/player";
import { canAffordTraining, overtrainingInjuryChance, trainStat } from "@/lib/training";
import { getOrCreateRoosterTraining } from "@/lib/training/service";
import {
  GENETIC_STAT_KEYS,
  TRAINING_INTENSITIES,
  type Chicken,
  type GeneticStatKey,
  type GrowthStage,
  type InjuryRecord,
  type TrainingIntensity,
} from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { stat, intensity } = (await request.json()) as { stat?: string; intensity?: string };

  if (!stat || !GENETIC_STAT_KEYS.includes(stat as GeneticStatKey)) {
    return NextResponse.json({ error: "Invalid stat" }, { status: 400 });
  }
  if (intensity && !TRAINING_INTENSITIES.includes(intensity as TrainingIntensity)) {
    return NextResponse.json({ error: "Invalid intensity" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  const chicken = row as unknown as Chicken;
  if (!canTrain(chicken.growthStage as GrowthStage)) {
    return NextResponse.json({ error: "Chicken cannot train at this growth stage" }, { status: 400 });
  }
  if (!canAffordTraining(chicken.energy)) {
    return NextResponse.json({ error: "Not enough energy to train" }, { status: 400 });
  }

  const roosterTraining = await getOrCreateRoosterTraining(id, chicken.iv);
  const { ev, energy, trainingState, stressGain, roosterTraining: nextRoosterTraining, breakthrough } = trainStat(
    chicken,
    stat as GeneticStatKey,
    undefined,
    { intensity: intensity as TrainingIntensity | undefined, roosterTraining }
  );

  // Overtraining risk (spec §23): pushing a fatigued training schedule can injure, not just under-deliver.
  let injuries: InjuryRecord[] = chicken.injuries ?? [];
  if (Math.random() < overtrainingInjuryChance(trainingState.trainingFatigue)) {
    injuries = [...injuries, createInjuryRecord(Math.random, "minor")];
  }

  const updated = await prisma.chicken.update({
    where: { id },
    data: {
      ev,
      energy,
      trainingState,
      injuries,
      injured: injuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
      stress: stressGain ? Math.min(100, (chicken.stress ?? 0) + stressGain) : chicken.stress,
    },
  });

  if (nextRoosterTraining) {
    await prisma.roosterTraining.update({
      where: { chickenId: id },
      data: {
        physicalXP: nextRoosterTraining.physicalXP,
        combatXP: nextRoosterTraining.combatXP,
        tacticalXP: nextRoosterTraining.tacticalXP,
        disciplineXP: nextRoosterTraining.disciplineXP,
        recoveryXP: nextRoosterTraining.recoveryXP,
        effortSpent: nextRoosterTraining.effortSpent as object,
        discovered: nextRoosterTraining.discovered as object,
        traits: nextRoosterTraining.traits as object,
        breakthroughs: nextRoosterTraining.breakthroughs as object,
      },
    });
  }

  return NextResponse.json({ ...updated, roosterTraining: nextRoosterTraining, stressGain, breakthrough });
}
