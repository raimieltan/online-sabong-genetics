import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toPlayerDto } from "@/lib/auth/dto";
import { toErrorResponse } from "@/lib/auth/responses";

export async function handleGetPlayer(deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }) {
  try {
    const player = await deps.requirePlayer();
    return NextResponse.json(toPlayerDto(player));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET() {
  return handleGetPlayer();
}
