import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { getOrProvisionPlayer } from "../auth/player";

test("getOrProvisionPlayer creates exactly one Player per authUserId", async () => {
  const authUserId = "22222222-2222-2222-2222-222222222222";
  await prisma.player.deleteMany({ where: { authUserId } });

  const first = await getOrProvisionPlayer(authUserId);
  const second = await getOrProvisionPlayer(authUserId);

  assert.equal(first.id, second.id);
  const count = await prisma.player.count({ where: { authUserId } });
  assert.equal(count, 1);
});

test("getOrProvisionPlayer handles concurrent calls without duplicating the Player", async () => {
  const authUserId = "33333333-3333-3333-3333-333333333333";
  await prisma.player.deleteMany({ where: { authUserId } });

  const [a, b] = await Promise.all([
    getOrProvisionPlayer(authUserId),
    getOrProvisionPlayer(authUserId),
  ]);

  assert.equal(a.id, b.id);
  const count = await prisma.player.count({ where: { authUserId } });
  assert.equal(count, 1);
});

test("two distinct authUserIds get two distinct Players", async () => {
  const idA = "44444444-4444-4444-4444-444444444444";
  const idB = "55555555-5555-5555-5555-555555555555";
  await prisma.player.deleteMany({ where: { authUserId: { in: [idA, idB] } } });

  const a = await getOrProvisionPlayer(idA);
  const b = await getOrProvisionPlayer(idB);

  assert.notEqual(a.id, b.id);
});
