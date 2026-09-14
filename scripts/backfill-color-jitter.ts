/**
 * One-off backfill: jitters colorScheme on every existing Chicken, Egg, and
 * MarketListing row in place. Before this, gen-0 chickens drew colorScheme
 * from a 3-entry palette pool (COLOR_PALETTES in lib/roosterGenerator.ts), 2
 * of which share the exact same wing hex (#4c1708) — so most existing
 * chickens have byte-identical wing colors regardless of body color. This
 * applies the same per-individual hue/lightness jitter that gen-0 creation
 * now applies going forward (see jitterColorScheme in lib/genetics.ts),
 * without re-rolling the base palette/breed, so each chicken keeps its
 * general color family but stops matching its siblings exactly.
 *
 * Run with: yarn backfill:colors
 */
import { prisma } from "../lib/db";
import { jitterColorScheme } from "../lib/genetics";
import type { ChickenColorScheme } from "../lib/types";

async function backfillChickens(): Promise<number> {
  const rows = await prisma.chicken.findMany({ select: { id: true, colorScheme: true } });
  for (const row of rows) {
    const jittered = jitterColorScheme(row.colorScheme as unknown as ChickenColorScheme);
    await prisma.chicken.update({ where: { id: row.id }, data: { colorScheme: jittered } });
  }
  return rows.length;
}

async function backfillEggs(): Promise<number> {
  const rows = await prisma.egg.findMany({ select: { id: true, colorScheme: true } });
  for (const row of rows) {
    const jittered = jitterColorScheme(row.colorScheme as unknown as ChickenColorScheme);
    await prisma.egg.update({ where: { id: row.id }, data: { colorScheme: jittered } });
  }
  return rows.length;
}

async function backfillMarketListings(): Promise<number> {
  const rows = await prisma.marketListing.findMany({ select: { id: true, colorScheme: true } });
  for (const row of rows) {
    const jittered = jitterColorScheme(row.colorScheme as unknown as ChickenColorScheme);
    await prisma.marketListing.update({ where: { id: row.id }, data: { colorScheme: jittered } });
  }
  return rows.length;
}

async function main() {
  const chickenCount = await backfillChickens();
  const eggCount = await backfillEggs();
  const listingCount = await backfillMarketListings();
  console.log(
    `Jittered colorScheme on ${chickenCount} chicken(s), ${eggCount} egg(s), ${listingCount} market listing(s).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
