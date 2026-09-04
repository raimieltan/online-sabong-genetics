import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canTrain } from "@/lib/growth";
import { getOrCreatePlayer } from "@/lib/player";
import { canAffordTraining, trainStat } from "@/lib/training";
import { GENETIC_STAT_KEYS, type Chicken, type GeneticStatKey, type GrowthStage } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { stat } = (await request.json()) as { stat?: string };

  if (!stat || !GENETIC_STAT_KEYS.includes(stat as GeneticStatKey)) {
    return NextResponse.json({ error: "Invalid stat" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken || chicken.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  if (!canTrain(chicken.growthStage as GrowthStage)) {
    return NextResponse.json({ error: "Chicken cannot train at this growth stage" }, { status: 400 });
  }
  if (!canAffordTraining(chicken.energy)) {
    return NextResponse.json({ error: "Not enough energy to train" }, { status: 400 });
  }

  const { ev, energy } = trainStat(chicken as unknown as Chicken, stat as GeneticStatKey);

  const updated = await prisma.chicken.update({
    where: { id },
    data: { ev, energy },
  });

  return NextResponse.json(updated);
}
