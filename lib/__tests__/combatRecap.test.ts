import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createExchangeRecapQueue,
  dismissActiveExchangeRecap,
  enqueueExchangeRecaps,
  EXCHANGE_RECAP_DURATION_MS,
  type ExchangeRecapEvent,
} from '../../components/combat-v2/hud/recapQueue';
import { describeExchangeRecap } from '../../components/combat-v2/hud/uiAdapter';
import { COMBAT_INTERPRETATION_VERSION, type ExchangeResolvedPayload } from '../combat-v2/interpretation';

function payload(overrides: Partial<ExchangeResolvedPayload> = {}): ExchangeResolvedPayload {
  return {
    interpretationVersion: COMBAT_INTERPRETATION_VERSION,
    exchangeIndex: 0,
    read: { decisiveTellId: 'tell-1', tellPhaseAtCommandLock: 'INTENSIFIED', quality: 'GOOD' },
    coaching: { command: 'COUNTER', compliance: 'FULL', reasons: [] },
    primaryOutcome: 'MISSED',
    exchangeResult: 'NO_DECISIVE_RESULT',
    executions: [],
    consequences: { damageDealt: 0, damageTaken: 0, staminaDelta: 0, balanceDelta: 0 },
    refs: {
      instructionEventId: 'instruction-1',
      commandLockEventId: 'lock-1',
      complianceEventIds: ['compliance-1'],
      tellEventIds: ['tell-event-1'],
      actionEventIds: [],
    },
    ...overrides,
  };
}

function recapEvent(id: string, cursor: number, value = payload()): ExchangeRecapEvent {
  return { id, cursor, type: 'EXCHANGE_RESOLVED', payload: value };
}

test('adapter distinguishes a correct decision with poor execution', () => {
  const copy = describeExchangeRecap(payload());
  assert.equal(copy.kicker, 'Good read · Full compliance');
  assert.equal(copy.action, 'COUNTER → attack missed');
  assert.equal(copy.result, 'No decisive result');
  assert.equal(copy.detail, 'The decision was sound; execution fell short');
  assert.match(copy.ariaLabel, /Good read.*Full compliance.*attack missed.*decision was sound/i);
});

test('adapter distinguishes an incorrect decision with a lucky result', () => {
  const copy = describeExchangeRecap(payload({
    read: { decisiveTellId: 'tell-1', tellPhaseAtCommandLock: 'LOCKED', quality: 'BAD' },
    coaching: { command: 'PRESS', compliance: 'FULL', reasons: [] },
    primaryOutcome: 'CLEAN_HIT',
    exchangeResult: 'ADVANTAGE',
  }));
  assert.equal(copy.kicker, 'Bad read · Full compliance');
  assert.equal(copy.action, 'PRESS → clean hit');
  assert.equal(copy.detail, 'The read was poor; execution still succeeded');
  assert.equal(copy.resultTone, 'positive');
});

test('adapter explains compliance with known reasons and supports assistance levels', () => {
  const resisted = payload({
    coaching: { command: 'RECOVER', compliance: 'RESISTED', reasons: ['LOW_STAMINA'] },
    primaryOutcome: 'COUNTERED',
    exchangeResult: 'DISADVANTAGE',
  });
  const onboarding = describeExchangeRecap(resisted, 'onboarding');
  const standard = describeExchangeRecap(resisted, 'standard');
  const advanced = describeExchangeRecap(resisted, 'advanced');

  assert.equal(onboarding.kicker, 'Good read · Instinct overruled coaching');
  assert.equal(onboarding.detail, 'Low stamina slowed the response');
  assert.equal(onboarding.resultTone, 'negative');
  assert.equal(standard.kicker, 'Instinct overruled coaching');
  assert.equal(standard.detail, onboarding.detail);
  assert.equal(advanced.kicker, null);
  assert.equal(advanced.result, null);
  assert.equal(advanced.detail, null);
  assert.equal(advanced.action, onboarding.action);
  assert.equal(advanced.ariaLabel, advanced.action);
});

