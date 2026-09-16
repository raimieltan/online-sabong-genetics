import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { createSession, CombatServiceError } from "@/lib/combat/service";
import { serverTiming } from "@/lib/serverTiming";

export async function POST(request: Request) {
  try {
    const startedAt = performance.now();
    const playerId = (await requirePlayer()).id;
    const playerReadyAt = performance.now();
    const body = await request.json().catch(() => ({}));
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? body.idempotencyKey;
    const view = await createSession({
      fighterId: body.fighterId,
      encounterId: body.encounterId,
      coachingMode: body.coachingMode ?? "MANUAL",
      openingCommand: body.openingCommand ?? "WAIT",
      disconnectPolicy: body.disconnectPolicy ?? "KEEP_INSTRUCTION",
      idempotencyKey,
    }, playerId);
    const completedAt = performance.now();
    return NextResponse.json(view, { headers: { "Server-Timing": serverTiming(["player", playerReadyAt - startedAt], ["combat", completedAt - playerReadyAt], ["total", completedAt - startedAt]) } });
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return toErrorResponse(error);
  }
}
