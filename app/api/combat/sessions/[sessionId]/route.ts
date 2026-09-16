import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { CombatServiceError, getSession } from "@/lib/combat/service";

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, player] = await Promise.all([params, requirePlayer()]);
    const playerId = player.id;
    const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
    return NextResponse.json(await getSession(sessionId, playerId, Number.isSafeInteger(after) ? after : 0));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return toErrorResponse(error);
  }
}
