import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { ageUpRequirements, canAgeUp, nextGrowthStage } from "@/lib/growth";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken, GrowthStage } from "@/lib/types";

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
  const requirements = ageUpRequirements(chicken as unknown as Chicken);
  const unmet = requirements.filter((requirement) => !requirement.met);
  if (unmet.length > 0) {
    return NextResponse.json(
      { error: "Chicken is not ready to age up", requirements, unmetRequirements: unmet },
      { status: 400 }
    );
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
