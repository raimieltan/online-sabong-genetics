import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { earnCredits } from "@/lib/economy";
import { sellPrice } from "@/lib/marketplace";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken } from "@/lib/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const payout = sellPrice(row as unknown as Chicken);

  const [, updatedPlayer] = await prisma.$transaction([
    prisma.chicken.delete({ where: { id } }),
    prisma.player.update({
      where: { id: player.id },
      data: { credits: earnCredits(player.credits, payout) },
    }),
  ]);

  return NextResponse.json({ creditsEarned: payout, credits: updatedPlayer.credits });
}
