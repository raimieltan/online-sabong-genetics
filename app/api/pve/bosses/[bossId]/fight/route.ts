import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { PveError } from "@/lib/pve/errors";
import { resolveBossFight } from "@/lib/pve/service";

export async function POST(request: Request, { params }: { params: Promise<{ bossId: string }> }) {
  const { bossId } = await params;
  const { chickenId } = (await request.json().catch(() => ({}))) as { chickenId?: string };

  if (!chickenId) {
    return NextResponse.json({ error: "MISSING_CHICKEN" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();

  try {
    const outcome = await resolveBossFight(player.id, bossId, chickenId);
    return NextResponse.json(outcome);
  } catch (err) {
    if (err instanceof PveError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
