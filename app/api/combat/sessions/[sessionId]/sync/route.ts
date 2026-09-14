import { NextResponse } from "next/server";

import { CombatServiceError, syncSession } from "@/lib/combat/service";
import { getOrCreatePlayer } from "@/lib/player";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, player, body] = await Promise.all([params, getOrCreatePlayer(), request.json().catch(() => ({}))]);
    return NextResponse.json(await syncSession(sessionId, player.id, Number.isSafeInteger(body.afterCursor) ? body.afterCursor : 0));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
