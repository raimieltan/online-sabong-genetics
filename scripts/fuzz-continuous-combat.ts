import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { bodyRadius, COMBAT_VERSION, createCombatRng, createMatch, stepCombat } from '../lib/combat-v2/index';
import { toCombatV2Snapshot } from '../lib/combatV2Snapshot';
import { makeChicken } from '../lib/__tests__/testHelpers';
const count = Number(process.argv[2] ?? 10000);
const rng = createCombatRng(123);
const start = performance.now();
let totalTicks = 0, timeouts = 0;
const actionCounts: Record<string, number> = {};
for (let seed = 0; seed < count; seed++) {
  const make = (id: string) => {
    const f = toCombatV2Snapshot(makeChicken({ id, fightingStyle: ['balanced', 'aggressive', 'counter', 'endurance'][rng.nextInt(0, 3)] as 'balanced' }), id);
    return { ...f, stats: Object.fromEntries(Object.keys(f.stats).map(k => [k, rng.nextInt(1, 100)])) as typeof f.stats, behavior: Object.fromEntries(Object.keys(f.behavior).map(k => [k, rng.next()])) as typeof f.behavior, physical: Object.fromEntries(Object.keys(f.physical).map(k => [k, .85 + rng.next() * .3])) as typeof f.physical, condition: rng.next(), experience: rng.next() };
  };
  const s = createMatch({ id: 'fuzz', version: COMBAT_VERSION, seed, fighterA: make('a'), fighterB: make('b'), arena: { radius: 3.4 }, maxTicks: 5400 });
  let finishEvents = 0;
  while (s.phase === 'active') {
    stepCombat(s);
    for (const f of s.fighters) {
      assert.ok(Number.isFinite(f.health) && f.health >= 0 && f.health <= f.snapshot.maxHealth);
      assert.ok(f.stamina >= 0 && f.stamina <= 100);
      assert.ok(Number.isFinite(f.position.x) && Math.hypot(f.position.x, f.position.z) + bodyRadius(f) <= 3.40003);
      assert.ok(Number.isFinite(f.position.y) && f.position.y >= 0);
    }
    const [a, b] = s.fighters;
    assert.ok(Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) >= bodyRadius(a) + bodyRadius(b) - .00003);
    for (const e of s.eventBuffer) if (e.type === 'ATTACK_STARTED') actionCounts[e.actionId!] = (actionCounts[e.actionId!] ?? 0) + 1;
    finishEvents += s.eventBuffer.filter(e => e.type === 'MATCH_FINISHED').length;
  }
  assert.equal(finishEvents, 1);
  totalTicks += s.tick; if (s.result?.finishReason === 'time_limit') timeouts++;
}
console.log(JSON.stringify({ matches: count, averageMs: (performance.now() - start) / count, averageTicks: totalTicks / count, timeouts, actionCounts }));
