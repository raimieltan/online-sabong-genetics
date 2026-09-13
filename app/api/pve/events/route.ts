import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { listCampaignEvents, markCampaignEventsSeen } from "@/lib/pve/service";

export async function GET() {
  const player = await getOrCreatePlayer();
  const events = await listCampaignEvents(player.id);
  return NextResponse.json({ events });
}

export async function PATCH(request: Request) {
  const player = await getOrCreatePlayer();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  await markCampaignEventsSeen(player.id, ids);
  return NextResponse.json({ ok: true });
}
