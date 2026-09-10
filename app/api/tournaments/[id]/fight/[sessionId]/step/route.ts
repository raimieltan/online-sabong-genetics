import { NextResponse } from "next/server";

import { autoCoachPolicy } from "@/lib/combat/autoCoach";
import { endBattleSession, getTournamentBattleSession } from "@/lib/combat/liveBattleSessions";
import type { PlayerCommand } from "@/lib/combat/command";
import { MAX_TURNS } from "@/lib/combat-v2/liveSession";
import { getOrCreatePlayer } from "@/lib/player";
import { TournamentError } from "@/lib/tournament/errors";
import { completeTournamentRound } from "@/lib/tournament/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const player = await getOrCreatePlayer();
  const live = getTournamentBattleSession(sessionId);
  if (!live || live.tournamentId !== id || live.playerId !== player.id) return NextResponse.json({ error: "Tournament battle session not found." }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { command?: PlayerCommand | null };
  const step = live.session.step(body.command ?? null, autoCoachPolicy());
  const fightOver = step.fightOver || live.session.turn >= MAX_TURNS;
  if (!fightOver) return NextResponse.json({ ...step, snapshotA: live.session.snapshotA(), snapshotB: live.session.snapshotB() });
  const result = live.session.finalize();
  endBattleSession(sessionId);
  try {
    const outcome = await completeTournamentRound(player.id, id, result);
    return NextResponse.json({ ...step, fightOver: true, result, log: result.log, snapshotA: live.session.snapshotA(), snapshotB: live.session.snapshotB(), ...outcome });
  } catch (error) {
    if (error instanceof TournamentError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
