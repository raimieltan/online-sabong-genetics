import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { GET, POST } from "../../app/api/chickens/route";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens creates a chicken owned by the implicit player", async () => {
  const response = await POST();
  assert.equal(response.status, 201);
  const chicken = await response.json();
  assert.ok(chicken.id);
  assert.equal(chicken.generation, 0);

  const stored = await prisma.chicken.findUnique({ where: { id: chicken.id } });
  assert.ok(stored);
});

test("GET /api/chickens lists chickens for the player", async () => {
  await POST();
  await POST();

  const response = await GET();
  const chickens = await response.json();
  assert.equal(chickens.length, 2);
});
