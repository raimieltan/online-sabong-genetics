import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { generateListing, MARKET_STOCK_SIZE } from "@/lib/marketplace";

export async function GET() {
  const count = await prisma.marketListing.count();

  if (count < MARKET_STOCK_SIZE) {
    const restock = Array.from({ length: MARKET_STOCK_SIZE - count }, () => generateListing());
    await prisma.marketListing.createMany({ data: restock });
  }

  const listings = await prisma.marketListing.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(listings);
}
