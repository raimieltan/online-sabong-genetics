import { NextResponse } from "next/server";

import { canRetire, retireChicken } from "@/lib/career/retirement";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken, GrowthStage } from "@/lib/types";

/**
 * Retirement preserves the whole record — genetics, bloodline, career stats,
 * mutations, traits, descendants — it only flips status/growthStage (spec
 * §33-34), so a retired chicken keeps its full value for breeding/legacy.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const chicken = row as unknown as Chicken;
  if (!canRetire(chicken.growthStage as GrowthStage)) {
    return NextResponse.json({ error: "Chicken cannot retire at this growth stage" }, { status: 400 });
  }

  const updated = await prisma.chicken.update({
    where: { id },
    data: retireChicken(),
  });

  return NextResponse.json(updated);
}
