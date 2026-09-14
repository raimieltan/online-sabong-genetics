import type { ReadTellType } from "./types";

export const COMBAT_INTERPRETATION_VERSION = 1 as const;

export type InterpretationCommand = "PRESS" | "WAIT" | "COUNTER" | "RECOVER";
export type ReadQuality = "GOOD" | "NEUTRAL" | "BAD";
export type ComplianceGrade = "FULL" | "PARTIAL" | "RESISTED";
export type ExecutionOutcome = "MISSED" | "BLOCKED" | "GLANCING_HIT" | "CLEAN_HIT" | "COUNTERED" | "CANCELLED" | "DISENGAGED";
export type PrimaryExchangeOutcome = ExecutionOutcome | "NO_COMMITMENT";
export type ExchangeResult = "ADVANTAGE" | "EVEN" | "DISADVANTAGE" | "NO_DECISIVE_RESULT";

export type InterpretationMetrics = {
  player: { health: number; stamina: number; balance: number };
  opponent: { health: number; stamina: number; balance: number };
};

export type ObservableTell = {
  id: string;
  type: ReadTellType;
  family: string;
  strength: number;
  confidence: number;
  commitsAtTick: number;
  isFeint: boolean;
};

export type ExchangeLockSnapshot = {
  tick: number;
  command: InterpretationCommand;
  commandLockEventId: string;
  distance: number;
  tells: ObservableTell[];
  metrics: InterpretationMetrics;
};

export type InterpretationEvidenceEvent = {
  id: string;
  cursor: number;
  logicalTick: number;
  exchangeIndex: number;
  type: string;
  payload: Record<string, unknown>;
};

type RecordedEvidence = {
  event: InterpretationEvidenceEvent;
  metrics: InterpretationMetrics;
};

export type ExchangeAccumulatorState = {
  exchangeIndex: number;
  events: RecordedEvidence[];
  lock: ExchangeLockSnapshot | null;
};

export type ExchangeExecution = {
  sequence: number;
  action: string;
  outcome: ExecutionOutcome;
  refs: { actionEventIds: string[] };
  damageDealt: number;
  damageTaken: number;
  staminaDelta: number;
  balanceDelta: number;
};

export type ExchangeResolvedPayload = {
  interpretationVersion: typeof COMBAT_INTERPRETATION_VERSION;
  exchangeIndex: number;
  read: {
    decisiveTellId: string | null;
    tellPhaseAtCommandLock: "START" | "INTENSIFIED" | "LOCKED" | null;
    quality: ReadQuality;
  };
  coaching: {
    command: InterpretationCommand;
    compliance: ComplianceGrade;
    reasons: string[];
  };
  primaryOutcome: PrimaryExchangeOutcome;
  exchangeResult: ExchangeResult;
  executions: ExchangeExecution[];
  consequences: {
    damageDealt: number;
    damageTaken: number;
    staminaDelta: number;
    balanceDelta: number;
  };
  refs: {
    instructionEventId: string;
    commandLockEventId: string;
    complianceEventIds: string[];
    tellEventIds: string[];
    actionEventIds: string[];
  };
};

const CLEAN_HIT_DAMAGE = 9;
const MATERIAL_EXCHANGE_SCORE = 1;

const COMMANDS: readonly InterpretationCommand[] = ["PRESS", "WAIT", "COUNTER", "RECOVER"];

// The accumulator is part of the checkpoint written on every authoritative
// sync. Keep only evidence used by the final interpretation; the complete
// canonical event stream remains persisted separately for replay/debugging.
const ACCUMULATED_EVENT_TYPES = new Set([
  "COMMAND_ACCEPTED", "COMMAND_CARRIED", "COMMAND_LOCKED", "COMMAND_RESOLVED",
  "TELL_STARTED", "TELL_INTENSIFIED", "TELL_REVEALED",
  "ACTION_STARTED", "ACTION_CHAINED", "ACTION_ENDED", "HIT", "COUNTER_TRIGGERED",
  "BLOCK", "EVADE", "HEALTH_CHANGED", "STAMINA_CHANGED", "BALANCE_CHANGED",
  "STAGGER", "KNOCKDOWN", "ENGAGEMENT_CHANGED",
]);

const EVIDENCE_PAYLOAD_KEYS = new Set([
  "fighterId", "targetId", "actionId", "value", "detail", "engineType", "grade", "reasons", "command",
]);

function evidencePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => EVIDENCE_PAYLOAD_KEYS.has(key)));
}

/** Tendencies from tell-revamped.md §40. They grade the observable decision;
 * they do not modify combat and never guarantee an outcome. */
