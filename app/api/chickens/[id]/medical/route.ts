import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import { MedicalError } from "@/lib/medical/errors";
import { claimExpiredTreatments, medicalRest, startInjuryTreatment } from "@/lib/medical/service";

type Body = { action: "treat"; injuryId: string } | { action: "medical_rest" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const body = (await request.json().catch(() => ({}))) as Body;

  try {
    if (body.action === "treat") {
      if (!body.injuryId) return NextResponse.json({ error: "INJURY_NOT_FOUND" }, { status: 404 });
      const treatment = await startInjuryTreatment(player.id, id, body.injuryId);
      return NextResponse.json({ treatment });
    }

    if (body.action === "medical_rest") {
      const chicken = await medicalRest(player.id, id);
      return NextResponse.json(chicken);
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (err) {
    if (err instanceof MedicalError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
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
}
