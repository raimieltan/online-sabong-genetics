import { NextResponse } from "next/server";

import { canFight } from "@/lib/combat";
import { createTournamentBattleSession } from "@/lib/combat/liveBattleSessions";
import { LiveCombatV2Session, MAX_TURNS } from "@/lib/combat-v2/liveSession";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import { currentOpponent } from "@/lib/tournament";
import { TournamentError } from "@/lib/tournament/errors";
import { getTournament } from "@/lib/tournament/service";
import type { Chicken } from "@/lib/types";

/** Opens the actual server-owned V2 session for this tournament's next match. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  try {
    const tournament = await getTournament(player.id, id);
    if (tournament.status === "complete") throw new TournamentError("TOURNAMENT_COMPLETE");
    const row = await prisma.chicken.findUnique({ where: { id: tournament.chickenId } });
    const chicken = row as unknown as Chicken | null;
    if (!chicken || !canFight(chicken)) throw new TournamentError("CHICKEN_NOT_ELIGIBLE");
    const opponent = currentOpponent(tournament);
    if (!opponent) throw new TournamentError("TOURNAMENT_FIGHT_INVALID");
    const session = new LiveCombatV2Session(chicken, opponent.chicken);
    const sessionId = createTournamentBattleSession(session, id, player.id);
    return NextResponse.json({ sessionId, matchSeed: session.matchSeed, chickenA: chicken, chickenB: opponent.chicken, snapshotA: session.snapshotA(), snapshotB: session.snapshotB(), maxTurns: MAX_TURNS });
  } catch (error) {
    if (error instanceof TournamentError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
