import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { applyFightOutcome, canFight, simulateFight } from "@/lib/combat";
import { BATTLE_WIN_CREDITS, earnCredits } from "@/lib/economy";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { opponent } = (await request.json()) as { opponent?: Chicken };

  if (!opponent || !opponent.id) {
    return NextResponse.json({ error: "Missing opponent" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const chicken = row as unknown as Chicken;
  if (!canFight(chicken)) {
    return NextResponse.json({ error: "Chicken cannot battle right now" }, { status: 400 });
  }

  const result = simulateFight(chicken, opponent);
  const won = result.winnerId === chicken.id;
  const outcome = applyFightOutcome(chicken, result);

  const [updated, updatedPlayer] = await Promise.all([
    prisma.chicken.update({
      where: { id },
      data: outcome,
    }),
    won
      ? prisma.player.update({
          where: { id: player.id },
          data: { credits: earnCredits(player.credits, BATTLE_WIN_CREDITS) },
        })
      : Promise.resolve(player),
  ]);

  return NextResponse.json({
    result,
    log: result.log,
    chicken: updated,
    creditsEarned: won ? BATTLE_WIN_CREDITS : 0,
    credits: updatedPlayer.credits,
  });
}
