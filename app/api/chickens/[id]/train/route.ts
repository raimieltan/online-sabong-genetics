import { NextResponse } from "next/server";

import { createInjuryRecord } from "@/lib/combat/injuries";
import { prisma } from "@/lib/db";
import { canTrain } from "@/lib/growth";
import { getOrCreatePlayer } from "@/lib/player";
import { canAffordTraining, overtrainingInjuryChance, trainStat } from "@/lib/training";
import { GENETIC_STAT_KEYS, type Chicken, type GeneticStatKey, type GrowthStage, type InjuryRecord } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { stat } = (await request.json()) as { stat?: string };

  if (!stat || !GENETIC_STAT_KEYS.includes(stat as GeneticStatKey)) {
    return NextResponse.json({ error: "Invalid stat" }, { status: 400 });
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

  const { ev, energy, trainingState } = trainStat(chicken, stat as GeneticStatKey);

  // Overtraining risk (spec §23): pushing a fatigued training schedule can injure, not just under-deliver.
  let injuries: InjuryRecord[] = chicken.injuries ?? [];
  if (Math.random() < overtrainingInjuryChance(trainingState.trainingFatigue)) {
    injuries = [...injuries, createInjuryRecord(Math.random, "minor")];
  }

  const updated = await prisma.chicken.update({
    where: { id },
    data: { ev, energy, trainingState, injuries, injured: injuries.some((i) => !i.permanent && i.recoveryRemaining > 0) },
  });

  return NextResponse.json(updated);
}
