import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canFight, generatePveOpponent } from "@/lib/combat";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken } from "@/lib/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken || chicken.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  if (!canFight(chicken as unknown as Chicken)) {
    return NextResponse.json({ error: "Chicken cannot battle right now" }, { status: 400 });
  }

  const { opponent, encounter } = generatePveOpponent(chicken as unknown as Chicken);

  return NextResponse.json({ opponent, encounter });
}
