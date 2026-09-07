import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { MedicalError } from "@/lib/medical/errors";
import { clinicView, getOrCreateClinic, upgradeClinic } from "@/lib/medical/service";

export async function POST() {
  const player = await getOrCreatePlayer();
  const clinic = await getOrCreateClinic(player.id);

  try {
    const upgraded = await upgradeClinic(player.id, clinic.id);
    return NextResponse.json(clinicView(upgraded));
  } catch (err) {
    if (err instanceof MedicalError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}
