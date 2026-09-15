import { NextResponse } from "next/server";

import { CombatServiceError, getSession } from "@/lib/combat/service";
import { getOrCreatePlayerId } from "@/lib/player";

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, playerId] = await Promise.all([params, getOrCreatePlayerId()]);
    const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
    return NextResponse.json(await getSession(sessionId, playerId, Number.isSafeInteger(after) ? after : 0));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
