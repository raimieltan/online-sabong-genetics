import { NextResponse } from "next/server";

import { applyFightOutcome, simulateFight } from "@/lib/combat";
import { buildBattleReport, type BattleReport } from "@/lib/combat/battleReport";
import { prisma } from "@/lib/db";
import { BATTLE_WIN_CREDITS, earnCredits } from "@/lib/economy";
import { calculatePayout } from "@/lib/live/bets";
import type { LiveMode } from "@/lib/live/matchup";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken } from "@/lib/types";

type ResolveBody = { matchId?: string };

/**
 * Closes the betting window and simulates the fight quoted by
 * /api/live/matchup — the odds computed there are honored here regardless
 * of what the sim rolls this time (a fresh simulateFight call, independent
 * of the Monte Carlo samples used to price it). Applies the same
 * fight-outcome/credit persistence as the old /api/live/next, then settles
 * whatever bet was placed on this match.
 */
export async function POST(request: Request) {
  const body: ResolveBody = await request.json();
  const { matchId } = body;
  if (!matchId) {
    return NextResponse.json({ error: "Missing matchId." }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const match = await prisma.liveMatch.findUnique({ where: { id: matchId } });
  if (!match || match.playerId !== player.id) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }
  if (match.status !== "open") {
    return NextResponse.json({ error: "Match already resolved." }, { status: 409 });
  }

  const mode = match.mode as LiveMode;
  const chickenA = match.chickenA as unknown as Chicken;
  const chickenB = match.chickenB as unknown as Chicken;

  const result = simulateFight(chickenA, chickenB);
  const ownedSides = mode === "pvp" ? [chickenA, chickenB] : mode === "pve" ? [chickenA] : [];

  let updatedA: Chicken = chickenA;
  let updatedB: Chicken = chickenB;
  let creditsEarned = 0;
  let credits = player.credits;
  let battleReportA: BattleReport | undefined;
  let battleReportB: BattleReport | undefined;

  if (ownedSides.length > 0) {
    const outcomeA = applyFightOutcome(chickenA, result);
    const outcomeB = mode === "pvp" ? applyFightOutcome(chickenB, result) : undefined;
    const { newTraits: _newTraitsA, ...persistedA } = outcomeA;
    let persistedB: Omit<typeof outcomeA, "newTraits"> | undefined;
    if (outcomeB) {
      const { newTraits: _newTraitsB, ...rest } = outcomeB;
      persistedB = rest;
    }
    const [rowA, rowB] = await Promise.all([
      prisma.chicken.update({ where: { id: chickenA.id }, data: persistedA }),
      persistedB
        ? prisma.chicken.update({ where: { id: chickenB.id }, data: persistedB })
        : Promise.resolve(chickenB),
    ]);
    updatedA = rowA as unknown as Chicken;
    updatedB = rowB as unknown as Chicken;
    battleReportA = buildBattleReport(chickenA, result, chickenA.id, outcomeA);
    battleReportB = outcomeB ? buildBattleReport(chickenB, result, chickenB.id, outcomeB) : undefined;

    if (ownedSides.some((c) => c.id === result.winnerId)) {
      creditsEarned = BATTLE_WIN_CREDITS;
      credits = earnCredits(credits, BATTLE_WIN_CREDITS);
    }
  }

  // Settle the bet, if any: side "A" wins iff chickenA won.
  let betWon: boolean | null = null;
  let betPayout = 0;
  if (match.betSide && match.betAmount) {
    const chickenAWon = result.winnerId === chickenA.id;
    betWon = match.betSide === "A" ? chickenAWon : !chickenAWon;
    if (betWon) {
      betPayout = calculatePayout(match.betAmount, match.betSide === "A" ? match.oddsA : match.oddsB);
      credits = earnCredits(credits, betPayout);
    }
  }

  await prisma.$transaction([
    prisma.player.update({ where: { id: player.id }, data: { credits } }),
    prisma.liveMatch.update({ where: { id: matchId }, data: { status: "resolved" } }),
  ]);

  return NextResponse.json({
    mode,
    chickenA,
    chickenB,
    updatedA,
    updatedB,
    result,
    log: result.log,
    battleReportA,
    battleReportB,
    creditsEarned,
    credits,
    betSide: match.betSide,
    betAmount: match.betAmount,
    betWon,
    betPayout,
  });
}
