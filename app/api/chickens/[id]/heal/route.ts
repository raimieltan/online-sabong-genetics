import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { healChicken } from "@/lib/combat";
import { getOrCreatePlayer } from "@/lib/player";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken || chicken.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const { injured, health } = healChicken();

  const updated = await prisma.chicken.update({
    where: { id },
    data: { injured, health },
  });

  return NextResponse.json(updated);
}
