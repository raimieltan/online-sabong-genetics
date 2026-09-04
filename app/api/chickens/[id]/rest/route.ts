import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import { restEnergy } from "@/lib/training";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken || chicken.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const { energy } = restEnergy();

  const updated = await prisma.chicken.update({
    where: { id },
    data: { energy },
  });

  return NextResponse.json(updated);
}
