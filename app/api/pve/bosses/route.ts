import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { listBosses } from "@/lib/pve/service";

export async function GET() {
  const player = await getOrCreatePlayer();
  const bosses = await listBosses(player.id);
  return NextResponse.json({ bosses });
}
