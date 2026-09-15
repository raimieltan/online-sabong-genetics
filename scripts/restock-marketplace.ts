import { prisma } from "@/lib/db";
import { generateListing, MARKET_STOCK_SIZE } from "@/lib/marketplace";

async function main() {
  const count = await prisma.marketListing.count();
  if (count >= MARKET_STOCK_SIZE) {
    console.log(`Marketplace already has ${count} listings; no restock needed.`);
    return;
  }
  const restock = Array.from({ length: MARKET_STOCK_SIZE - count }, () => generateListing());
  await prisma.marketListing.createMany({ data: restock });
  console.log(`Restocked ${restock.length} listings.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
