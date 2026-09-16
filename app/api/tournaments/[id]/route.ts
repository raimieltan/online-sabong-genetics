import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { TournamentError } from "@/lib/tournament/errors";
import { getTournament } from "@/lib/tournament/service";

/** Resume view: fetches the full saved bracket state for a tournament the player owns. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const player = await requirePlayer();
    const tournament = await getTournament(player.id, id);
    return NextResponse.json({ tournament });
  } catch (err) {
    if (err instanceof TournamentError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}
