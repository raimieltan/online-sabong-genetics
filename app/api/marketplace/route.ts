import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { prisma } from "@/lib/db";

export async function handleGetMarketplace(deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }) {
  try {
    await deps.requirePlayer();
    const listings = await prisma.marketListing.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(listings);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET() {
  return handleGetMarketplace();
}
