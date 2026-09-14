import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { campaignProgress, listBosses, listSideEncounters } from "@/lib/pve/service";
import { LAUNCH_PVE_CIRCUITS } from "@/lib/pve/launch";

export async function GET() {
  const player = await getOrCreatePlayer();
  const [bosses, campaign, sideEncounters] = await Promise.all([
    listBosses(player.id),
    campaignProgress(player.id),
    listSideEncounters(player.id),
  ]);
  return NextResponse.json({ bosses, circuits: LAUNCH_PVE_CIRCUITS, campaign, sideEncounters });
}
