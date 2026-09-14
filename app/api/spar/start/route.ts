import { NextResponse } from "next/server";

import { canFight, generatePveOpponent } from "@/lib/combat";
import { BattleSession, MAX_TURNS } from "@/lib/combat/simulator";
import { createSparSession } from "@/lib/combat/sparSessions";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken } from "@/lib/types";

type StartBody = { chickenId?: string };

/**
 * Starts a live spar: side A is the player's own rooster (player-coached via
 * /api/spar/[sessionId]/step), side B is a freshly generated PvE opponent
 * (Auto-Coached) — same matchup source /api/chickens/[id]/opponent uses, but
 * nothing here is persisted to the roster until the spar actually ends
 * (spec: this is for trying out a rooster's strategy-fighter behavior, not a
 * scored match).
 */
export async function POST(request: Request) {
  const body: StartBody = await request.json();
  const { chickenId } = body;
  if (!chickenId) {
    return NextResponse.json({ error: "Missing chickenId." }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id: chickenId } });
  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found." }, { status: 404 });
  }
  const chickenA = row as unknown as Chicken;
  if (!canFight(chickenA)) {
    return NextResponse.json({ error: "Chicken cannot battle right now." }, { status: 400 });
  }

  const { opponent: chickenB, encounter } = generatePveOpponent(chickenA);
  const session = new BattleSession(chickenA, chickenB);
  const sessionId = createSparSession(session);

  return NextResponse.json({
    sessionId,
    chickenA,
    chickenB,
    encounter,
    maxTurns: MAX_TURNS,
    snapshotA: session.snapshotA(),
    snapshotB: session.snapshotB(),
  });
}
