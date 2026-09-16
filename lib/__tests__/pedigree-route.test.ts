import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { handleGetPedigree } from "../../app/api/chickens/[id]/pedigree/route";
import { getOrCreateTestPlayer } from "./testHelpers";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";
import type { Player } from "@prisma/client";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(
  playerId: string,
  overrides: {
    fatherId?: string;
    motherId?: string;
    generation?: number;
    championships?: number;
  } = {},
) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId,
      name: `Chicken-${id.slice(0, 8)}`,
      sex: "rooster",
      generation: overrides.generation ?? 0,
      fatherId: overrides.fatherId ?? null,
      motherId: overrides.motherId ?? null,
      bloodlineId: id,
      iv: statBlock(50),
      ev: statBlock(0),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: {
        wins: 0,
        losses: 0,
        championships: overrides.championships ?? 0,
        koTko: 0,
        decisions: 0,
      },
      status: "active",
      growthStage: "adult",
    },
  });
  return id;
}

function withPlayer(player: Player) {
  return { requirePlayer: async () => player };
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/chickens/:id/pedigree returns 404 for an unknown chicken", async () => {
  const player = await getOrCreateTestPlayer();
  const response = await handleGetPedigree(
    { params: Promise.resolve({ id: "missing" }) },
    withPlayer(player)
  );
  assert.equal(response.status, 404);
});

test("GET /api/chickens/:id/pedigree returns an ancestry tree and descendant stats", async () => {
  const player = await getOrCreateTestPlayer();
  const grandpa = await seedChicken(player.id, { generation: 0 });
  const dad = await seedChicken(player.id, { generation: 1, fatherId: grandpa });
  const mom = await seedChicken(player.id, { generation: 1 });
  const child = await seedChicken(player.id, { generation: 2, fatherId: dad, motherId: mom });
  await seedChicken(player.id, { generation: 3, fatherId: child, championships: 1 });

  const response = await handleGetPedigree(
    { params: Promise.resolve({ id: child }) },
    withPlayer(player)
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ancestry.id, child);
  assert.equal(body.ancestry.father.id, dad);
  assert.equal(body.ancestry.mother.id, mom);
  assert.equal(body.ancestry.father.father.id, grandpa);
  assert.equal(body.ancestry.mother.father, null);

  assert.deepEqual(body.descendants.byGeneration, [1]);
  assert.equal(body.descendants.totalDescendants, 1);
  assert.equal(body.descendants.championsDescended, 1);
});

test("GET returns 404 when the root rooster belongs to another player", async () => {
  const ownerPlayer = await prisma.player.create({ data: { authUserId: "88888888-8888-8888-8888-888888888888" } });
  const requesterPlayer = await prisma.player.create({ data: { authUserId: "99999999-9999-9999-9999-999999999999" } });
  const rootChicken = await seedChicken(ownerPlayer.id, { generation: 0 });

  const response = await handleGetPedigree(
    { params: Promise.resolve({ id: rootChicken }) },
    withPlayer(requesterPlayer)
  );

  assert.equal(response.status, 404);
});
