import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { TournamentError } from "@/lib/tournament/errors";
import { advanceRound } from "@/lib/tournament/service";

/** Resolves the current round of a saved tournament and returns the round's battle report plus the updated bracket. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const player = await requirePlayer();
    const result = await advanceRound(player.id, id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TournamentError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}
