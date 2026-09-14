export const REQUIRED_CONSECUTIVE_LAUNCH_RUNS = 10;

export type LaunchStabilityRun = {
  runId: string;
  /** Run began from a newly created player/save and reached campaign completion. */
  completedFreshSaveCampaign: boolean;
  progressionBlockers: number;
  unrecoverableStateErrors: number;
  authoritativeClientDesyncs: number;
  saveCorruptions: number;
  contradictoryRecaps: number;
  /** Includes reconnect and recovery retries that affect economy exactly once. */
  economyRecoveryDefects: number;
  notes?: string;
};

export type LaunchStabilityReport = {
  passed: boolean;
  requiredConsecutiveRuns: number;
  currentConsecutiveCleanRuns: number;
  totalRunsRecorded: number;
  failingRunIds: string[];
  reasons: string[];
};

export function launchStabilityFailures(run: LaunchStabilityRun): string[] {
  if (!run.runId.trim()) throw new Error('runId must be a non-empty string');
  const counters = [
    ['progression blockers', run.progressionBlockers],
    ['unrecoverable state errors', run.unrecoverableStateErrors],
    ['authoritative/client desyncs', run.authoritativeClientDesyncs],
    ['save corruptions', run.saveCorruptions],
    ['duplicate contradictory recaps', run.contradictoryRecaps],
    ['economy reconnect/recovery defects', run.economyRecoveryDefects],
  ] as const;
  const failures = run.completedFreshSaveCampaign ? [] : ['full fresh-save campaign was not completed'];
  for (const [label, value] of counters) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`);
    if (value > 0) failures.push(`${value} ${label}`);
  }
  return failures;
}

/** Runs must be supplied oldest-to-newest; any failed run resets the streak. */
export function evaluateLaunchStability(runs: readonly LaunchStabilityRun[]): LaunchStabilityReport {
  const seen = new Set<string>();
  let currentConsecutiveCleanRuns = 0;
  const failingRunIds: string[] = [];
  const latestFailureReasons: string[] = [];

  for (const run of runs) {
    if (seen.has(run.runId)) throw new Error(`duplicate stability run: ${run.runId}`);
    seen.add(run.runId);
    const failures = launchStabilityFailures(run);
    if (failures.length === 0) {
      currentConsecutiveCleanRuns += 1;
    } else {
      currentConsecutiveCleanRuns = 0;
      failingRunIds.push(run.runId);
      latestFailureReasons.splice(0, latestFailureReasons.length, ...failures);
    }
  }

  const passed = currentConsecutiveCleanRuns >= REQUIRED_CONSECUTIVE_LAUNCH_RUNS;
  const reasons = passed
    ? []
    : [
        `Need ${REQUIRED_CONSECUTIVE_LAUNCH_RUNS - currentConsecutiveCleanRuns} more consecutive clean fresh-save run(s).`,
        ...latestFailureReasons.map((reason) => `Latest failed run: ${reason}.`),
      ];
  return {
    passed,
    requiredConsecutiveRuns: REQUIRED_CONSECUTIVE_LAUNCH_RUNS,
    currentConsecutiveCleanRuns,
    totalRunsRecorded: runs.length,
    failingRunIds,
    reasons,
  };
}
