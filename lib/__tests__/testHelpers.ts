import { randomUUID } from "node:crypto";

import type { Player } from "@prisma/client";

import { prisma } from "../db";
import { GENETIC_STAT_KEYS, PHYSICAL_TRAIT_KEYS, type Chicken, type PhysicalBlock, type StatBlock } from "../types";

/**
 * `Player.authUserId` FKs to `auth.users(id)` (migration B), so any test
 * player needs a matching row there too. Only ever run against the local
 * Supabase stack's disposable `auth` schema, never a real project.
 * Idempotent (`ON CONFLICT DO NOTHING`) since tests don't clean up `auth.users`
 * between runs the way they do the `Player` table.
 */
export async function ensureTestAuthUser(id: string = randomUUID()): Promise<string> {
  await prisma.$executeRawUnsafe(`INSERT INTO auth.users (id) VALUES ($1::uuid) ON CONFLICT (id) DO NOTHING`, id);
  return id;
}

/** Seeds (or reuses) a placeholder player row for tests that don't go through real Supabase auth. */
export async function getOrCreateTestPlayer(): Promise<Player> {
  const existing = await prisma.player.findFirst();
  if (existing) return existing;
  const authUserId = await ensureTestAuthUser();
  return prisma.player.create({ data: { authUserId } });
}

/** Injectable `requirePlayer` stand-in for route handlers' `deps` param, so tests can bypass real auth. */
export function testRequirePlayer(player: Player) {
  return { requirePlayer: async () => player };
}

/** Two distinct players with distinct authUserIds, for cross-account isolation tests. */
export async function createTestPlayerPair(): Promise<{ playerA: Player; playerB: Player }> {
  const [authUserIdA, authUserIdB] = await Promise.all([ensureTestAuthUser(), ensureTestAuthUser()]);
  const [playerA, playerB] = await Promise.all([
    prisma.player.create({ data: { authUserId: authUserIdA } }),
    prisma.player.create({ data: { authUserId: authUserIdB } }),
  ]);
  return { playerA, playerB };
}

/** A second, distinct test player (with its own auth user), for "another player" isolation checks. */
export async function createOtherTestPlayer(): Promise<Player> {
  const authUserId = await ensureTestAuthUser();
  return prisma.player.create({ data: { authUserId } });
}

export function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

/** All-1 physical block — a "baseline" chicken whose physique modifiers are all identity (1.0). */
export function physicalBlock(value = 1): PhysicalBlock {
  const block = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

export function makeChicken(overrides: Partial<Chicken> = {}): Chicken {
  return {
    id: "test",
    name: "Test",
    sex: "rooster",
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: "test",
    iv: statBlock(50),
    ev: statBlock(0),
    physical: physicalBlock(),
    mutations: {},
    traits: [],
    age: 1,
    health: 100,
    energy: 100,
    record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
    status: "active",
    growthStage: "adult",
    fightingStyle: "balanced",
    colorScheme: {
      body: "#111111",
      hackle: "#c9a24f",
      wings: "#4c1708",
      tail: "#333333",
      comb: "#b8100f",
      beak: "#d9a83a",
      shanks: "#cc9e33",
      pattern: "SOLID",
      patternColor: "#222222",
    },
    injured: false,
    createdAt: Date.now(),
    ...overrides,
  };
}
