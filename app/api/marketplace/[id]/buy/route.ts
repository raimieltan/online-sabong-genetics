import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { prisma } from "@/lib/db";
import { canAfford, spendCredits } from "@/lib/economy";
import { listingToChicken, type MarketListingRow } from "@/lib/marketplace";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleBuy(context);
}

export async function handleBuy(
  { params }: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  try {
    return await handlePost(params, deps);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handlePost(params: Promise<{ id: string }>, deps: { requirePlayer: typeof requirePlayer }) {
  const { id } = await params;
  const player = await deps.requirePlayer();
  const listing = await prisma.marketListing.findUnique({ where: { id } });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (!canAfford(player.credits, listing.price)) {
    return NextResponse.json({ error: "Not enough Battle Credits" }, { status: 400 });
  }

  const chicken = listingToChicken(listing as unknown as MarketListingRow);

  const [createdChicken, updatedPlayer] = await prisma.$transaction([
    prisma.chicken.create({
      data: {
        id: chicken.id,
        playerId: player.id,
        name: chicken.name,
        sex: chicken.sex,
        generation: chicken.generation,
        fatherId: chicken.parents.fatherId,
        motherId: chicken.parents.motherId,
        bloodlineId: chicken.bloodlineId,
        breed: chicken.breed,
        iv: chicken.iv,
        ev: chicken.ev,
        physical: chicken.physical,
        mutations: chicken.mutations,
        traits: chicken.traits,
        age: chicken.age,
        health: chicken.health,
        energy: chicken.energy,
        record: chicken.record,
        status: chicken.status,
        growthStage: chicken.growthStage,
        fightingStyle: chicken.fightingStyle,
        colorScheme: chicken.colorScheme,
        injured: chicken.injured,
      },
    }),
    prisma.player.update({
      where: { id: player.id },
      data: { credits: spendCredits(player.credits, listing.price) },
    }),
    prisma.marketListing.delete({ where: { id } }),
  ]);

  return NextResponse.json({ chicken: createdChicken, credits: updatedPlayer.credits });
}
