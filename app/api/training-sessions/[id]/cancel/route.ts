import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { cancelTrainingSession } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const player = await requirePlayer();
    const session = await cancelTrainingSession(player.id, id);
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof FacilityError) return NextResponse.json({ error: err.code }, { status: err.status });
    return toErrorResponse(err);
  }
}
