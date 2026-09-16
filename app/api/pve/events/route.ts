import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { listCampaignEvents, markCampaignEventsSeen } from "@/lib/pve/service";

export async function GET() {
  try {
    const player = await requirePlayer();
    const events = await listCampaignEvents(player.id);
    return NextResponse.json({ events });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const player = await requirePlayer();
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
    await markCampaignEventsSeen(player.id, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
