import { NextResponse } from "next/server";

import { autoCoachPolicy } from "@/lib/combat/autoCoach";
import { MAX_TURNS } from "@/lib/combat/simulator";
import { endSparSession, getSparSession } from "@/lib/combat/sparSessions";
import type { PlayerCommand } from "@/lib/combat/command";

type StepBody = { command?: PlayerCommand | null };

/**
 * Advances a spar session by exactly one turn: side A takes whatever command
 * the player just clicked (or none — a turn with no command issued is still
 * a valid turn), side B is always Auto-Coached (Task 13's default policy).
 * Ends and drops the session server-side the moment the fight is over so a
 * forgotten tab doesn't leak sessions indefinitely.
 */
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = getSparSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Spar session not found or already ended." }, { status: 404 });
  }

  const body: StepBody = await request.json().catch(() => ({}));
  const step = session.step(body.command ?? null, autoCoachPolicy());

  const done = step.fightOver || session.turn >= MAX_TURNS;
  const result = done ? session.finalize() : undefined;
  if (done) endSparSession(sessionId);

  return NextResponse.json({
    turn: step.turn,
    entries: step.entries,
    fightOver: done,
    durationMs: step.durationMs,
    snapshotA: session.snapshotA(),
    snapshotB: session.snapshotB(),
    result,
  });
}