test('unknown future semantic values degrade to truthful generic copy', () => {
  const future = payload({
    read: { decisiveTellId: null, tellPhaseAtCommandLock: null, quality: 'FUTURE_READ' as ExchangeResolvedPayload['read']['quality'] },
    coaching: { command: 'FUTURE_COMMAND' as ExchangeResolvedPayload['coaching']['command'], compliance: 'FUTURE_COMPLIANCE' as ExchangeResolvedPayload['coaching']['compliance'], reasons: ['FUTURE_REASON'] },
    primaryOutcome: 'FUTURE_OUTCOME' as ExchangeResolvedPayload['primaryOutcome'],
    exchangeResult: 'FUTURE_RESULT' as ExchangeResolvedPayload['exchangeResult'],
  });
  const copy = describeExchangeRecap(future);
  assert.equal(copy.kicker, 'Read unavailable · Compliance unavailable');
  assert.equal(copy.action, 'INSTRUCTION → action resolved');
  assert.equal(copy.result, 'Exchange resolved');
  assert.equal(copy.resultTone, 'neutral');
  assert.doesNotMatch(copy.ariaLabel, /FUTURE_/);
});

test('presentation copy never changes when only hidden numeric consequences change', () => {
  const light = describeExchangeRecap(payload({ consequences: { damageDealt: 1, damageTaken: 0, staminaDelta: -2, balanceDelta: 0 } }));
  const heavy = describeExchangeRecap(payload({ consequences: { damageDealt: 99, damageTaken: 42, staminaDelta: -80, balanceDelta: -50 } }));
  assert.deepEqual(light, heavy);
});

test('batched recaps are sorted by canonical cursor and displayed sequentially', () => {
  const initial = createExchangeRecapQueue();
  const queued = enqueueExchangeRecaps(initial, [recapEvent('recap-3', 30), recapEvent('recap-1', 10), recapEvent('recap-2', 20)]);

  assert.equal(queued.active?.id, 'recap-1');
  assert.deepEqual(queued.queue.map(item => item.id), ['recap-2', 'recap-3']);
  const second = dismissActiveExchangeRecap(queued);
  const third = dismissActiveExchangeRecap(second);
  const finished = dismissActiveExchangeRecap(third);
  assert.equal(second.active?.id, 'recap-2');
  assert.equal(third.active?.id, 'recap-3');
  assert.equal(finished.active, null);
});

test('reconnect overlap and duplicate IDs cannot enqueue a recap twice', () => {
  const first = enqueueExchangeRecaps(createExchangeRecapQueue(), [recapEvent('recap-1', 10), recapEvent('recap-2', 20)]);
  const replayed = enqueueExchangeRecaps(first, [recapEvent('recap-1', 10), recapEvent('recap-2', 20), recapEvent('recap-2', 20)]);
  const withNew = enqueueExchangeRecaps(replayed, [recapEvent('recap-2', 20), recapEvent('recap-3', 30)]);

  assert.equal(replayed, first, 'an all-duplicate delivery should preserve state identity');
  assert.equal(withNew.active?.id, 'recap-1');
  assert.deepEqual(withNew.queue.map(item => item.id), ['recap-2', 'recap-3']);
  assert.deepEqual([...withNew.seenIds], ['recap-1', 'recap-2', 'recap-3']);
});

test('non-recap and invalid future payloads never enter the presentation queue', () => {
  const invalid = { ...recapEvent('invalid', 1), payload: { interpretationVersion: 999 } };
  const unrelated = { ...recapEvent('hit', 2), type: 'HIT' };
  const initial = createExchangeRecapQueue();
  assert.equal(enqueueExchangeRecaps(initial, [invalid, unrelated]), initial);
});

test('recap timing remains inside the launch one-to-two-second readability window', () => {
  assert.ok(EXCHANGE_RECAP_DURATION_MS >= 1_000);
  assert.ok(EXCHANGE_RECAP_DURATION_MS <= 2_000);
});
