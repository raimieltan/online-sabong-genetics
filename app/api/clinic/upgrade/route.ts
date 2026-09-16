import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { MedicalError } from "@/lib/medical/errors";
import { clinicView, getOrCreateClinic, upgradeClinic } from "@/lib/medical/service";

export async function POST() {
  return handleUpgradeClinic();
}

export async function handleUpgradeClinic(deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }) {
  try {
    const player = await deps.requirePlayer();
    const clinic = await getOrCreateClinic(player.id);

    try {
      const upgraded = await upgradeClinic(player.id, clinic.id);
      return NextResponse.json(clinicView(upgraded));
    } catch (err) {
      if (err instanceof MedicalError) return NextResponse.json({ error: err.code }, { status: err.status });
      throw err;
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
