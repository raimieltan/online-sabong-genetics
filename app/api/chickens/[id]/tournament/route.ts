import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { getTournamentDefinition, TOURNAMENT_SIZES, TOURNAMENT_TIERS, type TournamentSize, type TournamentTier } from "@/lib/tournament";
import { TournamentError } from "@/lib/tournament/errors";
import { findActiveTournament, startTournament } from "@/lib/tournament/service";

/** Returns the in-progress tournament for this chicken, if any (so the UI can offer "resume" instead of a fresh picker). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const active = await findActiveTournament(player.id, id);
  return NextResponse.json({ tournament: active });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();

  const body = await request.json().catch(() => ({}));
  const event = typeof body.eventId === "string" ? getTournamentDefinition(body.eventId) : undefined;
  // Keep size/tier support for bookmarked legacy tournament links, but new
  // entries must use a defined circuit event so rules cannot be spoofed.
  const size = (event?.bracketSize ?? body.size) as TournamentSize;
  const tier = (event?.tier ?? body.tier) as TournamentTier;

  if (!TOURNAMENT_SIZES.includes(size)) {
    return NextResponse.json({ error: `size must be one of ${TOURNAMENT_SIZES.join(", ")}` }, { status: 400 });
  }
  if (!TOURNAMENT_TIERS.includes(tier)) {
    return NextResponse.json({ error: `tier must be one of ${TOURNAMENT_TIERS.join(", ")}` }, { status: 400 });
  }

  try {
    const tournament = await startTournament(player.id, id, size, tier, event?.id);
    return NextResponse.json({ tournament });
  } catch (err) {
    if (err instanceof TournamentError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
