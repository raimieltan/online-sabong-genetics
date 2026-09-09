import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { PveError } from "@/lib/pve/errors";
import { startBossFight } from "@/lib/pve/service";

/**
 * Opens a live, steppable boss fight: side A is the player's own rooster
 * (player-coached via .../[sessionId]/step), side B is the boss (Auto-Coached).
 * Nothing is persisted yet — that only happens once the fight ends and the
 * step route calls `finishBossFight`.
 */
export async function POST(request: Request, { params }: { params: Promise<{ bossId: string }> }) {
  const { bossId } = await params;
  const { chickenId } = (await request.json().catch(() => ({}))) as { chickenId?: string };

  if (!chickenId) {
    return NextResponse.json({ error: "MISSING_CHICKEN" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();

  try {
    const started = await startBossFight(player.id, bossId, chickenId);
    return NextResponse.json(started);
  } catch (err) {
    if (err instanceof PveError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
