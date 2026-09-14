import { NextResponse } from "next/server";

import { beginSession, CombatServiceError } from "@/lib/combat/service";
import { getOrCreatePlayer } from "@/lib/player";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const [{ sessionId }, player] = await Promise.all([params, getOrCreatePlayer()]);
    return NextResponse.json(await beginSession(sessionId, player.id));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
