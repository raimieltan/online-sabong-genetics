import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, AWAKENING_DURATION_TICKS, COMBAT_VERSION, CombatSession, createMatch, createCombatRng, queueCommand, runCombatToCompletion, stepCombat, triggerAwakening } from '../combat-v2/index';
import type { CombatMatchState, MatchConfig } from '../combat-v2/types';
import { toCombatV2Snapshot } from '../combatV2Snapshot';
import { makeChicken } from './testHelpers';
import { readTicks, resetProfile } from '../combat-v2/rhythm';
import { TEMPORARY_COMBAT_EXAGGERATION } from '../combat-v2/constants';

const config = (seed = 1): MatchConfig => ({ id: 'test', version: COMBAT_VERSION, seed, fighterA: toCombatV2Snapshot(makeChicken({ id: 'a' }), 'player-a'), fighterB: toCombatV2Snapshot(makeChicken({ id: 'b', fightingStyle: 'counter' }), 'player-b'), arena: { radius: 3.4 }, maxTicks: 5400 });
test('neutral occupies most fighter time and only first attacks wait for reading', () => {
  let neutral = 0, total = 0, attacks = 0;
  for (let seed = 0; seed < 20; seed++) {
    const s = createMatch(config(seed));
    while (s.phase === 'active') {
      const before = s.fighters.map(f => ({ phase: f.engagement.phase, entered: f.engagement.enteredTick, read: readTicks(f), reset: f.engagement.resetUntil, reacting: !!f.reaction }));
      stepCombat(s);
      s.fighters.forEach((f, i) => {
        total++;
        if (['stalking', 'resetting'].includes(f.engagement.phase)) neutral++;
        for (const e of s.eventBuffer.filter(e => e.fighterId === f.snapshot.fighterId && e.type === 'ATTACK_STARTED' && ACTIONS[e.actionId!]?.category === 'attack')) {
          attacks++;
          assert.ok(['stalking', 'committing', 'clashing'].includes(before[i].phase));
          if (before[i].phase === 'stalking') assert.ok(before[i].reacting || e.tick - before[i].entered >= before[i].read);
          assert.ok(e.tick >= before[i].reset);
        }
      });
    }
  }
  assert.ok(attacks > 20);
  assert.ok(neutral / total >= .6 && neutral / total <= .85, `neutral fraction: ${neutral / total}`);
});
test('a clash is a variable-length burst with multiple action opportunities before break', () => {
  let multiActionClashes = 0, collisionClashes = 0;
  for (let seed = 0; seed < 30; seed++) {
    const c = config(seed);
    const brawler = { aggression: 1, caution: 0, patience: 0, persistence: 1, riskTolerance: 1, counterPreference: .15, pressurePreference: 1, recoveryPreference: 0 };
    c.fighterA = { ...c.fighterA, behavior: brawler }; c.fighterB = { ...c.fighterB, behavior: brawler };
    const s = createMatch(c);
    const actionsByClash = new Map<string, number>();
    let clash = 0, sawCollision = false;
    while (s.phase === 'active') {
      stepCombat(s);
      for (const e of s.eventBuffer) {
        if (e.type === 'CLASH_STARTED') clash++;
        if (e.type === 'ATTACK_STARTED' && ['committing', 'clashing'].includes(s.fighters.find(f => f.snapshot.fighterId === e.fighterId)?.engagement.phase ?? '')) {
          const key = `${e.fighterId}:${clash}`; actionsByClash.set(key, (actionsByClash.get(key) ?? 0) + 1);
        }
        if (e.type === 'COLLISION') sawCollision = true;
      }
    }
    if ([...actionsByClash.values()].some(count => count >= 2)) multiActionClashes++;
    if (sawCollision) collisionClashes++;
  }
  assert.ok(multiActionClashes >= 5, `${multiActionClashes}/30 fights produced multi-action clashes`);
  assert.ok(collisionClashes >= 5, `${collisionClashes}/30 fights produced physical collision events`);
});
test('patient, tired and injured fighters read longer; pressure shortens the wait', () => {
  const f = createMatch(config()).fighters[0];
  const normal = readTicks(f);
  f.tacticalMode = 'pressure'; assert.ok(readTicks(f) < normal);
  f.tacticalMode = 'counter'; assert.ok(readTicks(f) > normal);
  f.tacticalMode = 'balanced'; f.stamina = 30; f.health *= .5;
  assert.ok(readTicks(f) > normal);
});
test('temporary tactics are deliberately far apart', () => {
  const f = createMatch(config()).fighters[0];
  f.coaching = { command: 'recover', compliance: 'obey', strength: 1, issuedTick: 0, exchangeTick: 0, successful: false };
  f.tacticalMode = 'recover'; const recoverDistance = resetProfile(f).distance;
  f.tacticalMode = 'defensive'; const guardDistance = resetProfile(f).distance;
  f.tacticalMode = 'counter'; const counterDistance = resetProfile(f).distance;
  f.tacticalMode = 'pressure'; const pressDistance = resetProfile(f).distance;
  assert.ok(recoverDistance >= guardDistance + 3, `${recoverDistance} vs ${guardDistance}`);
  assert.ok(guardDistance > counterDistance && counterDistance > pressDistance);
  assert.equal(ACTIONS.peck_strike.startupTicks, 4 * TEMPORARY_COMBAT_EXAGGERATION);
  assert.equal(ACTIONS.guard.activeTicks, 10 * TEMPORARY_COMBAT_EXAGGERATION);
});
test('PRESS commits while COUNTER, GUARD and RECOVER visibly refuse initiation', () => {
  const utilities = (mode: 'pressure' | 'counter' | 'defensive' | 'recover') => {
    const s = createMatch(config(9));
    const f = s.fighters[0];
    f.tacticalMode = mode;
    f.coaching = { command: mode, compliance: 'obey', strength: 1, issuedTick: 0, exchangeTick: 0, successful: false };
    f.engagement.enteredTick = -1000;
    f.engagement.desiredRange = resetProfile(f).distance;
    f.nextDecisionTick = 0;
    s.fighters[1].nextDecisionTick = 1000;
    stepCombat(s);
    return f.utilities;
  };
  const press = utilities('pressure');
  const counter = utilities('counter');
  const guard = utilities('defensive');
  const recover = utilities('recover');
  assert.ok(press.advance > press.circle + press.retreat + press.guard);
  assert.ok(counter.circle + counter.retreat + counter.guard > counter.advance + counter.flying_spur);
  assert.ok(guard.guard > guard.advance + guard.flying_spur);
  assert.equal(recover.advance + recover.peck_strike + recover.spur_lunge + recover.jump_kick + recover.flying_spur, 0);
  assert.ok(recover.retreat + recover.recover > recover.guard);
});
test('ordinary autonomous fights produce overlapping clashes and mutual hits', (t) => {
  let fightsWithClashes = 0, mutualExchanges = 0;
  for (let seed = 0; seed < 30; seed++) {
    const s = createMatch(config(seed));
    let overlapped = false;
    const traded = new Set<string>();
    while (s.phase === 'active') {
      stepCombat(s);
      const [a, b] = s.fighters;
      if (s.fighters.every(f => f.currentAction?.phase === 'active' && ACTIONS[f.currentAction.id].damage > 0)) {
        overlapped = true;
        if (a.currentAction!.hit && b.currentAction!.hit) traded.add(`${a.currentAction!.startedTick}:${b.currentAction!.startedTick}`);
      }
    }
    if (overlapped) fightsWithClashes++;
    mutualExchanges += traded.size;
  }
  t.diagnostic(`${fightsWithClashes}/30 fights had simultaneous active strikes; ${mutualExchanges} exchanges landed both strikes`);
  assert.ok(fightsWithClashes >= 3);
  assert.ok(mutualExchanges >= 5);
});
function check(s: CombatMatchState) {
  for (const f of s.fighters) {
    assert.ok(f.health >= 0 && f.health <= f.snapshot.maxHealth);
    assert.ok(f.stamina >= 0 && f.stamina <= 100);
    assert.ok(Number.isFinite(f.position.x) && Number.isFinite(f.position.z));
    assert.ok(Math.hypot(f.position.x, f.position.z) <= s.config.arena.radius - .3499);
    if (f.state === 'down' || f.state === 'finished') { assert.equal(f.currentAction, undefined); assert.deepEqual(f.velocity, { x: 0, y: 0, z: 0 }); }
  }
}
function pairedAttack(s: CombatMatchState, id = 'peck_strike', age = 8) {
  s.tick = age;
  s.fighters.forEach((f, i) => {
    f.position = { x: i ? .4 : -.4, y: 0, z: 0 };
    f.facing = i ? Math.PI : 0;
    f.currentAction = { id, startedTick: 0, hit: false, phase: 'startup' };
    f.state = 'winding_up';
    f.nextDecisionTick = 10000;
  });
}

