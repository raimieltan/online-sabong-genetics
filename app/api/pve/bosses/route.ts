import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { campaignProgress, listBosses } from "@/lib/pve/service";
import { PVE_CIRCUITS } from "@/lib/pve/campaign";

export async function GET() {
  const player = await getOrCreatePlayer();
  const [bosses, campaign] = await Promise.all([listBosses(player.id), campaignProgress(player.id)]);
  return NextResponse.json({ bosses, circuits: PVE_CIRCUITS, campaign });
}
