import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canFight } from "@/lib/combat";
import { BattleSession, MAX_TURNS } from "@/lib/combat/simulator";
import { createBattleSession } from "@/lib/combat/liveBattleSessions";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken } from "@/lib/types";

/**
 * Starts a live, steppable main battle: side A is the player's owned rooster
 * (coached one turn at a time via /api/chickens/[id]/fight/[sessionId]/step),
 * side B is the opponent already previewed on the matchup screen (from
 * /api/chickens/[id]/opponent) — passed in rather than regenerated so the
 * fight is against the exact matchup the player saw and accepted.
 */
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

  const chickenA = row as unknown as Chicken;
  if (!canFight(chickenA)) {
    return NextResponse.json({ error: "Chicken cannot battle right now" }, { status: 400 });
  }

  const session = new BattleSession(chickenA, opponent);
  const sessionId = createBattleSession(session);

  return NextResponse.json({
    sessionId,
    chickenA,
    chickenB: opponent,
    maxTurns: MAX_TURNS,
    snapshotA: session.snapshotA(),
    snapshotB: session.snapshotB(),
  });
}
