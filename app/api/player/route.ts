import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";

export async function GET() {
  const player = await getOrCreatePlayer();
  return NextResponse.json({
    id: player.id,
    credits: player.credits,
    tournamentTokens: player.tournamentTokens,
  });
}
