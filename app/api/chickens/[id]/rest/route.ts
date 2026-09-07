import { NextResponse } from "next/server";

import { recoverCondition } from "@/lib/career/condition";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import { defaultTrainingState, restEnergy, restTrainingState } from "@/lib/training";
import type { Chicken } from "@/lib/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  const chicken = row as unknown as Chicken;

  const { energy } = restEnergy();
  const trainingState = restTrainingState(chicken.trainingState ?? defaultTrainingState());
  const condition = recoverCondition(chicken.condition ?? 100);

  const updated = await prisma.chicken.update({
    where: { id },
    data: { energy, trainingState, condition },
  });

  return NextResponse.json(updated);
}
