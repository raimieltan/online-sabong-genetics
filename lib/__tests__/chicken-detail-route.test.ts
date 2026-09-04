import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { POST as createChicken } from "../../app/api/chickens/route";
import { GET } from "../../app/api/chickens/[id]/route";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/chickens/:id returns the chicken", async () => {
  const created = await (await createChicken()).json();

  const response = await GET(new Request("http://localhost/api/chickens/" + created.id), {
    params: Promise.resolve({ id: created.id }),
  });

  assert.equal(response.status, 200);
  const chicken = await response.json();
  assert.equal(chicken.id, created.id);
});

test("GET /api/chickens/:id returns 404 for an unknown id", async () => {
  const response = await GET(new Request("http://localhost/api/chickens/missing"), {
    params: Promise.resolve({ id: "missing" }),
  });
  assert.equal(response.status, 404);
});
