import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { GET } from "../../app/api/eggs/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/eggs lists the player's eggs", async () => {
  const player = await getOrCreatePlayer();
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 50));

  await prisma.egg.create({
    data: {
      id: randomUUID(),
      playerId: player.id,
      fatherId: randomUUID(),
      motherId: randomUUID(),
      bloodlineId: "line-1",
      generation: 1,
      sex: "hen",
      iv: block,
      traits: [],
      status: "incubating",
    },
  });

  const response = await GET();
  const eggs = await response.json();
  assert.equal(eggs.length, 1);
  assert.equal(eggs[0].bloodlineId, "line-1");
});