const TELL_READ_SCORES: Record<ReadTellType, Record<InterpretationCommand, number>> = {
  weight_forward: { PRESS: 0, WAIT: 1, COUNTER: 2, RECOVER: -1 },
  closing_distance: { PRESS: 1, WAIT: -1, COUNTER: 2, RECOVER: -1 },
  wing_adjust: { PRESS: 2, WAIT: 1, COUNTER: 1, RECOVER: -1 },
  head_low: { PRESS: 2, WAIT: 1, COUNTER: 1, RECOVER: 0 },
  guard_open: { PRESS: 2, WAIT: 1, COUNTER: 0, RECOVER: -1 },
  rear_leg_loaded: { PRESS: 1, WAIT: -1, COUNTER: 2, RECOVER: -1 },
  hesitating: { PRESS: 2, WAIT: 0, COUNTER: 0, RECOVER: 1 },
  recovering: { PRESS: 2, WAIT: -1, COUNTER: -1, RECOVER: 0 },
  angle_shift: { PRESS: 1, WAIT: 1, COUNTER: 2, RECOVER: -1 },
  side_on_stance: { PRESS: 2, WAIT: 1, COUNTER: 2, RECOVER: 0 },
  overextended: { PRESS: 2, WAIT: -1, COUNTER: 1, RECOVER: -1 },
  resetting: { PRESS: 2, WAIT: 0, COUNTER: 1, RECOVER: 1 },
};

const copyMetrics = (metrics: InterpretationMetrics): InterpretationMetrics => ({
  player: { ...metrics.player },
  opponent: { ...metrics.opponent },
});

const metricDelta = (start: InterpretationMetrics, end: InterpretationMetrics) => ({
  damageDealt: Math.max(0, start.opponent.health - end.opponent.health),
  damageTaken: Math.max(0, start.player.health - end.player.health),
  staminaDelta: end.player.stamina - start.player.stamina,
  balanceDelta: end.player.balance - start.player.balance,
});

export function createExchangeAccumulator(exchangeIndex: number): ExchangeAccumulatorState {
  return { exchangeIndex, events: [], lock: null };
}

export function recordExchangeEvidence(
  accumulator: ExchangeAccumulatorState,
  event: InterpretationEvidenceEvent,
  metrics: InterpretationMetrics,
): void {
  if (event.exchangeIndex !== accumulator.exchangeIndex || !ACCUMULATED_EVENT_TYPES.has(event.type)) return;
  const record = { event: { ...event, payload: evidencePayload(event.payload) }, metrics: copyMetrics(metrics) };

  // Tell strength updates can arrive every simulation tick. Only the latest
  // update for a live tell is needed at command lock; retaining every sample
  // made the database checkpoint grow by hundreds of kilobytes per exchange.
  if (event.type === "TELL_INTENSIFIED") {
    const priorIndex = accumulator.events.findLastIndex(({ event: prior }) =>
      prior.type === event.type
      && prior.payload.fighterId === event.payload.fighterId
      && prior.payload.detail === event.payload.detail);
    if (priorIndex >= 0) {
      accumulator.events[priorIndex] = record;
      return;
    }
  }
  accumulator.events.push(record);
}

export function captureExchangeLock(
  accumulator: ExchangeAccumulatorState,
  snapshot: Omit<ExchangeLockSnapshot, "commandLockEventId">,
  commandLockEventId: string,
): void {
  accumulator.lock = {
    ...snapshot,
    commandLockEventId,
    tells: snapshot.tells.map(tell => ({ ...tell })),
    metrics: copyMetrics(snapshot.metrics),
  };
}

function decisiveTell(lock: ExchangeLockSnapshot): ObservableTell | null {
  return [...lock.tells].sort((a, b) => b.strength * b.confidence - a.strength * a.confidence)[0] ?? null;
}

export function evaluateReadQuality(lock: ExchangeLockSnapshot): ReadQuality {
  const tell = decisiveTell(lock);
  const scores = Object.fromEntries(COMMANDS.map(command => [command, 0])) as Record<InterpretationCommand, number>;
  let evidence = 0;

  if (tell) {
    if (tell.isFeint) return "NEUTRAL";
    const weight = Math.max(.25, tell.strength * tell.confidence);
    for (const command of COMMANDS) scores[command] += TELL_READ_SCORES[tell.type][command] * weight;
    evidence += weight;
  }
  if (lock.metrics.player.stamina < 25) {
    scores.RECOVER += 1.5;
    scores.PRESS -= .75;
    evidence += .75;
  }
  if (lock.metrics.player.balance < 30) {
    scores.WAIT += .75;
    scores.RECOVER += .75;
    scores.PRESS -= .75;
    evidence += .5;
  }
  if (lock.metrics.opponent.stamina < 25) {
    scores.PRESS += 1;
    scores.WAIT -= .5;
    evidence += .5;
  }

  if (evidence < .25) return "NEUTRAL";
  const selected = scores[lock.command];
  const values = Object.values(scores);
  const best = Math.max(...values);
  const worst = Math.min(...values);
  if (best - worst < .5) return "NEUTRAL";
  if (selected >= best - .25) return "GOOD";
  if (selected <= best - 1.25) return "BAD";
  return "NEUTRAL";
}

