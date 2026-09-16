import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { CombatServiceError, issueCommand } from "@/lib/combat/service";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, player, body] = await Promise.all([params, requirePlayer(), request.json().catch(() => ({}))]);
    const playerId = player.id;
    return NextResponse.json(await issueCommand(sessionId, body, playerId));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return toErrorResponse(error);
  }
}
