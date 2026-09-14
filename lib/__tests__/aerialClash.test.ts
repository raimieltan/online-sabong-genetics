import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, stepCombat, COMBAT_VERSION } from '../combat-v2/index';
import { toCombatV2Snapshot } from '../combatV2Snapshot';
import { makeChicken } from './testHelpers';
import { aerialAttack } from '../animation/animations/aerial';
import { makePose } from '../animation/types';

function assertNoGroundedAerialDeadEnd(s: ReturnType<typeof fixture>) {
  for (const f of s.fighters) {
    if (!f.grounded) continue;
    assert.equal(f.locomotion, 'GROUNDED');
    // PRELOAD is intentionally grounded; every launched aerial action must
    // have been cleared as soon as contact is detected.
    assert.ok(!f.currentAction || f.aerial?.launchedTick === -1 || !['jump_kick', 'flying_spur', 'air_left', 'air_right', 'air_peck', 'air_push'].includes(f.currentAction.id));
    assert.ok(!f.aerial || f.aerial.phase === 'PRELOAD' || f.aerial.phase === 'LAND');
  }
}

function seedFlight(s: ReturnType<typeof fixture>, index: number, y: number, vy: number) {
  const f = s.fighters[index];
  f.position.y = y; f.velocity.y = vy; f.grounded = false; f.wasGrounded = false; f.locomotion = 'AIRBORNE'; f.groundedTicks = 0;
  f.currentAction = undefined; f.state = 'neutral'; f.nextDecisionTick = 10000;
  f.aerial = { phase: 'AIRBORNE', phaseTick: s.tick, launchedTick: s.tick - 8, variant: 'left', followups: 0, wingOffset: 0 };
  return f;
}

function fixture() {
  const s = createMatch({ id: 'air-test', version: COMBAT_VERSION, seed: 123,
    fighterA: toCombatV2Snapshot(makeChicken({ id: 'a' }), 'a'),
    fighterB: toCombatV2Snapshot(makeChicken({ id: 'b' }), 'b'), arena: { radius: 3.4 }, maxTicks: 600 });
  s.tick = 19;
  s.fighters.forEach((f, i) => {
    f.position = { x: i ? .53 : -.53, y: .7, z: 0 };
    f.facing = i ? Math.PI : 0;
    f.currentAction = { id: 'jump_kick', startedTick: 0, hit: false, phase: 'active' };
    f.state = 'attacking'; f.nextDecisionTick = 1000;
    f.engagement.phase = 'clashing'; f.engagement.clashUntil = 100;
    f.aerial = { phase: 'STRIKE_ACTIVE', phaseTick: 19, launchedTick: 6, variant: 'bilateral', followups: 0, wingOffset: i * .7 };
  });
  return s;
}

test('airborne trades are collected symmetrically, including lethal trades', () => {
  for (const lethal of [false, true]) {
    const a = fixture(), b = fixture(); b.fighters.reverse();
    if (lethal) [...a.fighters, ...b.fighters].forEach(f => { f.health = 1; });
    stepCombat(a); stepCombat(b);
    assert.equal(a.eventBuffer.filter(e => e.type === 'DAMAGE').length, 2);
    for (const f of a.fighters) {
      const other = b.fighters.find(x => x.snapshot.fighterId === f.snapshot.fighterId)!;
      assert.equal(f.health, other.health); assert.deepEqual(f.velocity, other.velocity);
    }
    if (lethal) assert.equal(a.result?.finishReason, 'double_KO');
    else assert.ok(a.fighters.every(f => f.aerial?.recoil && f.position.y > 0));
  }
});

test('air recovery permits another action before landing and gravity eventually lands it', () => {
  const s = fixture(); const f = s.fighters[0];
  f.currentAction = undefined; f.state = 'neutral'; f.velocity.y = 2;
  let followed = false, landed = false;
  for (let i = 0; i < 100; i++) {
    stepCombat(s);
    if (f.aerial?.followups) followed = true;
    if (f.grounded) { landed = true; break; }
  }
  assert.ok(followed); assert.ok(landed);
});

test('aerial pose chambers both legs, flaps during recovery and adds head recoil', () => {
  const a = fixture().fighters[0].aerial!;
  const pose = makePose(), later = makePose(), hit = makePose();
  aerialAttack({ ...a, phase: 'RECOVERY', tick: 30, phaseProgress: .5 }, pose);
  aerialAttack({ ...a, phase: 'RECOVERY', tick: 33, phaseProgress: .5 }, later);
  assert.ok(pose.ThighL.rx > .7 && pose.ThighR.rx > .7);
  assert.notEqual(pose.WingL.rz, later.WingL.rz);
  aerialAttack({ ...a, phase: 'RECOVERY', tick: 30, phaseProgress: .5, recoil: { tick: 30, zone: 'head', strength: 1, side: 1 } }, hit);
  assert.ok(hit.Neck.rx < pose.Neck.rx);
  assert.equal(hit.ThighL.rx, pose.ThighL.rx);
});