function eventInvolvesPlayer(event: InterpretationEvidenceEvent, playerId: string): boolean {
  return event.payload.fighterId === playerId || event.payload.targetId === playerId;
}

const ACTION_EVIDENCE_TYPES = new Set([
  "ACTION_STARTED", "ACTION_CHAINED", "ACTION_ENDED", "HIT", "COUNTER_TRIGGERED", "BLOCK", "EVADE",
  "HEALTH_CHANGED", "STAMINA_CHANGED", "BALANCE_CHANGED", "STAGGER", "KNOCKDOWN", "ENGAGEMENT_CHANGED",
]);

function executionOutcome(events: readonly InterpretationEvidenceEvent[], playerId: string, action: string, fallback: ExecutionOutcome): ExecutionOutcome {
  const incomingCounter = events.some(event => event.type === "COUNTER_TRIGGERED" && event.payload.targetId === playerId);
  if (incomingCounter) return "COUNTERED";
  const outgoing = events.filter(event => (event.type === "HIT" || event.type === "COUNTER_TRIGGERED") && event.payload.fighterId === playerId);
  if (outgoing.some(event => Number(event.payload.value ?? 0) >= CLEAN_HIT_DAMAGE)) return "CLEAN_HIT";
  if (outgoing.length) return "GLANCING_HIT";
  if (events.some(event => event.type === "BLOCK" && event.payload.fighterId === playerId)) return "BLOCKED";
  if (events.some(event => event.type === "ACTION_ENDED" && event.payload.fighterId === playerId && event.payload.engineType === "ATTACK_MISSED")) return "MISSED";
  if (events.some(event => event.type === "EVADE" && event.payload.fighterId === playerId) || action === "sidestep") return "DISENGAGED";
  return fallback;
}

function buildExecutions(
  records: readonly RecordedEvidence[],
  playerId: string,
  finalMetrics: InterpretationMetrics,
): ExchangeExecution[] {
  type Draft = { action: string; start: InterpretationMetrics; records: RecordedEvidence[] };
  const output: ExchangeExecution[] = [];
  let current: Draft | null = null;
  let priorMetrics = records[0]?.metrics ?? finalMetrics;

  const close = (fallback: ExecutionOutcome, endMetrics: InterpretationMetrics) => {
    if (!current) return;
    const events = current.records.map(record => record.event);
    output.push({
      sequence: output.length + 1,
      action: current.action,
      outcome: executionOutcome(events, playerId, current.action, fallback),
      refs: { actionEventIds: events.map(event => event.id) },
      ...metricDelta(current.start, endMetrics),
    });
    current = null;
  };

  for (const record of records) {
    const { event } = record;
    if (event.type === "ACTION_STARTED" && event.payload.fighterId === playerId) {
      close("CANCELLED", priorMetrics);
      current = { action: String(event.payload.actionId ?? "unknown"), start: copyMetrics(priorMetrics), records: [record] };
    } else if (current && ACTION_EVIDENCE_TYPES.has(event.type) && eventInvolvesPlayer(event, playerId)) {
      current.records.push(record);
    }
    if (current && event.type === "ACTION_ENDED" && event.payload.fighterId === playerId && String(event.payload.actionId ?? "") === current.action) {
      close(event.payload.engineType === "ATTACK_MISSED" ? "MISSED" : "CANCELLED", record.metrics);
    }
    priorMetrics = record.metrics;
  }
  close("CANCELLED", finalMetrics);
  return output;
}

const OUTCOME_PRECEDENCE: readonly PrimaryExchangeOutcome[] = [
  "COUNTERED", "CLEAN_HIT", "GLANCING_HIT", "BLOCKED", "CANCELLED", "DISENGAGED", "MISSED", "NO_COMMITMENT",
];

function primaryOutcome(executions: readonly ExchangeExecution[], records: readonly RecordedEvidence[], playerId: string): PrimaryExchangeOutcome {
  const outcomes = new Set<PrimaryExchangeOutcome>(executions.map(execution => execution.outcome));
  if (records.some(({ event }) => event.type === "COUNTER_TRIGGERED" && event.payload.targetId === playerId)) outcomes.add("COUNTERED");
  if (!executions.length && records.some(({ event }) => event.type === "ENGAGEMENT_CHANGED" && event.payload.fighterId === playerId && ["breaking", "resetting"].includes(String(event.payload.detail)))) outcomes.add("DISENGAGED");
  return OUTCOME_PRECEDENCE.find(outcome => outcomes.has(outcome)) ?? "NO_COMMITMENT";
}