test('seeded RNG, including seed zero, is reproducible', () => {
  for (const seed of [0, 1, 0xffffffff]) {
    const a = createCombatRng(seed), b = createCombatRng(seed);
    for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
    const restored = createCombatRng(a.state); assert.equal(restored.next(), a.next());
  }
});
test('snapshots are detached and recursively frozen', () => {
  const input = config(); const before = JSON.stringify(input); const s = createMatch(input);
  assert.notEqual(s.config.fighterA, input.fighterA);
  assert.ok(Object.isFrozen(s.config.fighterA.stats));
  stepCombat(s); assert.equal(JSON.stringify(input), before);
});
test('active windows permit simultaneous hits and double KO', () => {
  const s = createMatch(config()); pairedAttack(s);
  s.fighters.forEach(f => { f.health = 1; }); stepCombat(s);
  assert.equal(s.eventBuffer.filter(e => e.type === 'DAMAGE').length, 2);
  assert.equal(s.result?.finishReason, 'double_KO'); assert.equal(s.result?.winnerId, null);
  const final = JSON.stringify(s); stepCombat(s); assert.equal(JSON.stringify(s), final); check(s);
});
test('startup cannot hit and heavy startup can be interrupted', () => {
  const s = createMatch(config()); pairedAttack(s, 'spur_lunge', 6); stepCombat(s);
  assert.equal(s.eventBuffer.filter(e => e.type === 'DAMAGE').length, 0);
  s.fighters[0].currentAction = { id: 'peck_strike', startedTick: s.tick - ACTIONS.peck_strike.startupTicks, hit: false, phase: 'startup' };
  s.fighters[1].currentAction = { id: 'spur_lunge', startedTick: s.tick - (ACTIONS.spur_lunge.startupTicks - 2), hit: false, phase: 'startup' };
  stepCombat(s);
  assert.equal(s.fighters[1].state, 'staggered'); assert.equal(s.fighters[1].currentAction, undefined);
  assert.equal(s.fighters[0].health, s.fighters[0].snapshot.maxHealth);
});
test('range and evade deny contact; guard reduces damage; hit cannot repeat', () => {
  const far = createMatch(config()); pairedAttack(far); far.fighters[1].position.x = 2; stepCombat(far);
  assert.equal(far.eventBuffer.filter(e => e.type === 'DAMAGE').length, 0);
  const evade = createMatch(config()); pairedAttack(evade);
  evade.fighters[1].currentAction = { id: 'sidestep', startedTick: 0, hit: false, phase: 'active' }; evade.fighters[1].state = 'evading';
  stepCombat(evade); assert.equal(evade.eventBuffer.filter(e => e.type === 'DAMAGE').length, 0);
  const block = createMatch(config()); pairedAttack(block);
  block.fighters[1].currentAction = { id: 'guard', startedTick: 0, hit: false, phase: 'active' }; block.fighters[1].state = 'defending';
  stepCombat(block); assert.equal(block.eventBuffer.filter(e => e.type === 'BLOCK').length, 1);
  const hp = block.fighters[1].health; stepCombat(block); assert.equal(block.fighters[1].health, hp);
});
test('Flow State phase-dodge leaves a presentation key and slips off the attack line', () => {
  let witnessed = false;
  for (let seed = 0; seed < 40 && !witnessed; seed++) {
    const c = config(seed);
    c.fighterB = { ...c.fighterB, evolution: { ...c.fighterB.evolution, awakenings: ['flow-state'] } };
    const s = createMatch(c);
    triggerAwakening(s, 'b', 'flow-state');
    pairedAttack(s);
    const target = s.fighters[1];
    target.currentAction = undefined;
    target.state = 'neutral';
    const before = { ...target.position };
    stepCombat(s);
    const evade = s.eventBuffer.find(event => event.type === 'EVADE' && event.detail === 'MIRAGE_EVADE');
    if (!evade) continue;
    witnessed = true;
    assert.equal(target.lastMirageEvadeTick, s.tick);
    assert.ok(Math.hypot(target.position.x - before.x, target.position.z - before.z) >= .5);
    assert.equal(s.eventBuffer.some(event => event.type === 'DAMAGE' && event.fighterId === target.snapshot.fighterId), false);
  }
  assert.equal(witnessed, true, 'seed sweep should observe at least one deterministic Flow State phase-dodge');
});
test('awakening expires after exactly 30 seconds and cannot immediately retrigger', () => {
  const c = config();
  c.fighterA = { ...c.fighterA, evolution: { ...c.fighterA.evolution, awakenings: ['unbreakable'] } };
  const s = createMatch(c);
  triggerAwakening(s, 'a', 'unbreakable');
  s.tick = AWAKENING_DURATION_TICKS - 2;
  s.fighters.forEach(fighter => { fighter.nextDecisionTick = AWAKENING_DURATION_TICKS + 10; });

  stepCombat(s);
  assert.equal(s.fighters[0].awakening?.type, 'unbreakable');
  stepCombat(s);
  assert.equal(s.fighters[0].awakening, undefined);
  assert.equal(s.eventBuffer.some(event => event.type === 'AWAKENING_ENDED' && event.fighterId === 'a'), true);
  assert.throws(() => triggerAwakening(s, 'a', 'unbreakable'), /already awakened/);
});
test('commands enforce identity, tick, sequence, and lock once committed', () => {
  const s = createMatch(config());
  const c = { playerId: 'player-a', fighterId: 'a', command: 'pressure' as const, issuedTick: 0, effectiveTick: 12, sequence: 0 };
  assert.throws(() => queueCommand(s, { ...c, playerId: 'player-b' }));
  assert.throws(() => queueCommand(s, { ...c, effectiveTick: 0 }));
  queueCommand(s, c); assert.throws(() => queueCommand(s, c));
  // docs/combat/tell-revamped.md §5-6: the read may be freely revised right
  // up until commitment — there is no cooldown between commands.
  assert.doesNotThrow(() => queueCommand(s, { ...c, command: 'counter', sequence: 1, effectiveTick: 13 }));
  for (let i = 0; i < 11; i++) stepCombat(s);
  assert.equal(s.fighters[0].tacticalMode, 'balanced'); stepCombat(s); assert.equal(s.fighters[0].tacticalMode, 'pressure');
  // Once the fighter has committed to an exchange, coaching locks until the
  // next readable window.
  s.fighters[0].engagement.phase = 'committing';
  assert.throws(() => queueCommand(s, { ...c, command: 'recover', sequence: 2, effectiveTick: s.tick + 12 }));
});
test('different render rates advance identical simulation ticks', () => {
  const sessions = [47, 60, 144, 240].map(fps => {
    const session = new CombatSession(config(12));
    for (let frame = 0; frame < fps * 10; frame++) session.update(1 / fps);
    return session;
  });
  sessions.forEach(s => { assert.equal(s.state.tick, 600); assert.deepEqual(s.state, sessions[0].state); });
  const paused = sessions[0]; paused.stop(); paused.update(10); assert.equal(paused.state.tick, 600);
  paused.start(); paused.update(1 / 60); assert.equal(paused.state.tick, 601);
});
test('frame debt survives suspension without dropping ticks', () => {
  const session = new CombatSession(config()); session.update(10);
  assert.equal(session.state.tick, 240); session.update(0); session.update(0);
  assert.equal(session.state.tick, 600); assert.deepEqual(session.state, (() => { const s = createMatch(config()); for (let i = 0; i < 600; i++) stepCombat(s); return s; })());
});
test('unsupported versions and corrupt inputs fail at initialization', () => {
  assert.throws(() => createMatch({ ...config(), version: '3.0.0' }));
  assert.throws(() => createMatch({ ...config(), seed: NaN }));
  assert.throws(() => createMatch({ ...config(), maxTicks: Infinity }));
});
test('deterministic events and invariants across 100 seeds', () => {
  for (let seed = 0; seed < 100; seed++) {
    const a = createMatch(config(seed)), b = createMatch(config(seed));
    while (a.phase === 'active') {
      stepCombat(a); stepCombat(b); check(a);
      assert.deepEqual(a.eventBuffer, b.eventBuffer);
      for (const e of a.eventBuffer.filter(e => e.type === 'ATTACK_LANDED')) assert.ok(ACTIONS[e.actionId!].damage > 0);
    }
    assert.deepEqual(a, b); assert.ok(a.tick <= a.config.maxTicks);
  }
});
test('defensive matchups engage rather than remaining neutral', () => {
  for (let seed = 0; seed < 30; seed++) {
    const c = config(seed); c.fighterA = { ...c.fighterA, behavior: { aggression: 0, caution: 1, patience: 1, persistence: 0, riskTolerance: 0, counterPreference: 1, pressurePreference: 0, recoveryPreference: 1 } }; c.fighterB = { ...c.fighterB, behavior: c.fighterA.behavior };
    const s = runCombatToCompletion(c); assert.ok(s.fighters.some(f => f.health < f.snapshot.maxHealth));
  }
});

