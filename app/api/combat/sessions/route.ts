import { NextResponse } from "next/server";

import { createSession, CombatServiceError } from "@/lib/combat/service";
import { getOrCreatePlayer } from "@/lib/player";

export async function POST(request: Request) {
  try {
    const player = await getOrCreatePlayer();
    const body = await request.json().catch(() => ({}));
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? body.idempotencyKey;
    const view = await createSession({
      fighterId: body.fighterId,
      encounterId: body.encounterId,
      coachingMode: body.coachingMode ?? "MANUAL",
      openingCommand: body.openingCommand ?? "WAIT",
      disconnectPolicy: body.disconnectPolicy ?? "KEEP_INSTRUCTION",
      idempotencyKey,
    }, player.id);
    return NextResponse.json(view);
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
