import { NextResponse } from "next/server";

import { canAfford, spendCredits } from "@/lib/economy";
import type { BetSide } from "@/lib/live/bets";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";

type BetBody = { matchId?: string; side?: BetSide; amount?: number };

/**
 * Places (or replaces) the player's bet on an open /live matchup. Credits
 * are escrowed immediately — deducted here, and only paid back out by
 * /api/live/resolve if the bet wins. Re-posting before the window closes
 * refunds the previous stake and re-escrows the new one, so only one bet
 * is ever live per match.
 */
export async function POST(request: Request) {
  const body: BetBody = await request.json();
  const { matchId, side, amount } = body;

  if (!matchId || (side !== "A" && side !== "B") || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid bet." }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const match = await prisma.liveMatch.findUnique({ where: { id: matchId } });

  if (!match || match.playerId !== player.id) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  if (match.status !== "open" || match.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Betting has closed for this fight." }, { status: 409 });
  }

  // Refund any previous bet on this match before escrowing the new one.
  const refunded = match.betAmount ? player.credits + match.betAmount : player.credits;
  if (!canAfford(refunded, amount)) {
    return NextResponse.json({ error: "Not enough credits." }, { status: 400 });
  }

  const balanceAfter = spendCredits(refunded, amount);
  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({ where: { id: player.id }, data: { credits: balanceAfter } }),
    prisma.liveMatch.update({ where: { id: matchId }, data: { betSide: side, betAmount: amount } }),
  ]);

  return NextResponse.json({ credits: updatedPlayer.credits });
}
