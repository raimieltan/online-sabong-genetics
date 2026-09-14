import { NextResponse } from "next/server";

import { CombatServiceError, triggerSessionAwakening } from "@/lib/combat/service";
import { getOrCreatePlayer } from "@/lib/player";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, player, body] = await Promise.all([params, getOrCreatePlayer(), request.json().catch(() => ({}))]);
    return NextResponse.json(await triggerSessionAwakening(sessionId, body, player.id));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
