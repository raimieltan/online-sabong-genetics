import { prisma } from "@/lib/db";

async function main() {
  const authUserId = process.argv[2];
  const playerId = process.argv[3];
  const confirmFlag = process.argv[4];

  if (!authUserId || !playerId) {
    console.error("Usage: link-legacy-player <AUTH_USER_ID> <PLAYER_ID> --confirm-production");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && confirmFlag !== "--confirm-production") {
    console.error("Refusing to run against production without --confirm-production.");
    process.exit(1);
  }

  const [authTarget, playerTarget] = await Promise.all([
    prisma.player.findUnique({ where: { authUserId } }),
    prisma.player.findUnique({ where: { id: playerId } }),
  ]);

  if (authTarget) {
    console.error(`authUserId ${authUserId} is already linked to Player ${authTarget.id}.`);
    process.exit(1);
  }

  if (!playerTarget) {
    console.error(`Player ${playerId} does not exist.`);
    process.exit(1);
  }

  if (playerTarget.authUserId) {
    console.error(`Player ${playerId} is already linked to authUserId ${playerTarget.authUserId}.`);
    process.exit(1);
  }

  console.log(`Linking authUserId=${authUserId} to Player=${playerId}...`);

  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: playerId },
      data: { authUserId, onboardingState: "PROVISIONED", provisionedAt: new Date() },
    });
  });

  console.log(`Linked. authUserId=${authUserId} playerId=${playerId} at ${new Date().toISOString()}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
