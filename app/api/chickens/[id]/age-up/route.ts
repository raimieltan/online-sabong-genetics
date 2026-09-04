import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canAgeUp, nextGrowthStage } from "@/lib/growth";
import { getOrCreatePlayer } from "@/lib/player";
import type { GrowthStage } from "@/lib/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken || chicken.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  if (!canAgeUp(chicken.growthStage as GrowthStage)) {
    return NextResponse.json({ error: "Chicken cannot age up further" }, { status: 400 });
  }

  const updated = await prisma.chicken.update({
    where: { id },
    data: {
      growthStage: nextGrowthStage(chicken.growthStage as GrowthStage),
      age: chicken.age + 1,
    },
  });

  return NextResponse.json(updated);
}
