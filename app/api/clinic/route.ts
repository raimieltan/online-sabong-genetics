import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { claimExpiredTreatments, clinicView, getOrCreateClinic, rosterMedicalOverview } from "@/lib/medical/service";

export async function GET() {
  const player = await getOrCreatePlayer();
  await claimExpiredTreatments(player.id);

  const clinic = await getOrCreateClinic(player.id);
  const roster = await rosterMedicalOverview(player.id);

  return NextResponse.json({ clinic: clinicView(clinic), roster, credits: player.credits });
}
