import { NextResponse } from "next/server";

import { CombatServiceError, getSession } from "@/lib/combat/service";
import { getOrCreatePlayer } from "@/lib/player";

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, player] = await Promise.all([params, getOrCreatePlayer()]);
    const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
    return NextResponse.json(await getSession(sessionId, player.id, Number.isSafeInteger(after) ? after : 0));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
