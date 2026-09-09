import { NextResponse } from "next/server";

import type { PlayerCommand } from "@/lib/combat/command";
import { autoCoachPolicy } from "@/lib/combat/autoCoach";
import { MAX_TURNS } from "@/lib/combat-v2/liveSession";
import { getBossFightSession } from "@/lib/pve/bossFightSessions";
import { PveError } from "@/lib/pve/errors";
import { getOrCreatePlayer } from "@/lib/player";
import { finishBossFight } from "@/lib/pve/service";

type StepBody = { command?: PlayerCommand | null };

/**
 * Advances a live boss fight by exactly one turn: side A (the player's
 * rooster) takes whatever command was just clicked (or none), side B (the
 * boss) is always Auto-Coached. The moment the fight ends, this settles and
 * persists the real outcome via `finishBossFight` (rewards, roster update,
 * boss progress) — mirrors /api/spar's step route, except spar never
 * persists anything.
 */
export async function POST(request: Request, { params }: { params: Promise<{ bossId: string; sessionId: string }> }) {
  const { sessionId } = await params;
  const player = await getOrCreatePlayer();

  const entry = getBossFightSession(sessionId);
  if (!entry || entry.playerId !== player.id) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  const body: StepBody = await request.json().catch(() => ({}));
  const step = entry.session.step(body.command ?? null, autoCoachPolicy());

  const fightOver = step.fightOver || entry.session.turn >= MAX_TURNS;
  if (!fightOver) {
    return NextResponse.json({
      turn: step.turn,
      entries: step.entries,
      fightOver: false,
      snapshotA: entry.session.snapshotA(),
      snapshotB: entry.session.snapshotB(),
    });
  }

  try {
    const outcome = await finishBossFight(player.id, sessionId);
    return NextResponse.json({
      turn: step.turn,
      entries: step.entries,
      fightOver: true,
      snapshotA: entry.session.snapshotA(),
      snapshotB: entry.session.snapshotB(),
      outcome,
    });
  } catch (err) {
    if (err instanceof PveError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
