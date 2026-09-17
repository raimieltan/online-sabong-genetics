import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '../db';
import { PveError } from '../pve/errors';
import { campaignProgress, listBosses, startBossFight } from '../pve/service';
import { ensureTestAuthUser } from './testHelpers';

const playerId = 'launch-pve-service-test';
const authUserId = '11111111-2222-3333-4444-555555555555';

test.beforeEach(async () => {
  await prisma.pveProgress.deleteMany({ where: { playerId } });
  await prisma.pveOpponentHistory.deleteMany({ where: { playerId } });
  await prisma.pveCampaignState.deleteMany({ where: { playerId } });
  await ensureTestAuthUser(authUserId);
  await prisma.player.upsert({
    where: { id: playerId },
    create: { id: playerId, authUserId, credits: 5_000 },
    update: {},
  });
});

test.after(async () => {
  await prisma.pveProgress.deleteMany({ where: { playerId } });
  await prisma.pveOpponentHistory.deleteMany({ where: { playerId } });
  await prisma.pveCampaignState.deleteMany({ where: { playerId } });
  await prisma.player.deleteMany({ where: { id: playerId } });
});

test('service exposes the five launch bosses and unlocks them in teaching order', async () => {
  let bosses = await listBosses(playerId);
  assert.deepEqual(bosses.map((entry) => entry.boss.id), [
    'charger', 'wall', 'grinder', 'feint-master', 'apex',
  ]);
  assert.deepEqual(bosses.map((entry) => entry.progress.unlocked), [true, false, false, false, false]);

  await prisma.pveProgress.create({
    data: { playerId, bossId: 'charger', clearCount: 1, firstClearedAt: new Date(), lastClearedAt: new Date() },
  });
  bosses = await listBosses(playerId);
  assert.deepEqual(bosses.map((entry) => entry.progress.unlocked), [true, true, false, false, false]);
  assert.deepEqual(await campaignProgress(playerId), {
    completedCount: 1,
    totalCount: 5,
    reputation: 35,
    rank: 95,
    unlockedCircuitIds: ['launch-road'],
  });
});

test('archived authored opponents cannot be started through the launch service', async () => {
  await assert.rejects(
    () => startBossFight(playerId, 'rookie', 'missing-chicken'),
    (error: unknown) => error instanceof PveError && error.code === 'BOSS_NOT_FOUND',
  );
});
