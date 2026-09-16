import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { earnCredits } from "@/lib/economy";
import { sellPrice } from "@/lib/marketplace";
import type { Chicken } from "@/lib/types";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleSell(context);
}

export async function handleSell(
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
