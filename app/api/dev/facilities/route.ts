import { NextResponse } from "next/server";

import { isDevModeEnabled } from "@/lib/dev";
import { prisma } from "@/lib/db";
import { claimExpiredSessions } from "@/lib/facilities/service";
import { defaultTrainingState } from "@/lib/training/limits";

type DevAction =
  | { action: "SET_LEVEL"; facilityId: string; level: number }
  | { action: "RESET_FACILITY"; facilityId: string }
  | { action: "COMPLETE_SESSION"; sessionId: string }
  | { action: "RESET_TRAINING_STATE"; chickenId: string };

export async function POST(request: Request) {
  if (!isDevModeEnabled()) {
    return NextResponse.json({ error: "DEV_MODE_DISABLED" }, { status: 403 });
  }

  const body = (await request.json()) as DevAction;

  switch (body.action) {
    case "SET_LEVEL": {
      const facility = await prisma.facility.update({ where: { id: body.facilityId }, data: { level: body.level } });
      return NextResponse.json(facility);
    }
    case "RESET_FACILITY": {
      const facility = await prisma.facility.update({ where: { id: body.facilityId }, data: { level: 1 } });
      return NextResponse.json(facility);
    }
    case "COMPLETE_SESSION": {
      await prisma.trainingSession.update({
        where: { id: body.sessionId },
        data: { startedAt: new Date(0) }, // force it into the past so claimExpiredSessions treats it as due
      });
      const session = await prisma.trainingSession.findUnique({ where: { id: body.sessionId } });
      if (session) await claimExpiredSessions(session.playerId);
      const completed = await prisma.trainingSession.findUnique({ where: { id: body.sessionId } });
      return NextResponse.json(completed);
    }
    case "RESET_TRAINING_STATE": {
      const chicken = await prisma.chicken.update({
        where: { id: body.chickenId },
        data: { trainingState: defaultTrainingState() },
      });
      return NextResponse.json(chicken);
    }
    default:
      return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  }
}
