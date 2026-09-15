import { NextResponse } from "next/server";

import { getOrCreatePlayerId } from "@/lib/player";
import { loadPveDashboard } from "@/lib/pve/service";
import { LAUNCH_PVE_CIRCUITS } from "@/lib/pve/launch";
import { serverTiming } from "@/lib/serverTiming";

export async function GET() {
  const startedAt = performance.now();
  const playerId = await getOrCreatePlayerId();
  const playerReadyAt = performance.now();
  const { bosses, campaign, sideEncounters } = await loadPveDashboard(playerId);
  const completedAt = performance.now();
  return NextResponse.json(
    { bosses, circuits: LAUNCH_PVE_CIRCUITS, campaign, sideEncounters },
    { headers: { "Server-Timing": serverTiming(["player", playerReadyAt - startedAt], ["pve", completedAt - playerReadyAt], ["total", completedAt - startedAt]) } },
  );
}
