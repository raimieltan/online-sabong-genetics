import { NextResponse } from "next/server";

import { beginSession, CombatServiceError } from "@/lib/combat/service";
import { getOrCreatePlayerId } from "@/lib/player";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, playerId] = await Promise.all([params, getOrCreatePlayerId()]);
    return NextResponse.json(await beginSession(sessionId, playerId));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
