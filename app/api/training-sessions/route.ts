import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { claimExpiredSessions, startTrainingSession } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";
import { prisma } from "@/lib/db";
import { TRAINING_CATEGORIES, type TrainingCategory } from "@/lib/types";
import type { ProgramId } from "@/lib/facilities/types";
import { TRAINING_PROGRAMS } from "@/lib/facilities/config";

export async function GET() {
  const player = await getOrCreatePlayer();
  await claimExpiredSessions(player.id);
  const activeSessions = await prisma.trainingSession.findMany({
    where: { playerId: player.id, status: "ACTIVE" },
    orderBy: { startedAt: "asc" },
  });
  return NextResponse.json({ activeSessions });
}

export async function POST(request: Request) {
  const player = await getOrCreatePlayer();
  const body = (await request.json()) as { chickenId?: string; programId?: string; category?: string };

  if (!body.chickenId || !body.programId || !(body.programId in TRAINING_PROGRAMS)) {
    return NextResponse.json({ error: "PROGRAM_NOT_FOUND" }, { status: 400 });
  }
  const category =
    body.category && TRAINING_CATEGORIES.includes(body.category as TrainingCategory)
      ? (body.category as TrainingCategory)
      : undefined;

  try {
    const session = await startTrainingSession(player.id, body.chickenId, body.programId as ProgramId, category);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof FacilityError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}
