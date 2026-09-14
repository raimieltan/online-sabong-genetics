import { NextResponse } from "next/server";

import { CombatServiceError, createSession } from "@/lib/combat/service";
import { getOrCreatePlayer } from "@/lib/player";

/** Compatibility alias. New clients use POST /api/combat/sessions. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, player, body] = await Promise.all([params, getOrCreatePlayer(), request.json().catch(() => ({}))]);
    if (body.opponent) return NextResponse.json({ error: "CLIENT_OPPONENT_FORBIDDEN" }, { status: 400 });
    return NextResponse.json(await createSession({
      fighterId: id,
      encounterId: body.encounterId,
      coachingMode: body.coachingMode ?? "MANUAL",
      openingCommand: body.openingCommand ?? "WAIT",
      disconnectPolicy: body.disconnectPolicy ?? "KEEP_INSTRUCTION",
      idempotencyKey: request.headers.get("Idempotency-Key") ?? body.idempotencyKey,
    }, player.id));
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    throw error;
  }
}
