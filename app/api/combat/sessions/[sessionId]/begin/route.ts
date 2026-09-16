import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { beginSession, CombatServiceError } from "@/lib/combat/service";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, player] = await Promise.all([params, requirePlayer()]);
    const playerId = player.id;
    return NextResponse.json(await beginSession(sessionId, playerId));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return toErrorResponse(error);
  }
}
