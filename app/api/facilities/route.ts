import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { claimExpiredSessions, facilityView, getOrCreateTrainingGym } from "@/lib/facilities/service";
import { prisma } from "@/lib/db";

export async function GET() {
  const player = await getOrCreatePlayer();
  await claimExpiredSessions(player.id);
  const facility = await getOrCreateTrainingGym(player.id);

  const activeSessions = await prisma.trainingSession.findMany({
    where: { playerId: player.id, status: "ACTIVE" },
    orderBy: { startedAt: "asc" },
  });

  return NextResponse.json({ facility: facilityView(facility), activeSessions });
}
