import assert from 'node:assert/strict';
import test from 'node:test';

import { launchSurfaceAllowsAwakening } from '../combat-v2/launchSurface';
import { PVE_BOSSES } from '../pve/bosses';
import {
  isLaunchOptionalEncounterId,
  isLaunchPveBossId,
  LAUNCH_OPTIONAL_ENCOUNTER_IDS,
  LAUNCH_PVE_BOSS_ORDER,
  LAUNCH_PVE_CIRCUITS,
  previousLaunchBossId,
} from '../pve/launch';
import { PVE_SIDE_ENCOUNTERS } from '../pve/sideEncounters';
import { PVE_BOSS_ORDER } from '../pve/types';

test('launch campaign exposes exactly the frozen five teaching opponents', () => {
  assert.deepEqual(LAUNCH_PVE_BOSS_ORDER, [
    'charger',
    'wall',
    'grinder',
    'feint-master',
    'apex',
  ]);
  assert.equal(new Set(LAUNCH_PVE_BOSS_ORDER).size, 5);
  assert.ok(LAUNCH_PVE_BOSS_ORDER.every((id) => PVE_BOSSES[id]));
  assert.equal(LAUNCH_PVE_CIRCUITS.length, 1);
  assert.deepEqual(LAUNCH_PVE_CIRCUITS[0].bossIds, LAUNCH_PVE_BOSS_ORDER);
  assert.equal(LAUNCH_PVE_CIRCUITS[0].championshipBossId, 'apex');
});

test('launch unlock chain follows teaching order while archived content remains intact', () => {
  assert.equal(previousLaunchBossId('charger'), null);
  assert.equal(previousLaunchBossId('wall'), 'charger');
  assert.equal(previousLaunchBossId('grinder'), 'wall');
  assert.equal(previousLaunchBossId('feint-master'), 'grinder');
  assert.equal(previousLaunchBossId('apex'), 'feint-master');
  assert.equal(previousLaunchBossId('rookie'), null);
  assert.equal(PVE_BOSS_ORDER.length, 20, 'post-launch authored opponents stay registered');
  assert.equal(isLaunchPveBossId('charger'), true);
  assert.equal(isLaunchPveBossId('rookie'), false);
});

test('each launch opponent has the intended behavioral teaching signature', () => {
  assert.ok((PVE_BOSSES.charger.behaviorOverrides?.aggression ?? 0) >= 0.8);
  assert.ok((PVE_BOSSES.charger.behaviorOverrides?.pressurePreference ?? 0) >= 0.8);
  assert.ok((PVE_BOSSES.wall.behaviorOverrides?.caution ?? 0) >= 0.8);
  assert.ok((PVE_BOSSES.wall.behaviorOverrides?.patience ?? 0) >= 0.8);
  assert.ok((PVE_BOSSES.grinder.behaviorOverrides?.recoveryPreference ?? 0) >= 0.8);
  assert.ok((PVE_BOSSES.grinder.behaviorOverrides?.persistence ?? 0) >= 0.8);
  assert.ok((PVE_BOSSES['feint-master'].behaviorOverrides?.patience ?? 0) >= 0.8);
  assert.ok((PVE_BOSSES['feint-master'].behaviorOverrides?.counterPreference ?? 0) >= 0.7);
  assert.ok((PVE_BOSSES.apex.behaviorOverrides?.pressurePreference ?? 0) >= 0.7);
  assert.ok((PVE_BOSSES.apex.behaviorOverrides?.counterPreference ?? 0) >= 0.7);
  assert.ok((PVE_BOSSES.apex.behaviorOverrides?.recoveryPreference ?? 0) >= 0.7);
});

test('launch champion tests synthesis without being a perfect-stat gate', () => {
  const apex = PVE_BOSSES.apex;
  assert.ok(Object.values(apex.iv).every((value) => value < 90));
  assert.ok(Object.values(apex.ev).every((value) => value <= 40));
  assert.ok(Object.values(apex.preview).every((value) => value <= 8));
  assert.match(apex.recommendation, /all four/i);
});

test('launch exposes no more than two optional encounters', () => {
  assert.ok(LAUNCH_OPTIONAL_ENCOUNTER_IDS.length <= 2);
  assert.ok(
    LAUNCH_OPTIONAL_ENCOUNTER_IDS.every((id) =>
      PVE_SIDE_ENCOUNTERS.some((encounter) => encounter.id === id),
    ),
  );
  assert.equal(isLaunchOptionalEncounterId('backyard-brawl-challenge'), true);
  assert.equal(isLaunchOptionalEncounterId('provincial-underground-challenge'), false);
});

test('launch campaign is four-command-only while other modes retain awakening', () => {
  assert.equal(launchSurfaceAllowsAwakening('PVE'), false);
  assert.equal(launchSurfaceAllowsAwakening('BOSS'), false);
  assert.equal(launchSurfaceAllowsAwakening('SIDE_ENCOUNTER'), false);
  assert.equal(launchSurfaceAllowsAwakening('NORMAL'), true);
  assert.equal(launchSurfaceAllowsAwakening('TOURNAMENT'), true);
  assert.equal(launchSurfaceAllowsAwakening('PVP'), true);
});
