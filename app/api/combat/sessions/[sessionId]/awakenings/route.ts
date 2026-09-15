import { NextResponse } from "next/server";

import { CombatServiceError, triggerSessionAwakening } from "@/lib/combat/service";
import { getOrCreatePlayerId } from "@/lib/player";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, playerId, body] = await Promise.all([params, getOrCreatePlayerId(), request.json().catch(() => ({}))]);
    return NextResponse.json(await triggerSessionAwakening(sessionId, body, playerId));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
