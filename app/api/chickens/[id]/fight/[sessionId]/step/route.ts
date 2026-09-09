import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { applyFightOutcome } from "@/lib/combat";
import { autoCoachPolicy } from "@/lib/combat/autoCoach";
import { MAX_TURNS } from "@/lib/combat/simulator";
import { buildBattleReport } from "@/lib/combat/battleReport";
import { endBattleSession, getBattleSession } from "@/lib/combat/liveBattleSessions";
import type { PlayerCommand } from "@/lib/combat/command";
import { BATTLE_WIN_CREDITS, earnCredits } from "@/lib/economy";
import { getOrCreatePlayer } from "@/lib/player";

type StepBody = { command?: PlayerCommand | null };

/**
 * Advances a live main battle by exactly one turn: side A (the player's
 * rooster) takes whatever command was just clicked (or none), side B is
 * always Auto-Coached. The moment the fight ends, this applies the exact
 * same persisted outcome the old one-shot `/fight` route did (roster
 * HP/condition/injuries/XP, win credits) before dropping the session.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const session = getBattleSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Battle session not found or already ended." }, { status: 404 });
  }

  const body: StepBody = await request.json().catch(() => ({}));
  const step = session.step(body.command ?? null, autoCoachPolicy());
  const done = step.fightOver || session.turn >= MAX_TURNS;

  if (!done) {
    return NextResponse.json({
      turn: step.turn,
      entries: step.entries,
      fightOver: false,
      durationMs: step.durationMs,
      snapshotA: session.snapshotA(),
      snapshotB: session.snapshotB(),
    });
  }

  const result = session.finalize();
  endBattleSession(sessionId);

  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });
  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const chicken = row as unknown as import("@/lib/types").Chicken;
  const won = result.winnerId === chicken.id;
  const outcome = applyFightOutcome(chicken, result);
  const battleReport = buildBattleReport(chicken, result, chicken.id, outcome);
  // `newTraits` is a derived summary field for the battle report, not a
  // Chicken column — passing it through to Prisma throws a validation error.
  const { newTraits: _newTraits, ...persistedOutcome } = outcome;

  const [updated, updatedPlayer] = await Promise.all([
    prisma.chicken.update({ where: { id }, data: persistedOutcome }),
    won
      ? prisma.player.update({
          where: { id: player.id },
          data: { credits: earnCredits(player.credits, BATTLE_WIN_CREDITS) },
        })
      : Promise.resolve(player),
  ]);

  return NextResponse.json({
    turn: step.turn,
    entries: step.entries,
    fightOver: true,
    durationMs: step.durationMs,
    snapshotA: session.snapshotA(),
    snapshotB: session.snapshotB(),
    result,
    log: result.log,
    chicken: updated,
    battleReport,
    creditsEarned: won ? BATTLE_WIN_CREDITS : 0,
    credits: updatedPlayer.credits,
  });
}
