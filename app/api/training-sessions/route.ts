import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { claimExpiredSessions, startTrainingSession } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";
import { prisma } from "@/lib/db";
import { TRAINING_CATEGORIES, TRAINING_INTENSITIES, type TrainingCategory, type TrainingIntensity } from "@/lib/types";
import type { ProgramId } from "@/lib/facilities/types";
import { TRAINING_PROGRAMS } from "@/lib/facilities/config";

export async function GET() {
  const player = await getOrCreatePlayer();
  await claimExpiredSessions(player.id);
  const [activeSessions, completedSessions] = await Promise.all([
    prisma.trainingSession.findMany({ where: { playerId: player.id, status: "ACTIVE" }, orderBy: { startedAt: "asc" } }),
    prisma.trainingSession.findMany({ where: { playerId: player.id, status: "COMPLETED" }, orderBy: { completedAt: "desc" }, take: 20 }),
  ]);
  return NextResponse.json({ activeSessions, completedSessions });
}

export async function POST(request: Request) {
  const player = await getOrCreatePlayer();
  const body = (await request.json()) as { chickenId?: string; programId?: string; category?: string; intensity?: string };

  if (!body.chickenId || !body.programId || !(body.programId in TRAINING_PROGRAMS)) {
    return NextResponse.json({ error: "PROGRAM_NOT_FOUND" }, { status: 400 });
  }
  const category =
    body.category && TRAINING_CATEGORIES.includes(body.category as TrainingCategory)
      ? (body.category as TrainingCategory)
      : undefined;
  const intensity = body.intensity && TRAINING_INTENSITIES.includes(body.intensity as TrainingIntensity)
    ? body.intensity as TrainingIntensity : undefined;

  try {
    const session = await startTrainingSession(player.id, body.chickenId, body.programId as ProgramId, category, intensity);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof FacilityError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}
