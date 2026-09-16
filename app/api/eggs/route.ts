import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleGetEggs();
}

export async function handleGetEggs(
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  try {
    const player = await deps.requirePlayer();
    const eggs = await prisma.egg.findMany({
      where: { playerId: player.id },
      orderBy: { laidAt: "asc" },
    });
    return NextResponse.json(eggs);
  } catch (error) {
    return toErrorResponse(error);
  }
}
