import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { UnauthenticatedError } from "../auth/errors";
import { generateListing, MARKET_STOCK_SIZE } from "../marketplace";
import { handleGetMarketplace } from "../../app/api/marketplace/route";
import { handleBuy } from "../../app/api/marketplace/[id]/buy/route";
import { handleSell } from "../../app/api/chickens/[id]/sell/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";
import { getOrCreateTestPlayer, testRequirePlayer } from "./testHelpers";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedListing(price: number) {
  const listing = generateListing();
  await prisma.marketListing.create({ data: { ...listing, price } });
  return listing.id;
}

async function seedChicken(playerId: string) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId,
      name: "Test",
      sex: "rooster",
      generation: 0,
      bloodlineId: id,
      iv: statBlock(50),
      ev: statBlock(0),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: "adult",
    },
  });
  return id;
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.marketListing.deleteMany();
  await prisma.player.deleteMany();
});

async function seedMarketStock() {
  const listings = Array.from({ length: MARKET_STOCK_SIZE }, () => generateListing());
  await prisma.marketListing.createMany({ data: listings });
  return listings.map((l) => l.id);
}

test("GET /api/marketplace returns the seeded listings without restocking", async () => {
  const player = await getOrCreateTestPlayer();
  const seededIds = await seedMarketStock();

  const response = await handleGetMarketplace({ requirePlayer: async () => player });
  assert.equal(response.status, 200);

  const listings = await response.json();
  assert.deepEqual(
    listings.map((l: { id: string }) => l.id).sort(),
    seededIds.sort(),
  );
});

test("GET /api/marketplace does not create new listings as a side effect", async () => {
  const player = await getOrCreateTestPlayer();
  await seedMarketStock();

  const before = await prisma.marketListing.count();
  await handleGetMarketplace({ requirePlayer: async () => player });
  const after = await prisma.marketListing.count();

  assert.equal(after, before);
});

test("GET /api/marketplace returns 401 when unauthenticated", async () => {
  const response = await handleGetMarketplace({
    requirePlayer: async () => {
      throw new UnauthenticatedError();
    },
  });
  assert.equal(response.status, 401);
});

test("POST /api/marketplace/:id/buy returns 404 for an unknown listing", async () => {
  const player = await getOrCreateTestPlayer();
  const response = await handleBuy({
    params: Promise.resolve({ id: "missing" }),
  }, testRequirePlayer(player));
  assert.equal(response.status, 404);
});

test("POST /api/marketplace/:id/buy returns 400 when the player can't afford it", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedListing(player.credits + 1000);

  const response = await handleBuy({
    params: Promise.resolve({ id }),
  }, testRequirePlayer(player));
  assert.equal(response.status, 400);
});

test("POST /api/marketplace/:id/buy deducts credits, creates the chicken, and removes the listing", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedListing(100);

  const response = await handleBuy({
    params: Promise.resolve({ id }),
  }, testRequirePlayer(player));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.credits, player.credits - 100);

  const chicken = await prisma.chicken.findUnique({ where: { id: body.chicken.id } });
  assert.equal(chicken?.playerId, player.id);

  const listing = await prisma.marketListing.findUnique({ where: { id } });
  assert.equal(listing, null);
});

test("POST /api/chickens/:id/sell pays out credits and deletes the chicken", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedChicken(player.id);

  const response = await handleSell({
    params: Promise.resolve({ id }),
  }, testRequirePlayer(player));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(body.creditsEarned > 0);

  const updatedPlayer = await prisma.player.findUnique({ where: { id: player.id } });
  assert.equal(updatedPlayer?.credits, player.credits + body.creditsEarned);

  const chicken = await prisma.chicken.findUnique({ where: { id } });
  assert.equal(chicken, null);
});

test("POST /api/chickens/:id/sell returns 404 for a chicken owned by another player", async () => {
  const player = await getOrCreateTestPlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const id = await seedChicken(otherPlayer.id);

  const response = await handleSell({
    params: Promise.resolve({ id }),
  }, testRequirePlayer(player));
  assert.equal(response.status, 404);
});
