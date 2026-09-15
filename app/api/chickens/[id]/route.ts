import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { prisma } from "@/lib/db";
import { experienceInsights } from "@/lib/training/insights";
import type { Chicken } from "@/lib/types";

export async function handleGetChicken(
  context: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  try {
    const player = await deps.requirePlayer();
    const { id } = await context.params;
    const row = await prisma.chicken.findFirst({ where: { id, playerId: player.id } });

    if (!row) {
      return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
    }

    const chicken = row as unknown as Chicken;
    const trainingInsights = experienceInsights(
      chicken.experience ?? { offensive: 0, defensive: 0, evasion: 0, counter: 0, pressure: 0, recovery: 0, adaptation: 0 }
    );

    return NextResponse.json({ ...row, trainingInsights });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleGetChicken(context);
}