function exchangeResult(lock: InterpretationMetrics, end: InterpretationMetrics, executions: readonly ExchangeExecution[]): ExchangeResult {
  const consequences = metricDelta(lock, end);
  const opponentStaminaDelta = end.opponent.stamina - lock.opponent.stamina;
  const opponentBalanceDelta = end.opponent.balance - lock.opponent.balance;
  const score = consequences.damageDealt - consequences.damageTaken
    + .08 * (consequences.staminaDelta - opponentStaminaDelta)
    + .05 * (consequences.balanceDelta - opponentBalanceDelta);
  if (score >= MATERIAL_EXCHANGE_SCORE) return "ADVANTAGE";
  if (score <= -MATERIAL_EXCHANGE_SCORE) return "DISADVANTAGE";
  return executions.length ? "EVEN" : "NO_DECISIVE_RESULT";
}

export function resolveExchangeInterpretation(input: {
  accumulator: ExchangeAccumulatorState;
  playerId: string;
  opponentId: string;
  finalMetrics: InterpretationMetrics;
}): ExchangeResolvedPayload | null {
  const { accumulator, playerId, finalMetrics } = input;
  const lock = accumulator.lock;
  if (!lock) return null;
  const records = accumulator.events.filter(record => record.event.cursor >= Number(accumulator.events.find(item => item.event.id === lock.commandLockEventId)?.event.cursor ?? 0));
  const allEvents = accumulator.events.map(record => record.event);
  const instruction = [...allEvents].reverse().find(event => (event.type === "COMMAND_ACCEPTED" || event.type === "COMMAND_CARRIED") && event.cursor <= (allEvents.find(candidate => candidate.id === lock.commandLockEventId)?.cursor ?? Infinity));
  if (!instruction) return null;
  const complianceEvents = allEvents.filter(event => event.type === "COMMAND_RESOLVED" && event.payload.fighterId === playerId);
  const compliance = complianceEvents.at(-1);
  const grade = String(compliance?.payload.grade ?? "PARTIAL") as ComplianceGrade;
  const reasons = Array.isArray(compliance?.payload.reasons) ? compliance.payload.reasons.map(String) : [];
  const executions = buildExecutions(records, playerId, finalMetrics);
  const consequences = metricDelta(lock.metrics, finalMetrics);

  // Attribute any between-action recovery/contact residue to the final
  // execution so execution totals reconcile with the authoritative exchange.
  const last = executions.at(-1);
  if (last) {
    last.damageDealt += consequences.damageDealt - executions.reduce((sum, execution) => sum + execution.damageDealt, 0);
    last.damageTaken += consequences.damageTaken - executions.reduce((sum, execution) => sum + execution.damageTaken, 0);
    last.staminaDelta += consequences.staminaDelta - executions.reduce((sum, execution) => sum + execution.staminaDelta, 0);
    last.balanceDelta += consequences.balanceDelta - executions.reduce((sum, execution) => sum + execution.balanceDelta, 0);
  }

  const tell = decisiveTell(lock);
  const tellPhaseAtCommandLock = tell
    ? lock.tick >= tell.commitsAtTick ? "LOCKED" as const : tell.strength >= .55 ? "INTENSIFIED" as const : "START" as const
    : null;
  const actionEventIds = records.filter(record => ACTION_EVIDENCE_TYPES.has(record.event.type)).map(record => record.event.id);

  return {
    interpretationVersion: COMBAT_INTERPRETATION_VERSION,
    exchangeIndex: accumulator.exchangeIndex,
    read: { decisiveTellId: tell?.id ?? null, tellPhaseAtCommandLock, quality: evaluateReadQuality(lock) },
    coaching: { command: lock.command, compliance: grade === "FULL" || grade === "RESISTED" ? grade : "PARTIAL", reasons },
    primaryOutcome: primaryOutcome(executions, records, playerId),
    exchangeResult: exchangeResult(lock.metrics, finalMetrics, executions),
    executions,
    consequences,
    refs: {
      instructionEventId: instruction.id,
      commandLockEventId: lock.commandLockEventId,
      complianceEventIds: complianceEvents.map(event => event.id),
      tellEventIds: allEvents.filter(event => ["TELL_STARTED", "TELL_INTENSIFIED", "TELL_REVEALED"].includes(event.type) && event.payload.fighterId === input.opponentId).map(event => event.id),
      actionEventIds,
    },
  };
}

export function isExchangeResolvedPayload(value: unknown): value is ExchangeResolvedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ExchangeResolvedPayload>;
  return payload.interpretationVersion === COMBAT_INTERPRETATION_VERSION
    && Number.isSafeInteger(payload.exchangeIndex)
    && typeof payload.primaryOutcome === "string"
    && typeof payload.exchangeResult === "string"
    && Array.isArray(payload.executions)
    && !!payload.read
    && !!payload.coaching
    && !!payload.refs;
}
