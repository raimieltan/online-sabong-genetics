import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { GET } from "../../app/api/chickens/[id]/pedigree/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

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

function getRequest(id: string) {
  return new Request(`http://localhost/api/chickens/${id}/pedigree`);
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/chickens/:id/pedigree returns 404 for an unknown chicken", async () => {
  const response = await GET(getRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("GET /api/chickens/:id/pedigree returns an ancestry tree and descendant stats", async () => {
  const player = await getOrCreatePlayer();
  const grandpa = await seedChicken(player.id, { generation: 0 });
  const dad = await seedChicken(player.id, { generation: 1, fatherId: grandpa });
  const mom = await seedChicken(player.id, { generation: 1 });
  const child = await seedChicken(player.id, { generation: 2, fatherId: dad, motherId: mom });
  await seedChicken(player.id, { generation: 3, fatherId: child, championships: 1 });

  const response = await GET(getRequest(child), { params: Promise.resolve({ id: child }) });
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
