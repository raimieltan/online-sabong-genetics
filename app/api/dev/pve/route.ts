import { NextResponse } from "next/server";

import { isDevModeEnabled } from "@/lib/dev";
import { requirePlayer } from "@/lib/auth/player";
import { requireAuthClaims } from "@/lib/auth/session";
import { toErrorResponse } from "@/lib/auth/responses";
import { PveError } from "@/lib/pve/errors";
import { runDevPveAction, type DevPveAction } from "@/lib/pve/service";

export async function POST(request: Request) {
  try {
    const claims = await requireAuthClaims();
    if (!isDevModeEnabled(claims.authUserId)) {
      return NextResponse.json({ error: "DEV_MODE_DISABLED" }, { status: 403 });
    }

    const body = (await request.json()) as DevPveAction;
    const player = await requirePlayer();

    try {
      const bosses = await runDevPveAction(player.id, body);
      return NextResponse.json({ bosses });
    } catch (err) {
      if (err instanceof PveError) {
        return NextResponse.json({ error: err.code }, { status: err.status });
      }
      throw err;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