test('jump kicks have real airborne height, landing and attack variety', () => {
  const actions = new Set<string>(); let maximumY = 0; let aerialHits = 0;
  for (let seed = 0; seed < 25; seed++) {
    const s = createMatch(config(seed));
    while (s.phase === 'active') {
      stepCombat(s);
      maximumY = Math.max(maximumY, ...s.fighters.map(f => f.position.y));
      for (const e of s.eventBuffer) {
        if (e.type === 'ATTACK_STARTED') actions.add(e.actionId!);
        if (e.type === 'ATTACK_LANDED' && ACTIONS[e.actionId!]?.aerial) aerialHits++;
      }
    }
    s.fighters.forEach(f => assert.equal(f.position.y, 0));
  }
  assert.ok(maximumY > .7); assert.ok(actions.has('jump_kick')); assert.ok(actions.has('flying_spur')); assert.ok(aerialHits > 0);
});

test('committed attacks break apart and reset before renewed pressure', () => {
  let breaks = 0, resets = 0, reengagements = 0;
  const s = createMatch(config(51));
  const breakingDistances = new Map<string, number>();
  while (s.phase === 'active') {
    stepCombat(s);
    const [a, b] = s.fighters, distance = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
    for (const e of s.eventBuffer.filter(e => e.type === 'ENGAGEMENT_CHANGED')) {
      if (e.detail === 'breaking') { breaks++; breakingDistances.set(e.fighterId, distance); }
      if (e.detail === 'resetting') { resets++; if (distance > (breakingDistances.get(e.fighterId) ?? distance) + .15) reengagements++; }
    }
  }
  assert.ok(breaks > 2); assert.ok(resets > 2); assert.ok(reengagements > 0);
});
