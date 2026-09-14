import assert from 'node:assert/strict';
import test from 'node:test';

import { ARCHETYPE_PROFILES } from '../combat/behavior';
import { presentFighterIdentity } from '../combat/identityPresenter';
import { makeChicken } from './testHelpers';

test('identity presentation is deterministic for the same persisted state', () => {
  const chicken = makeChicken({ id: 'patient', behavior: ARCHETYPE_PROFILES.counter, fightingStyle: 'counter' });
  assert.deepEqual(presentFighterIdentity(chicken), presentFighterIdentity(structuredClone(chicken)));
  assert.match(presentFighterIdentity(chicken).primaryLabel, /Counter/);
});

test('meaningful behavioral change changes identity copy', () => {
  const base = makeChicken({ behavior: ARCHETYPE_PROFILES.counter });
  const pressure = { ...base, behavior: ARCHETYPE_PROFILES.aggressive };
  assert.notEqual(presentFighterIdentity(base).primaryLabel, presentFighterIdentity(pressure).primaryLabel);
  assert.notEqual(presentFighterIdentity(base).weakness, presentFighterIdentity(pressure).weakness);
});

test('young untested fighters use an honest fallback', () => {
  const identity = presentFighterIdentity(makeChicken({ growthStage: 'juvenile' }));
  assert.equal(identity.confidence, 'untested');
  assert.equal(identity.careerStage, 'Developing prospect');
  assert.match(identity.knownFor[0], /building/i);
});

test('recorded career evidence changes known-for copy', () => {
  const chicken = makeChicken({
    record: { wins: 8, losses: 2, championships: 1, koTko: 2, decisions: 6 },
  });
  assert.match(presentFighterIdentity(chicken).knownFor.join(' '), /championship/i);
  assert.equal(presentFighterIdentity(chicken).confidence, 'established');
});
