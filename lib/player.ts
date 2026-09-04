import type { Player } from "@prisma/client";

import { prisma } from "./db";

export async function getOrCreatePlayer(): Promise<Player> {
  const existing = await prisma.player.findFirst();
  if (existing) return existing;
  return prisma.player.create({ data: {} });
}
