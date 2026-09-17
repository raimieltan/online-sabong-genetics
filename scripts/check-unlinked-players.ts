import { prisma } from "@/lib/db";

async function main() {
  const [{ count }] = await prisma.$queryRaw<
    { count: bigint }[]
  >`SELECT count(*) FROM "Player" WHERE "authUserId" IS NULL`;
  console.log(`Unlinked players: ${count}`);
  if (count > 0) {
    console.error("Migration B cannot run until this is 0. Run scripts/link-legacy-player.ts or delete unlinked rows.");
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
