import { NextResponse } from "next/server";

import { isDevModeEnabled } from "@/lib/dev";
import { getOrCreatePlayer } from "@/lib/player";
import { PveError } from "@/lib/pve/errors";
import { runDevPveAction, type DevPveAction } from "@/lib/pve/service";

export async function POST(request: Request) {
  if (!isDevModeEnabled()) {
    return NextResponse.json({ error: "DEV_MODE_DISABLED" }, { status: 403 });
  }

  const body = (await request.json()) as DevPveAction;
  const player = await getOrCreatePlayer();

  try {
    const bosses = await runDevPveAction(player.id, body);
    return NextResponse.json({ bosses });
  } catch (err) {
    if (err instanceof PveError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
