import type { Player } from "@prisma/client";

import { prisma } from "./db";

const globalForPlayer = globalThis as unknown as {
  productionPlayerId?: Promise<string>;
};

async function loadOrCreatePlayerId(): Promise<string> {
  const existing = await prisma.player.findFirst({ select: { id: true } });
  if (existing) return existing.id;
  return (await prisma.player.create({ data: {}, select: { id: true } })).id;
}

/**
 * The current application still has one durable placeholder player. Hot API
 * routes only need its id, so keep that immutable identity in a warm production
 * process instead of repeating Player.findFirst on every combat poll.
 *
 * Tests and development deliberately bypass the cache because their fixtures
 * recreate the placeholder player between runs.
 */
export async function getOrCreatePlayerId(): Promise<string> {
  if (process.env.NODE_ENV !== "production") return loadOrCreatePlayerId();
  globalForPlayer.productionPlayerId ??= loadOrCreatePlayerId().catch((error) => {
    globalForPlayer.productionPlayerId = undefined;
    throw error;
  });
  return globalForPlayer.productionPlayerId;
}

export async function getOrCreatePlayer(): Promise<Player> {
  const existing = await prisma.player.findFirst();
  if (existing) return existing;
  return prisma.player.create({ data: {} });
}
