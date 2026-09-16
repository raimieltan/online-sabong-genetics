import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { MedicalError } from "@/lib/medical/errors";
import {
  claimExpiredTreatments,
  medicalRest,
  startHealthTreatment,
  startIllnessTreatment,
  startInjuryTreatment,
} from "@/lib/medical/service";

type Body =
  | { action: "treat"; injuryId: string }
  | { action: "medical_rest" }
  | { action: "treat_health" }
  | { action: "treat_illness"; illnessId: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleMedicalAction(request, context);
}

export async function handleMedicalAction(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;

  try {
    const player = await deps.requirePlayer();
    if (body.action === "treat") {
      if (!body.injuryId) return NextResponse.json({ error: "INJURY_NOT_FOUND" }, { status: 404 });
      const treatment = await startInjuryTreatment(player.id, id, body.injuryId);
      return NextResponse.json({ treatment });
    }

    if (body.action === "medical_rest") {
      const chicken = await medicalRest(player.id, id);
      return NextResponse.json(chicken);
    }

    if (body.action === "treat_health") {
      const treatment = await startHealthTreatment(player.id, id);
      return NextResponse.json({ treatment });
    }

    if (body.action === "treat_illness") {
      if (!body.illnessId) return NextResponse.json({ error: "ILLNESS_NOT_FOUND" }, { status: 404 });
      const treatment = await startIllnessTreatment(player.id, id, body.illnessId);
      return NextResponse.json({ treatment });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (err) {
    if (err instanceof MedicalError) return NextResponse.json({ error: err.code }, { status: err.status });
    return toErrorResponse(err);
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleMedicalStatus(context);
}

export async function handleMedicalStatus(
  { params }: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  try {
    const { id } = await params;
    const player = await deps.requirePlayer();
    await claimExpiredTreatments(player.id);

    const row = await prisma.chicken.findUnique({ where: { id } });
    if (!row || row.playerId !== player.id) {
      return NextResponse.json({ error: "CHICKEN_NOT_FOUND" }, { status: 404 });
    }

    const treatments = await prisma.medicalTreatment.findMany({
      where: { chickenId: id },
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ chicken: row, treatments });
  } catch (error) {
    return toErrorResponse(error);
  }
}
