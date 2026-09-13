import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AWAKENING_MODIFIERS } from '../combat-v2/awakenings';
import { withNpcAwakening } from '../combat/evolution';
import { makeChicken } from './testHelpers';

test('each awakening has a strong, distinct combat identity', () => {
  const { apex, berserker, unbreakable } = AWAKENING_MODIFIERS;
  const flow = AWAKENING_MODIFIERS['flow-state'];
  const secondWind = AWAKENING_MODIFIERS['second-wind'];

  assert.ok(unbreakable.incomingDamage <= 0.65, 'Unbreakable should prevent at least 35% of incoming damage');
  assert.ok(unbreakable.resolve > flow.resolve, 'Unbreakable should be harder to interrupt than Flow State');
  assert.ok(flow.evadeChance >= 0.3, 'Flow State should have a meaningful mirage dodge chance');
  assert.ok(flow.speed >= 1.2, 'Flow State should materially improve movement speed');
  assert.ok(secondWind.staminaRecovery > unbreakable.staminaRecovery * 3, 'Second Wind should own stamina recovery');
  assert.ok(berserker.power >= 1.25, 'Berserker should have a major offense boost');
  assert.ok(berserker.incomingDamage > 1, 'Berserker power should retain a defensive downside');
  assert.ok(apex.power > berserker.power, 'Apex should be the strongest offensive awakening');
  assert.ok(apex.incomingDamage < 0.7 && apex.speed >= 1.25, 'Apex should significantly boost all core combat dimensions');
});

test('generated AI chickens receive one style-appropriate awakening', () => {
  const cases = [
    ['aggressive', 'berserker'],
    ['counter', 'flow-state'],
    ['endurance', 'unbreakable'],
    ['balanced', 'second-wind'],
  ] as const;

  for (const [fightingStyle, expected] of cases) {
    const npc = withNpcAwakening(makeChicken({ fightingStyle }));
    assert.deepEqual(npc.combatCareer?.awakenings.filter(awakening => awakening.unlocked).map(awakening => awakening.id), [expected]);
  }
  const apex = withNpcAwakening(makeChicken({ id: 'pve-boss-apex', name: 'The Apex' }));
  assert.deepEqual(apex.combatCareer?.awakenings.filter(awakening => awakening.unlocked).map(awakening => awakening.id), ['apex']);
});
