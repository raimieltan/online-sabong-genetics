import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { claimExpiredTreatments, clinicView, getOrCreateClinic, rosterMedicalOverview } from "@/lib/medical/service";

export async function GET() {
  return handleGetClinic();
}

export async function handleGetClinic(deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }) {
  try {
    const player = await deps.requirePlayer();
    await claimExpiredTreatments(player.id);

    const clinic = await getOrCreateClinic(player.id);
    const roster = await rosterMedicalOverview(player.id);

    return NextResponse.json({ clinic: clinicView(clinic), roster, credits: player.credits });
  } catch (error) {
    return toErrorResponse(error);
  }
}
