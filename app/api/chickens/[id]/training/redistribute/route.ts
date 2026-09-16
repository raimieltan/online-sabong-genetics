import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { TrainingError } from "@/lib/training/errors";
import { redistributeEffortForChicken } from "@/lib/training/service";
import { GENETIC_STAT_KEYS, type GeneticStatKey } from "@/lib/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRedistribute(request, context);
}

export async function handleRedistribute(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
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

  try {
    const player = await deps.requirePlayer();
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
    return toErrorResponse(err);
  }
}