test('normal jump follows preload, takeoff, airborne, land, grounded without an aerial dead-end', () => {
  const s = fixture(); const f = s.fighters[0];
  s.fighters.forEach(x => { x.position.x = x === f ? -1.4 : 1.4; x.nextDecisionTick = 10000; x.currentAction = undefined; x.aerial = undefined; x.state = 'neutral'; x.engagement.phase = 'stalking'; });
  f.currentAction = { id: 'jump_kick', startedTick: s.tick, hit: false, phase: 'startup' };
  f.aerial = { phase: 'PRELOAD', phaseTick: s.tick, launchedTick: -1, variant: 'left', followups: 0, wingOffset: 0 };
  f.state = 'winding_up';
  const phases = new Set<string>(['PRELOAD']); let sawLanding = false;
  for (let i = 0; i < 100; i++) {
    stepCombat(s); if (f.aerial) phases.add(f.aerial.phase);
    sawLanding ||= f.justLanded;
    assertNoGroundedAerialDeadEnd(s);
  }
  assert.ok(phases.has('TAKEOFF') && phases.has('AIRBORNE') && phases.has('LAND'));
  assert.ok(sawLanding); assert.equal(f.grounded, true); assert.equal(f.locomotion, 'GROUNDED'); assert.equal(f.aerial, undefined);
});

test('jump-kick hits descend through LAND after a simultaneous aerial trade', () => {
  const s = fixture();
  stepCombat(s);
  assert.equal(s.eventBuffer.filter(e => e.type === 'DAMAGE').length, 2);
  // Let the already-collected trade resolve through flight and landing without
  // admitting a new clash action into this focused lifecycle assertion.
  s.fighters.forEach(f => { f.engagement.phase = 'stalking'; f.nextDecisionTick = 10000; });
  const sawLand = new Set<string>();
  for (let i = 0; i < 100; i++) {
    stepCombat(s);
    s.fighters.forEach(f => { if (f.aerial?.phase === 'LAND') sawLand.add(f.snapshot.fighterId); });
    assertNoGroundedAerialDeadEnd(s);
  }
  assert.equal(sawLand.size, 2);
  assert.ok(s.fighters.every(f => f.grounded && !f.aerial));
});

test('aerial hit, collision/recoil, interruption and independent landings normalize per fighter', () => {
  const s = fixture();
  const [a, b] = s.fighters;
  // A is about to land while B remains in a valid independent flight.
  seedFlight(s, 0, .002, -.2); seedFlight(s, 1, .8, 0);
  a.currentAction = { id: 'air_left', startedTick: s.tick, hit: false, phase: 'active' };
  b.currentAction = { id: 'air_right', startedTick: s.tick, hit: false, phase: 'active' };
  stepCombat(s);
  assert.equal(a.grounded, true); assert.equal(a.locomotion, 'GROUNDED'); assert.equal(a.aerial?.phase, 'LAND');
  assert.equal(b.grounded, false); assert.equal(b.locomotion, 'AIRBORNE');
  // Simulate an interrupted airborne kick/recoil, then require gravity to
  // provide the sole route back to LAND rather than leaving a stale action.
  b.currentAction = undefined; b.state = 'staggered'; b.aerial!.phase = 'IMPACT'; b.aerial!.recoil = { tick: s.tick, zone: 'body', strength: 1, side: 1 };
  s.fighters.forEach(f => { f.engagement.phase = 'stalking'; f.nextDecisionTick = 10000; });
  for (let i = 0; i < 120; i++) { stepCombat(s); assertNoGroundedAerialDeadEnd(s); }
  assert.ok(s.fighters.every(f => f.grounded && f.locomotion === 'GROUNDED' && !f.aerial));
});

test('repeated simultaneous clashes never retain an aerial state after physical landing', () => {
  for (let round = 0; round < 80; round++) {
    const s = fixture();
    for (let tick = 0; tick < 180; tick++) {
      stepCombat(s);
      assertNoGroundedAerialDeadEnd(s);
    }
    assert.ok(s.fighters.every(f => f.grounded || f.locomotion === 'AIRBORNE'));
  }
});
