import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, bodyRadius, COMBAT_VERSION, createMatch, hurtboxes, separateFighters, stepCombat, strikeCollision } from '../combat-v2/index';
import { toCombatV2Snapshot } from '../combatV2Snapshot';
import { makeChicken } from './testHelpers';
const match = (seed = 1) => createMatch({ id: 'collision', version: COMBAT_VERSION, seed, fighterA: toCombatV2Snapshot(makeChicken({ id: 'a' }), 'a'), fighterB: toCombatV2Snapshot(makeChicken({ id: 'b' }), 'b'), arena: { radius: 3.4 }, maxTicks: 5400 });

test('ground strikes cannot hit a high airborne opponent or a fighter behind the attacker', () => {
  const [a, b] = match().fighters;
  a.position = { x: -.5, y: 0, z: 0 }; b.position = { x: .5, y: 0, z: 0 };
  assert.ok(strikeCollision(a, b, ACTIONS.peck_strike));
  b.position.y = 2;
  assert.equal(strikeCollision(a, b, ACTIONS.peck_strike), undefined);
  assert.equal(hurtboxes(b).find(h => h.zone === 'body')!.center.y, 2.88);
  b.position.y = 0; a.facing = Math.PI;
  assert.equal(strikeCollision(a, b, ACTIONS.peck_strike), undefined);
});
test('body separation resolves overlapping centers and arena-wall collisions', () => {
  for (const positions of [[0, 0, 0, 0], [3, 0, 3, 0], [2.8, 0, 3.2, 0], [2.6, 1, 2.6, 1.1]]) {
    const s = match(), [a, b] = s.fighters;
    a.position.x = positions[0]; a.position.z = positions[1]; b.position.x = positions[2]; b.position.z = positions[3];
    separateFighters(s.fighters, s.config.arena.radius);
    assert.ok(Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) >= bodyRadius(a) + bodyRadius(b) - .00003);
    s.fighters.forEach(f => assert.ok(Math.hypot(f.position.x, f.position.z) + bodyRadius(f) <= s.config.arena.radius + .00003));
  }
});
test('fighters retain body clearance through attacks, recoils and aerial landings', () => {
  for (let seed = 0; seed < 50; seed++) {
    const s = match(seed);
    while (s.phase === 'active') {
      stepCombat(s); const [a, b] = s.fighters;
      assert.ok(Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) >= bodyRadius(a) + bodyRadius(b) - .00003);
      for (const f of s.fighters) { assert.ok(f.position.y >= 0); assert.ok(Math.hypot(f.position.x, f.position.z) + bodyRadius(f) <= s.config.arena.radius + .00003); }
    }
  }
});

test('an interrupted aerial attacker descends without teleporting to ground', () => {
  const s = match(); const [a] = s.fighters;
  a.position.y = .7; a.velocity.y = 1; a.state = 'staggered'; a.stateEnteredTick = 0;
  stepCombat(s); assert.ok(a.position.y > .7);
  for (let tick = 0; tick < 90; tick++) stepCombat(s);
  assert.ok(a.position.y >= 0);
});
