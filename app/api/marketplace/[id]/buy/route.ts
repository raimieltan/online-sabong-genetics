import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canAfford, spendCredits } from "@/lib/economy";
import { listingToChicken, type MarketListingRow } from "@/lib/marketplace";
import { getOrCreatePlayer } from "@/lib/player";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
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
