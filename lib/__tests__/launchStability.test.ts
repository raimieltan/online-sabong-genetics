import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateLaunchStability, type LaunchStabilityRun } from '../combat/launchStability';

function clean(runId: string): LaunchStabilityRun {
  return {
    runId,
    completedFreshSaveCampaign: true,
    progressionBlockers: 0,
    unrecoverableStateErrors: 0,
    authoritativeClientDesyncs: 0,
    saveCorruptions: 0,
    contradictoryRecaps: 0,
    economyRecoveryDefects: 0,
  };
}

test('ten consecutive clean fresh-save launch runs pass the stability gate', () => {
  const report = evaluateLaunchStability(Array.from({ length: 10 }, (_, index) => clean(`run-${index}`)));
  assert.equal(report.passed, true);
  assert.equal(report.currentConsecutiveCleanRuns, 10);
  assert.deepEqual(report.reasons, []);
});

test('a defect resets the consecutive run count and preserves evidence', () => {
  const failed = { ...clean('failed'), contradictoryRecaps: 1 };
  const report = evaluateLaunchStability([
    ...Array.from({ length: 8 }, (_, index) => clean(`before-${index}`)),
    failed,
    clean('after-1'),
    clean('after-2'),
  ]);
  assert.equal(report.passed, false);
  assert.equal(report.currentConsecutiveCleanRuns, 2);
  assert.deepEqual(report.failingRunIds, ['failed']);
  assert.match(report.reasons.join(' '), /contradictory recaps/);
});

test('invalid or duplicate evidence is rejected', () => {
  assert.throws(() => evaluateLaunchStability([clean('same'), clean('same')]), /duplicate/);
  assert.throws(
    () => evaluateLaunchStability([{ ...clean('invalid'), saveCorruptions: -1 }]),
    /non-negative integer/,
  );
});
