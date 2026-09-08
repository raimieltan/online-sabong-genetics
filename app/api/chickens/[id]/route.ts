import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { experienceInsights } from "@/lib/training/insights";
import type { Chicken } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const chicken = row as unknown as Chicken;
  const trainingInsights = experienceInsights(
    chicken.experience ?? { offensive: 0, defensive: 0, evasion: 0, counter: 0, pressure: 0, recovery: 0, adaptation: 0 }
  );

  return NextResponse.json({ ...row, trainingInsights });
}
