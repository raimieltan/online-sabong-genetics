import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { TrainingError } from "@/lib/training/errors";
import { redistributeEffortForChicken } from "@/lib/training/service";
import { GENETIC_STAT_KEYS, type GeneticStatKey } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { from, to, amount } = (await request.json()) as { from?: string; to?: string; amount?: number };

  if (
    !from ||
    !to ||
    !GENETIC_STAT_KEYS.includes(from as GeneticStatKey) ||
    !GENETIC_STAT_KEYS.includes(to as GeneticStatKey) ||
    typeof amount !== "number" ||
    amount <= 0
  ) {
    return NextResponse.json({ error: "Invalid redistribute request" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();

  try {
    const result = await redistributeEffortForChicken(
      player.id,
      id,
      from as GeneticStatKey,
      to as GeneticStatKey,
      amount
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TrainingError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
