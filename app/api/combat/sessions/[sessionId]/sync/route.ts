import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { CombatServiceError, syncSession } from "@/lib/combat/service";
import { serverTiming } from "@/lib/serverTiming";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const startedAt = performance.now();
    const [{ sessionId }, player, body] = await Promise.all([params, requirePlayer(), request.json().catch(() => ({}))]);
    const playerId = player.id;
    const playerReadyAt = performance.now();
    const afterCursor = Number.isSafeInteger(body.afterCursor) ? body.afterCursor : 0;
    const view = await syncSession(sessionId, playerId, afterCursor);
    const completedAt = performance.now();

    // Fighter snapshots are immutable for the lifetime of a session and are
    // already present in the initial response. Do not resend both large Chicken
    // objects on every delta poll; retain them only for first-load recovery.
    const payload = afterCursor > 0
      ? (({ fighters, ...delta }) => { void fighters; return delta; })(view)
      : view;

    return NextResponse.json(payload, { headers: { "Server-Timing": serverTiming(["setup", playerReadyAt - startedAt], ["combat", completedAt - playerReadyAt], ["total", completedAt - startedAt]) } });
  } catch (error) {
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return toErrorResponse(error);
  }
}
