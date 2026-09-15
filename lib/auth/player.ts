import "server-only";

import type { Player } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuthClaims } from "./session";

export async function getOrProvisionPlayer(authUserId: string): Promise<Player> {
  const existing = await prisma.player.findUnique({ where: { authUserId } });
  if (existing) return existing;

  try {
    return await prisma.player.create({
      data: {
        authUserId,
        onboardingState: "PROVISIONED",
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  } catch (err) {
    const isUniqueViolation =
      typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
    if (!isUniqueViolation) throw err;

    const winner = await prisma.player.findUnique({ where: { authUserId } });
    if (!winner) throw err;
    return winner;
  }
}

export async function requirePlayer(): Promise<Player> {
  const claims = await requireAuthClaims();
  return getOrProvisionPlayer(claims.authUserId);
}
