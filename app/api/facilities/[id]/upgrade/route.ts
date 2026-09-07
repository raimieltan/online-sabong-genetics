import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { upgradeFacility, facilityView } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();

  try {
    const facility = await upgradeFacility(player.id, id);
    return NextResponse.json(facilityView(facility));
  } catch (err) {
    if (err instanceof FacilityError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}
