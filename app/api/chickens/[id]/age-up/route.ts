import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { prisma } from "@/lib/db";
import { ageUpRequirements, canAgeUp, nextGrowthStage } from "@/lib/growth";
import type { Chicken, GrowthStage } from "@/lib/types";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleAgeUp(context);
}

export async function handleAgeUp(
  { params }: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  try {
    return await handlePost(params, deps);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handlePost(params: Promise<{ id: string }>, deps: { requirePlayer: typeof requirePlayer }) {
  const { id } = await params;
  const player = await deps.requirePlayer();
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
