import { LAUNCH_PVE_BOSS_ORDER, type LaunchPveBossId } from '../pve/launch';

export const BLIND_TEST_MIN_TESTERS = 10;
export const BLIND_TEST_MIN_EXPLANATIONS = 50;
export const BLIND_TEST_PASS_RATE = 0.8;
export const BLIND_TEST_CATEGORY_RATE = 0.7;
export const BLIND_TEST_PASS_SCORE = 5;
export const BLIND_TEST_MAX_SCORE = 7;

export const EXPLANATION_COMPONENT_MAX = {
  observedSituation: 1,
  commandUnderstood: 1,
  complianceUnderstood: 1,
  executionUnderstood: 1,
  resultUnderstood: 1,
  causalRelationship: 2,
} as const;

export type ExplanationComponent = keyof typeof EXPLANATION_COMPONENT_MAX;

export type BlindTestExplanation = {
  testerId: string;
  /** ID of the authoritative EXCHANGE_RESOLVED event used by the grader. */
  exchangeEventId: string;
  observedSituation: 0 | 1;
  commandUnderstood: 0 | 1;
  complianceUnderstood: 0 | 1;
  executionUnderstood: 0 | 1;
  resultUnderstood: 0 | 1;
  causalRelationship: 0 | 1 | 2;
  response?: string;
  incorrectMentalModel?: string;
  unreadableCue?: string;
  ignoredUi?: string;
  contradictoryFeedback?: string;
};

export type BlindTestParticipant = {
  testerId: string;
  /** Description used behavioral language without a stat prompt. */
  behavioralDescription: boolean;
  /** Description agreed materially with the deterministic identity presenter. */
  identityMatched: boolean;
  /** Record only after this opponent has been fought at least twice. */
  opponentRecognition: Partial<Record<LaunchPveBossId, boolean>>;
};

export type BlindTestDataset = {
  explanations: readonly BlindTestExplanation[];
  participants: readonly BlindTestParticipant[];
};

export type GateResult = {
  passed: boolean;
  rate: number;
  numerator: number;
  denominator: number;
};

export type BlindTestReport = {
  ready: boolean;
  comprehension: {
    passed: boolean;
    testerCount: number;
    explanationCount: number;
    explanationsAtOrAboveFive: GateResult;
    categories: Record<ExplanationComponent, GateResult>;
  };
  fighterIdentity: GateResult;
  opponentIdentity: GateResult;
  reasons: string[];
};

function ratio(numerator: number, denominator: number, threshold: number): GateResult {
  const rate = denominator === 0 ? 0 : numerator / denominator;
  return { passed: denominator > 0 && rate >= threshold, rate, numerator, denominator };
}

function assertId(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must be a non-empty string`);
}

export function scoreBlindExplanation(explanation: BlindTestExplanation): number {
  assertId(explanation.testerId, 'testerId');
  assertId(explanation.exchangeEventId, 'exchangeEventId');

  let total = 0;
  for (const component of Object.keys(EXPLANATION_COMPONENT_MAX) as ExplanationComponent[]) {
    const score = explanation[component];
    const maximum = EXPLANATION_COMPONENT_MAX[component];
    if (!Number.isInteger(score) || score < 0 || score > maximum) {
      throw new Error(`${component} must be an integer from 0 to ${maximum}`);
    }
    total += score;
  }
  return total;
}

export function evaluateBlindTest(dataset: BlindTestDataset): BlindTestReport {
  const reasons: string[] = [];
  const participantIds = new Set<string>();
  for (const participant of dataset.participants) {
    assertId(participant.testerId, 'participant testerId');
    if (participantIds.has(participant.testerId)) {
      throw new Error(`duplicate participant: ${participant.testerId}`);
    }
    participantIds.add(participant.testerId);
  }

  const uniqueExchangeGrades = new Set<string>();
  const totals = Object.fromEntries(
    Object.keys(EXPLANATION_COMPONENT_MAX).map((component) => [component, 0]),
  ) as Record<ExplanationComponent, number>;
  let passingExplanations = 0;

  for (const explanation of dataset.explanations) {
    if (!participantIds.has(explanation.testerId)) {
      throw new Error(`explanation references unknown tester: ${explanation.testerId}`);
    }
    scoreBlindExplanation(explanation);
    const gradeKey = `${explanation.testerId}\u0000${explanation.exchangeEventId}`;
    if (uniqueExchangeGrades.has(gradeKey)) {
      throw new Error(`duplicate exchange grade for tester: ${explanation.exchangeEventId}`);
    }
    uniqueExchangeGrades.add(gradeKey);
    if (scoreBlindExplanation(explanation) >= BLIND_TEST_PASS_SCORE) passingExplanations += 1;
    for (const component of Object.keys(EXPLANATION_COMPONENT_MAX) as ExplanationComponent[]) {
      totals[component] += explanation[component];
    }
  }

  const explanationGate = ratio(
    passingExplanations,
    dataset.explanations.length,
    BLIND_TEST_PASS_RATE,
  );
  const categories = Object.fromEntries(
    (Object.keys(EXPLANATION_COMPONENT_MAX) as ExplanationComponent[]).map((component) => [
      component,
      ratio(
        totals[component],
        dataset.explanations.length * EXPLANATION_COMPONENT_MAX[component],
        BLIND_TEST_CATEGORY_RATE,
      ),
    ]),
  ) as Record<ExplanationComponent, GateResult>;

  const identitySuccesses = dataset.participants.filter(
    (participant) => participant.behavioralDescription && participant.identityMatched,
  ).length;
  const fighterIdentity = ratio(identitySuccesses, dataset.participants.length, BLIND_TEST_PASS_RATE);

  const opponentSuccesses = dataset.participants.filter((participant) =>
    LAUNCH_PVE_BOSS_ORDER.every((bossId) => participant.opponentRecognition[bossId] === true),
  ).length;
  const opponentIdentity = ratio(opponentSuccesses, dataset.participants.length, BLIND_TEST_PASS_RATE);

  if (participantIds.size < BLIND_TEST_MIN_TESTERS) {
    reasons.push(`Need ${BLIND_TEST_MIN_TESTERS - participantIds.size} more blind tester(s).`);
  }
  if (dataset.explanations.length < BLIND_TEST_MIN_EXPLANATIONS) {
    reasons.push(`Need ${BLIND_TEST_MIN_EXPLANATIONS - dataset.explanations.length} more scored explanation(s).`);
  }
  if (!explanationGate.passed) reasons.push('Fewer than 80% of explanations scored at least 5/7.');
  for (const [component, result] of Object.entries(categories)) {
    if (!result.passed) reasons.push(`${component} is below 70% of available points.`);
  }
  if (!fighterIdentity.passed) reasons.push('Fighter identity recognition is below 80%.');
  if (!opponentIdentity.passed) reasons.push('Five-opponent behavioral recognition is below 80%.');

  const comprehensionPassed =
    participantIds.size >= BLIND_TEST_MIN_TESTERS &&
    dataset.explanations.length >= BLIND_TEST_MIN_EXPLANATIONS &&
    explanationGate.passed &&
    Object.values(categories).every((result) => result.passed);

  return {
    ready: comprehensionPassed && fighterIdentity.passed && opponentIdentity.passed,
    comprehension: {
      passed: comprehensionPassed,
      testerCount: participantIds.size,
      explanationCount: dataset.explanations.length,
      explanationsAtOrAboveFive: explanationGate,
      categories,
    },
    fighterIdentity,
    opponentIdentity,
    reasons,
  };
}
