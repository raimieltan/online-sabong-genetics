import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateBlindTest,
  scoreBlindExplanation,
  type BlindTestDataset,
  type BlindTestExplanation,
  type BlindTestParticipant,
} from '../combat/blindTest';
import { LAUNCH_PVE_BOSS_ORDER } from '../pve/launch';

function explanation(testerId: string, exchangeEventId: string): BlindTestExplanation {
  return {
    testerId,
    exchangeEventId,
    observedSituation: 1,
    commandUnderstood: 1,
    complianceUnderstood: 1,
    executionUnderstood: 1,
    resultUnderstood: 1,
    causalRelationship: 2,
  };
}

function participant(index: number): BlindTestParticipant {
  return {
    testerId: `tester-${index}`,
    behavioralDescription: true,
    identityMatched: true,
    opponentRecognition: Object.fromEntries(
      LAUNCH_PVE_BOSS_ORDER.map((bossId) => [bossId, true]),
    ),
  };
}

function passingDataset(): BlindTestDataset {
  const participants = Array.from({ length: 10 }, (_, index) => participant(index));
  return {
    participants,
    explanations: participants.flatMap((entry, testerIndex) =>
      Array.from({ length: 5 }, (_, exchangeIndex) =>
        explanation(entry.testerId, `exchange-${testerIndex}-${exchangeIndex}`),
      ),
    ),
  };
}

test('component rubric scores explanations from zero to seven', () => {
  assert.equal(scoreBlindExplanation(explanation('t', 'e')), 7);
  assert.equal(
    scoreBlindExplanation({
      ...explanation('t', 'e'),
      observedSituation: 0,
      commandUnderstood: 0,
      causalRelationship: 0,
    }),
    3,
  );
});

test('a complete qualifying dataset passes all blind-test gates', () => {
  const report = evaluateBlindTest(passingDataset());
  assert.equal(report.ready, true);
  assert.equal(report.comprehension.testerCount, 10);
  assert.equal(report.comprehension.explanationCount, 50);
  assert.deepEqual(report.reasons, []);
});

test('sample size, component, identity, and opponent failures are reported separately', () => {
  const dataset = passingDataset();
  const explanations = dataset.explanations.slice(0, 9).map((entry) => ({
    ...entry,
    complianceUnderstood: 0 as const,
  }));
  const participants = dataset.participants.slice(0, 9).map((entry, index) => ({
    ...entry,
    behavioralDescription: index >= 2,
    opponentRecognition: index < 2 ? {} : entry.opponentRecognition,
  }));
  const report = evaluateBlindTest({ explanations, participants });
  assert.equal(report.ready, false);
  assert.equal(report.comprehension.categories.complianceUnderstood.passed, false);
  assert.equal(report.fighterIdentity.passed, false);
  assert.equal(report.opponentIdentity.passed, false);
  assert.ok(report.reasons.length >= 5);
});

test('grades must reference a participant and a unique authoritative event per tester', () => {
  const dataset = passingDataset();
  assert.throws(
    () => evaluateBlindTest({ ...dataset, explanations: [explanation('missing', 'event')] }),
    /unknown tester/,
  );
  assert.throws(
    () =>
      evaluateBlindTest({
        ...dataset,
        explanations: [
          explanation('tester-0', 'same-event'),
          explanation('tester-0', 'same-event'),
        ],
      }),
    /duplicate exchange grade/,
  );
  assert.throws(() => scoreBlindExplanation(explanation('tester-0', '')), /exchangeEventId/);
});
