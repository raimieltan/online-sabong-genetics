import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canFight, finalHealthPercent } from "@/lib/combat";
import { generateBracketOpponents, runTournament } from "@/lib/tournament";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken, CombatRecord } from "@/lib/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const chicken = row as unknown as Chicken;
  if (!canFight(chicken)) {
    return NextResponse.json({ error: "Chicken cannot battle right now" }, { status: 400 });
  }

  const opponents = generateBracketOpponents(chicken);
  const outcome = runTournament(chicken, opponents);

  const wins = outcome.matches.filter((m) => m.winnerId === chicken.id).length;
  const losses = outcome.matches.length - wins;
  const lastMatch = outcome.matches[outcome.matches.length - 1];
  const wasInjured = lastMatch.injuredChickenId === chicken.id;

  const record = chicken.record as CombatRecord;
  const updatedRecord: CombatRecord = {
    ...record,
    wins: record.wins + wins,
    losses: record.losses + losses,
    championships: record.championships + (outcome.placement === 1 ? 1 : 0),
    koTko: record.koTko + outcome.matches.filter((m) => m.winnerId === chicken.id && m.outcomeReason !== "timeout").length,
    decisions: record.decisions + outcome.matches.filter((m) => m.outcomeReason === "timeout").length,
  };

  const [updatedChicken, updatedPlayer] = await Promise.all([
    prisma.chicken.update({
      where: { id },
      data: {
        record: updatedRecord,
        health: finalHealthPercent(lastMatch, chicken),
        injured: wasInjured,
        status: wasInjured ? "injured" : chicken.status,
      },
    }),
    outcome.tokensAwarded > 0
      ? prisma.player.update({
          where: { id: player.id },
          data: { tournamentTokens: player.tournamentTokens + outcome.tokensAwarded },
        })
      : Promise.resolve(player),
  ]);

  return NextResponse.json({
    matches: outcome.matches,
    opponentsFought: outcome.opponentsFought,
    placement: outcome.placement,
    tokensAwarded: outcome.tokensAwarded,
    tournamentTokens: updatedPlayer.tournamentTokens,
    chicken: updatedChicken,
  });
}
