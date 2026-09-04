import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";

test("getOrCreatePlayer creates a player once and returns it on subsequent calls", async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();

  const first = await getOrCreatePlayer();
  const second = await getOrCreatePlayer();

  assert.equal(first.id, second.id);

  const count = await prisma.player.count();
  assert.equal(count, 1);
});
