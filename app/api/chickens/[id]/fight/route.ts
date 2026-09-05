import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canFight, finalHealthPercent, simulateFight } from "@/lib/combat";
import { BATTLE_WIN_CREDITS, earnCredits } from "@/lib/economy";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken, CombatRecord } from "@/lib/types";

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
  const wasInjured = result.injuredChickenId === chicken.id;

  const record = chicken.record as CombatRecord;
  const updatedRecord: CombatRecord = {
    ...record,
    wins: record.wins + (won ? 1 : 0),
    losses: record.losses + (won ? 0 : 1),
    koTko: record.koTko + (won && result.outcomeReason !== "timeout" ? 1 : 0),
    decisions: record.decisions + (result.outcomeReason === "timeout" ? 1 : 0),
  };

  const [updated, updatedPlayer] = await Promise.all([
    prisma.chicken.update({
      where: { id },
      data: {
        record: updatedRecord,
        health: finalHealthPercent(result, chicken),
        injured: wasInjured,
        status: wasInjured ? "injured" : chicken.status,
      },
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
