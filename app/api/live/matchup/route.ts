import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { prisma } from "@/lib/db";
import { BETTING_WINDOW_MS } from "@/lib/live/bets";
import { pickLiveMatchup } from "@/lib/live/matchup";
import { estimateOdds } from "@/lib/live/odds";
import type { Chicken } from "@/lib/types";

/**
 * Opens the betting window for the next /live fight: picks the matchup and
 * prices both sides, but does not simulate it yet — the fight itself only
 * runs once the window closes, via /api/live/resolve. The matchup is
 * snapshotted server-side (chickenA/chickenB as Json) so a client can't
 * tamper with either combatant's stats between quoting odds and resolving.
 */
export async function POST() {
  try {
    return await handlePost();
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handlePost() {
  const player = await requirePlayer();
  const rows = await prisma.chicken.findMany({ where: { playerId: player.id } });
  const owned = rows as unknown as Chicken[];

  const { mode, chickenA, chickenB } = pickLiveMatchup(owned);
  const { oddsA, oddsB } = estimateOdds(chickenA, chickenB);

  const match = await prisma.liveMatch.create({
    data: {
      playerId: player.id,
      mode,
      chickenA: chickenA as object,
      chickenB: chickenB as object,
      oddsA,
      oddsB,
      status: "open",
      expiresAt: new Date(Date.now() + BETTING_WINDOW_MS),
    },
  });

  return NextResponse.json({
    matchId: match.id,
    mode,
    chickenA,
    chickenB,
    oddsA,
    oddsB,
    expiresAt: match.expiresAt,
    credits: player.credits,
  });
}
