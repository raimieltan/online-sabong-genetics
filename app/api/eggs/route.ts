import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";

export async function GET() {
  const player = await getOrCreatePlayer();
  const eggs = await prisma.egg.findMany({
    where: { playerId: player.id },
    orderBy: { laidAt: "asc" },
  });
  return NextResponse.json(eggs);
}
