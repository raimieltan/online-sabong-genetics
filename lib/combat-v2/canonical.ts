import { createHash } from "node:crypto";

import { COMBAT_VERSION } from "./constants";
import { createMatch, queueCommand, stepCombat, triggerAwakening as triggerEngineAwakening } from "./engine";
import type { AwakeningType, CombatEvent as EngineEvent, CombatMatchState, EngagementPhase } from "./types";
import {
  captureExchangeLock,
  createExchangeAccumulator,
  recordExchangeEvidence,
  resolveExchangeInterpretation,
  type ExchangeAccumulatorState,
  type InterpretationMetrics,
} from "./interpretation";
import { toCombatV2Snapshot } from "../combatV2Snapshot";
import { emptyExperience, gainExperience } from "../combat/experience";
import type { Chicken, CombatCareerFightDelta, CombatExperience, InjuryLocation, InjurySeverity, SignatureTechnique } from "../types";

export { COMBAT_VERSION };
export const RULESET_VERSION = "continuous-v2-canonical-2";
export const SNAPSHOT_SCHEMA_VERSION = "combatant-1";
export const CANONICAL_COMMANDS = ["PRESS", "WAIT", "COUNTER", "RECOVER"] as const;

export type CoachingCommand = (typeof CANONICAL_COMMANDS)[number];
export type CoachingMode = "MANUAL" | "AUTO";
export type DisconnectPolicy = "KEEP_INSTRUCTION" | "AUTO_COACH";
export type CombatMode = "NORMAL" | "PVE" | "BOSS" | "SIDE_ENCOUNTER" | "TOURNAMENT" | "PVP";
export type CombatPhase = "READ" | "COMMIT" | "APPROACH" | "CLASH" | "DISENGAGE" | "TERMINAL";
export type BattleSessionStatus = "CREATED" | "ACTIVE" | "TERMINAL_UNSETTLED" | "SETTLED" | "EXPIRED" | "VOIDED";

export type CanonicalCombatEvent = {
  id: string;
  sessionId: string;
  cursor: number;
  logicalTick: number;
  exchangeIndex: number;
  type: string;
  payload: Record<string, unknown>;
  semantic: true;
};

export type PublicFighterState = {
  fighterId: string;
  name: string;
  health: number;
  maxHealth: number;
  startingHealth: number;
  stamina: number;
  balance: number;
  combatMomentum: number;
  mentalState: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  facing: number;
  actionId: string | null;
  engagement: EngagementPhase;
  readTells: readonly { id: string; type: string; family: string; displayName: string; strength: number; confidence: number; startedTick: number; commitsAtTick: number; isFeint: boolean }[];
  unlockedAwakenings: readonly AwakeningType[];
  awakening: { type: AwakeningType; startedTick: number } | null;
  /** One-shot presentation marker for Flow State's most recent phase dodge. */
  lastMirageEvadeTick: number | null;
  awakeningAttempted: boolean;
};

export type CanonicalInjuryEvent = {
  id: string;
  fighterId: string;
  eventCursor: number;
  occurredAtTick: number;
  injuryType: string;
  severity: InjurySeverity;
  location: InjuryLocation;
  detail: string;
};

export type AuthoritativeCombatResult = {
  sessionId: string;
  engineVersion: string;
  rulesetVersion: string;
  seed: string;
  winnerId: string | null;
  loserId: string | null;
  isDraw: boolean;
  finishReason: "KNOCKOUT" | "DOUBLE_KO" | "MEDICAL_STOPPAGE" | "DOUBLE_MEDICAL_STOPPAGE" | "TIME_LIMIT_DECISION" | "TIME_LIMIT_DRAW" | "FORFEIT";
  terminalTick: number;
  finalState: { fighters: PublicFighterState[] };
  experienceGained: Record<string, CombatExperience>;
  careerGained: Record<string, CombatCareerFightDelta>;
  injuryEvents: readonly CanonicalInjuryEvent[];
  commandSummary: { accepted: number; locked: number; resolved: number; lastCommand: CoachingCommand };
  eventDigest: string;
};

export type CanonicalCheckpoint = {
  sessionId: string;
  seed: number;
  state: CombatMatchState;
  phase: CombatPhase;
  exchangeIndex: number;
  nextCursor: number;
  activeCommand: CoachingCommand;
  commandSequence: number;
  commandSummary: { accepted: number; locked: number; resolved: number };
  interpretation: ExchangeAccumulatorState;
  lastAutoExchange?: number;
};

const commandMode = (command: CoachingCommand) => command === "PRESS" ? "pressure" as const
  : command === "WAIT" ? "defensive" as const
    : command === "COUNTER" ? "counter" as const : "recover" as const;

export function isCoachingCommand(value: unknown): value is CoachingCommand {
  return typeof value === "string" && (CANONICAL_COMMANDS as readonly string[]).includes(value);
}

export function phaseFromEngagement(phase: EngagementPhase): CombatPhase {
  // The engine accepts coaching only while actively stalking. Resetting is a
  // disengage transition, not a command window; exposing it as READ made a
  // UI-enabled command fail with COMMAND_LOCKED.
  if (phase === "stalking") return "READ";
  if (phase === "committing") return "APPROACH";
  if (phase === "clashing") return "CLASH";
  return "DISENGAGE";
}

function interpretationMetrics(state: CombatMatchState): InterpretationMetrics {
  const [player, opponent] = state.fighters;
  return {
    player: { health: player.health, stamina: player.stamina, balance: player.balance },
    opponent: { health: opponent.health, stamina: opponent.stamina, balance: opponent.balance },
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function digestSemantic(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function publicFighters(state: CombatMatchState): PublicFighterState[] {
  return state.fighters.map(fighter => ({
    fighterId: fighter.snapshot.fighterId,
    name: fighter.snapshot.name,
    health: fighter.health,
    maxHealth: fighter.snapshot.maxHealth,
    startingHealth: fighter.snapshot.startingHealth ?? fighter.snapshot.maxHealth,
    stamina: fighter.stamina,
    balance: fighter.balance,
    combatMomentum: fighter.combatMomentum,
    mentalState: fighter.mentalState,
    position: { ...fighter.position },
    velocity: { ...fighter.velocity },
    facing: fighter.facing,
    actionId: fighter.currentAction?.id ?? null,
    engagement: fighter.engagement.phase,
    readTells: fighter.readTells.map(tell => ({ id: tell.id ?? `${fighter.snapshot.fighterId}:${tell.type}:${tell.startedTick}`, type: tell.type, family: tell.family ?? "BALANCE_LOAD", displayName: tell.displayName ?? tell.type.replaceAll("_", " "), strength: tell.strength, confidence: tell.confidence, startedTick: tell.startedTick, commitsAtTick: tell.commitsAtTick ?? tell.startedTick, isFeint: tell.isFeint ?? false })),
    unlockedAwakenings: [...fighter.snapshot.evolution.awakenings],
    awakening: fighter.awakening ? { ...fighter.awakening } : null,
    lastMirageEvadeTick: fighter.lastMirageEvadeTick ?? null,
    awakeningAttempted: fighter.awakeningAttempted,
  }));
}

/** Convert the canonical semantic stream into the same category XP awarded by
 * the local continuous session. Keeping this deterministic data on the signed
 * terminal result lets every authoritative mode settle identical progression. */
export function experienceFromCanonicalEvents(
  fighterIds: readonly string[],
  events: readonly CanonicalCombatEvent[],
): Record<string, CombatExperience> {
  const gained = new Map(fighterIds.map(id => [id, emptyExperience()]));
  const add = (fighterId: string, category: keyof CombatExperience, amount: number) => {
    if (!gained.has(fighterId)) return;
    gained.set(fighterId, gainExperience(gained.get(fighterId)!, category, amount));
  };
  for (const event of events) {
    const fighterId = String(event.payload.fighterId ?? "");
    const targetId = String(event.payload.targetId ?? "");
    const engineType = String(event.payload.engineType ?? event.type);
    if (engineType === "COUNTER_LANDED") add(fighterId, "counter", 3);
    else if (engineType === "ATTACK_LANDED") add(fighterId, "offensive", 2);
    else if (engineType === "BLOCK") {
      add(fighterId, "defensive", 2);
      add(targetId, "pressure", 1);
    } else if (engineType === "EVADE") {
      add(fighterId, "evasion", 2);
    }
  }
  for (const fighterId of fighterIds) add(fighterId, "adaptation", 1);
  return Object.fromEntries(gained);
}

function careerFromCanonicalEvents(state: CombatMatchState, events: readonly CanonicalCombatEvent[], winnerId: string | null): Record<string, CombatCareerFightDelta> {
  const strength = (fighter: CombatMatchState["fighters"][number]) => Object.values(fighter.snapshot.stats).reduce((sum, value) => sum + value, 0) / 6;
  return Object.fromEntries(state.fighters.map((fighter, index) => {
    const opponent = state.fighters[1 - index];
    const ownEvents = events.filter(event => event.payload.fighterId === fighter.snapshot.fighterId);
    const signatureAttempts: Partial<Record<SignatureTechnique["id"], number>> = {};
    const signatureSuccesses: Partial<Record<SignatureTechnique["id"], number>> = {};
    for (const event of ownEvents.filter(event => event.type === "SIGNATURE_TECHNIQUE")) {
      const id = String(event.payload.actionId ?? event.payload.detail) as SignatureTechnique["id"];
      signatureAttempts[id] = (signatureAttempts[id] ?? 0) + 1;
      if (ownEvents.some(candidate => (candidate.type === "HIT" || candidate.type === "COUNTER_TRIGGERED") && candidate.logicalTick >= event.logicalTick && candidate.logicalTick - event.logicalTick <= 60)) signatureSuccesses[id] = (signatureSuccesses[id] ?? 0) + 1;
    }
    const telemetry = {
      fightsWon: winnerId === fighter.snapshot.fighterId ? 1 : 0,
      fightsLost: winnerId !== null && winnerId !== fighter.snapshot.fighterId ? 1 : 0,
      successfulCounters: ownEvents.filter(event => event.type === "COUNTER_TRIGGERED").length,
      knockdownsTaken: ownEvents.filter(event => event.type === "KNOCKDOWN").length,
      playerCommandsIssued: index === 0 ? events.filter(event => event.type === "COMMAND_ACCEPTED").length : 0,
      playerCommandCompliance: index === 0 ? ownEvents.filter(event => event.type === "COMMAND_RESOLVED" && event.payload.grade === "FULL").length : 0,
      playerCommandSuccess: index === 0 ? ownEvents.filter(event => event.type === "COMMAND_RESOLVED" && event.payload.grade !== "RESISTED").length : 0,
    };
    const awakening = ownEvents.find(event => event.type === "AWAKENING_STARTED")?.payload.detail;
    return [fighter.snapshot.fighterId, { telemetry, opponentId: opponent.snapshot.fighterId, opponentName: opponent.snapshot.name, opponentStrength: strength(opponent), ownStrength: strength(fighter), won: winnerId === fighter.snapshot.fighterId, finalHealthRatio: fighter.health / fighter.snapshot.maxHealth, opponentFinalHealthRatio: opponent.health / opponent.snapshot.maxHealth, signatureAttempts, signatureSuccesses, awakeningTriggered: awakening as CombatCareerFightDelta["awakeningTriggered"] }];
  }));
}

function canonicalEventType(event: EngineEvent): string {
  const map: Partial<Record<EngineEvent["type"], string>> = {
    READ_TELL_STARTED: "TELL_STARTED", READ_TELL_UPDATED: "TELL_INTENSIFIED", READ_TELL_ENDED: "TELL_REVEALED",
    ATTACK_STARTED: "ACTION_STARTED", ATTACK_ACTIVE: "ACTION_CHAINED", ATTACK_MISSED: "ACTION_ENDED", ATTACK_ENDED: "ACTION_ENDED",
    ATTACK_LANDED: "HIT", COUNTER_LANDED: "COUNTER_TRIGGERED", DAMAGE: "HEALTH_CHANGED",
    STAMINA_CHANGED: "STAMINA_CHANGED", BALANCE_CHANGED: "BALANCE_CHANGED", MOMENTUM_CHANGED: "COMBAT_MOMENTUM_CHANGED",
    KNOCKDOWN: "KNOCKDOWN", STATE_CHANGED: "STANCE_CHANGED", INTENT_CHANGED: "STANCE_CHANGED", COMMAND_RESPONSE: "COMMAND_RESOLVED",
    MATCH_FINISHED: "SESSION_TERMINAL", CLASH_STARTED: "PHASE_CHANGED", CLASH_ENDED: "PHASE_CHANGED",
  };
  return map[event.type] ?? event.type;
}

export class CanonicalCombatRuntime {
  readonly checkpoint: CanonicalCheckpoint;
  private emitted: CanonicalCombatEvent[] = [];

  private constructor(checkpoint: CanonicalCheckpoint) { this.checkpoint = checkpoint; }

  static create(input: { sessionId: string; seed: number; fighterA: Chicken; fighterB: Chicken; openingCommand: CoachingCommand }): CanonicalCombatRuntime {
    const state = createMatch({
      id: input.sessionId, version: COMBAT_VERSION, seed: input.seed,
      fighterA: toCombatV2Snapshot(input.fighterA, "player-a", input.fighterB.id),
      fighterB: toCombatV2Snapshot(input.fighterB, "server-ai", input.fighterA.id),
      arena: { radius: 8 }, maxTicks: 60 * 120,
    });
    const runtime = new CanonicalCombatRuntime({ sessionId: input.sessionId, seed: input.seed, state, phase: "READ", exchangeIndex: 0, nextCursor: 1, activeCommand: input.openingCommand, commandSequence: -1, commandSummary: { accepted: 0, locked: 0, resolved: 0 }, interpretation: createExchangeAccumulator(0) });
    runtime.emit("SESSION_STARTED", { engineVersion: COMBAT_VERSION, rulesetVersion: RULESET_VERSION });
    runtime.emit("PHASE_CHANGED", { phase: "READ" });
    runtime.acceptCommand(input.openingCommand);
    return runtime;
  }

  static restore(checkpoint: CanonicalCheckpoint): CanonicalCombatRuntime {
    for (const fighter of checkpoint.state.fighters) fighter.judging ??= { damageDealt: 0, initiativeTicks: 0, controlTicks: 0, knockdowns: 0, inactivityPenalties: 0 };
    checkpoint.interpretation ??= createExchangeAccumulator(checkpoint.exchangeIndex);
    return new CanonicalCombatRuntime(structuredClone(checkpoint));
  }

  private emit(type: string, payload: Record<string, unknown>, tick = this.checkpoint.state.tick): CanonicalCombatEvent {
    const cursor = this.checkpoint.nextCursor++;
    const event: CanonicalCombatEvent = { id: digestSemantic([this.checkpoint.sessionId, cursor]), sessionId: this.checkpoint.sessionId, cursor, logicalTick: tick, exchangeIndex: this.checkpoint.exchangeIndex, type, payload, semantic: true };
    this.emitted.push(event);
    recordExchangeEvidence(this.checkpoint.interpretation, event, interpretationMetrics(this.checkpoint.state));
    return event;
  }

  private lockSnapshot() {
    const [player, opponent] = this.checkpoint.state.fighters;
    return {
      tick: this.checkpoint.state.tick,
      command: this.checkpoint.activeCommand,
      distance: Math.hypot(player.position.x - opponent.position.x, player.position.z - opponent.position.z),
      tells: opponent.readTells.map(tell => ({
        id: tell.id ?? `${opponent.snapshot.fighterId}:${tell.type}:${tell.startedTick}`,
        type: tell.type,
        family: tell.family ?? "BALANCE_LOAD",
        strength: tell.strength,
        confidence: tell.confidence,
        commitsAtTick: tell.commitsAtTick ?? tell.startedTick,
        isFeint: tell.isFeint ?? false,
      })),
      metrics: interpretationMetrics(this.checkpoint.state),
    };
  }

  private resolveCurrentExchange(): void {
    const [player, opponent] = this.checkpoint.state.fighters;
    const payload = resolveExchangeInterpretation({
      accumulator: this.checkpoint.interpretation,
      playerId: player.snapshot.fighterId,
      opponentId: opponent.snapshot.fighterId,
      finalMetrics: interpretationMetrics(this.checkpoint.state),
    });
    if (payload) this.emit("EXCHANGE_RESOLVED", payload as unknown as Record<string, unknown>);
  }

  drainEvents(): CanonicalCombatEvent[] { const events = this.emitted; this.emitted = []; return events; }

  acceptCommand(command: CoachingCommand): void {
    if (this.checkpoint.phase !== "READ" || this.checkpoint.state.phase !== "active") throw new Error(this.checkpoint.state.phase === "finished" ? "SESSION_TERMINAL" : "COMMAND_LOCKED");
    const sequence = ++this.checkpoint.commandSequence;
    queueCommand(this.checkpoint.state, { playerId: "player-a", fighterId: this.checkpoint.state.fighters[0].snapshot.fighterId, command: commandMode(command), issuedTick: this.checkpoint.state.tick, effectiveTick: this.checkpoint.state.tick + 1, sequence });
    this.checkpoint.activeCommand = command;
    this.checkpoint.commandSummary.accepted++;
    this.emit("COMMAND_ACCEPTED", { command, eligibleExchangeIndex: this.checkpoint.exchangeIndex });
  }

  private carryCommandIntoRead(): void {
    const sequence = ++this.checkpoint.commandSequence;
    queueCommand(this.checkpoint.state, { playerId: "player-a", fighterId: this.checkpoint.state.fighters[0].snapshot.fighterId, command: commandMode(this.checkpoint.activeCommand), issuedTick: this.checkpoint.state.tick, effectiveTick: this.checkpoint.state.tick + 1, sequence });
    this.emit("COMMAND_CARRIED", { command: this.checkpoint.activeCommand, eligibleExchangeIndex: this.checkpoint.exchangeIndex });
  }

  triggerPlayerAwakening(type: AwakeningType): void {
    const fighter = this.checkpoint.state.fighters[0];
    const priorEventCount = this.checkpoint.state.eventBuffer.length;
    triggerEngineAwakening(this.checkpoint.state, fighter.snapshot.fighterId, type);
    for (const event of this.checkpoint.state.eventBuffer.slice(priorEventCount)) {
      this.emit(canonicalEventType(event), {
        engineType: event.type,
        fighterId: event.fighterId,
        targetId: event.targetId,
        actionId: event.actionId,
        value: event.value,
        detail: event.detail,
      });
    }
  }

  selectAutoCommand(): CoachingCommand {
    const [fighter, opponent] = this.checkpoint.state.fighters;
    const command: CoachingCommand = fighter.stamina < 28 || fighter.balance < 25 ? "RECOVER"
      : opponent.stamina < 24 || opponent.state === "recovering" ? "PRESS"
        : opponent.tacticalMode === "pressure" || opponent.readTells.some(tell => tell.type === "weight_forward" || tell.type === "closing_distance") ? "COUNTER"
          : "WAIT";
    if (this.checkpoint.phase === "READ" && this.checkpoint.lastAutoExchange !== this.checkpoint.exchangeIndex) {
      this.acceptCommand(command);
      this.checkpoint.lastAutoExchange = this.checkpoint.exchangeIndex;
      this.emit("AUTO_COMMAND_SELECTED", { command, legalInputs: ["stamina", "balance", "visible_tell", "opponent_posture"] });
    }
    return command;
  }

  advance(ticks: number, options: { autoCoach?: boolean } = {}): void {
    const deferredTerminalEvents: EngineEvent[] = [];
    for (let index = 0; index < ticks && this.checkpoint.state.phase === "active"; index++) {
      if (options.autoCoach && this.checkpoint.phase === "READ" && this.checkpoint.lastAutoExchange !== this.checkpoint.exchangeIndex) this.selectAutoCommand();
      const previous = this.checkpoint.phase;
      const preCommitSnapshot = previous === "READ" ? this.lockSnapshot() : null;
      stepCombat(this.checkpoint.state);
      const next = phaseFromEngagement(this.checkpoint.state.fighters[0].engagement.phase);
      if (previous === "READ" && next !== "READ") {
        this.checkpoint.phase = "COMMIT";
        this.checkpoint.commandSummary.locked++;
        const lockEvent = this.emit("COMMAND_LOCKED", { command: this.checkpoint.activeCommand });
        if (preCommitSnapshot) captureExchangeLock(this.checkpoint.interpretation, preCommitSnapshot, lockEvent.id);
        this.emit("PHASE_CHANGED", { phase: "COMMIT" });
      }
      for (const event of this.checkpoint.state.eventBuffer) {
        if (event.type === "MATCH_FINISHED") { deferredTerminalEvents.push(event); continue; }
        if (event.type === "COMMAND_RESPONSE") this.checkpoint.commandSummary.resolved++;
        const payload: Record<string, unknown> = { engineType: event.type, fighterId: event.fighterId, targetId: event.targetId, actionId: event.actionId, value: event.value, detail: event.detail };
        if (event.type === "COMMAND_RESPONSE") {
          const compliance = String(event.detail ?? "").split(":")[1];
          payload.grade = compliance === "commit" || compliance === "obey" ? "FULL" : compliance === "partial" ? "PARTIAL" : "RESISTED";
          payload.reasons = String(event.detail ?? "").split(":")[2]?.split(",").filter(Boolean) ?? [];
          payload.command = this.checkpoint.activeCommand;
        }
        this.emit(canonicalEventType(event), payload);
      }
      if (next !== this.checkpoint.phase) {
        if (next === "READ" && previous !== "READ") {
          this.resolveCurrentExchange();
          this.checkpoint.exchangeIndex++;
          this.checkpoint.interpretation = createExchangeAccumulator(this.checkpoint.exchangeIndex);
          this.checkpoint.phase = next;
          this.emit("PHASE_CHANGED", { phase: next });
          if (!options.autoCoach) this.carryCommandIntoRead();
        } else {
          this.checkpoint.phase = next;
          this.emit("PHASE_CHANGED", { phase: next });
        }
      }
    }
    if (this.checkpoint.state.phase === "finished") {
      const result = this.checkpoint.state.result;
      if (this.checkpoint.phase !== "TERMINAL" && result) {
        this.resolveCurrentExchange();
        for (const event of deferredTerminalEvents) this.emit(canonicalEventType(event), { engineType: event.type, fighterId: event.fighterId, targetId: event.targetId, actionId: event.actionId, value: event.value, detail: event.detail });
        if (result.finishReason === "KO") this.emit("KNOCKOUT", { winnerId: result.winnerId });
        else if (result.finishReason === "double_KO") this.emit("DOUBLE_KO", { winnerId: null });
        else if (result.finishReason === "time_limit") {
          this.emit("TIME_LIMIT_REACHED", {});
          this.emit("DECISION_SCORED", { winnerId: result.winnerId, isDraw: result.winnerId === null, fighters: this.checkpoint.state.fighters.map(fighter => ({ fighterId: fighter.snapshot.fighterId, ...fighter.judging })) });
        }
      }
      if (this.checkpoint.phase !== "TERMINAL") {
        this.checkpoint.phase = "TERMINAL";
        this.emit("PHASE_CHANGED", { phase: "TERMINAL" });
      }
    }
  }

  result(allEvents: readonly CanonicalCombatEvent[]): AuthoritativeCombatResult | null {
    const result = this.checkpoint.state.result;
    if (!result) return null;
    const isDraw = result.winnerId === null;
    const finishReason: AuthoritativeCombatResult["finishReason"] = result.finishReason === "double_KO" ? "DOUBLE_KO"
      : result.finishReason === "KO" ? "KNOCKOUT"
        : result.finishReason === "medical_stoppage" ? "MEDICAL_STOPPAGE"
          : result.finishReason === "double_medical_stoppage" ? "DOUBLE_MEDICAL_STOPPAGE"
        : isDraw ? "TIME_LIMIT_DRAW" : "TIME_LIMIT_DECISION";
    const loserId = isDraw ? null : this.checkpoint.state.fighters.find(fighter => fighter.snapshot.fighterId !== result.winnerId)?.snapshot.fighterId ?? null;
    const injuryEvents = allEvents.filter(event => event.type === "INJURY_SUSTAINED").map(event => {
      const fighterId = String(event.payload.fighterId);
      const detail = String(event.payload.detail ?? "internal:serious:fight_ending");
      const [rawLocation, rawSeverity] = detail.split(":");
      const locations: readonly InjuryLocation[] = ["head", "neck", "chest", "wing", "leg", "foot", "joint", "muscle", "internal"];
      const normalizedLocation = rawLocation === "body" ? "chest" : rawLocation;
      const location: InjuryLocation = locations.includes(normalizedLocation as InjuryLocation) ? normalizedLocation as InjuryLocation : "internal";
      const severity: InjurySeverity = rawSeverity === "minor" || rawSeverity === "career_altering" ? rawSeverity : "serious";
      const injuryType = `${location}_${severity}_impact`;
      return {
        id: digestSemantic([event.sessionId, event.cursor, fighterId, injuryType]),
        fighterId,
        eventCursor: event.cursor,
        occurredAtTick: event.logicalTick,
        injuryType,
        severity,
        location,
        detail,
      };
    });
    const fighterIds = this.checkpoint.state.fighters.map(fighter => fighter.snapshot.fighterId);
    const base = { sessionId: this.checkpoint.sessionId, engineVersion: COMBAT_VERSION, rulesetVersion: RULESET_VERSION, seed: String(this.checkpoint.seed), winnerId: result.winnerId, loserId, isDraw, finishReason, terminalTick: result.durationTicks, finalState: { fighters: publicFighters(this.checkpoint.state) }, experienceGained: experienceFromCanonicalEvents(fighterIds, allEvents), careerGained: careerFromCanonicalEvents(this.checkpoint.state, allEvents, result.winnerId), injuryEvents, commandSummary: { ...this.checkpoint.commandSummary, lastCommand: this.checkpoint.activeCommand } };
    return { ...base, eventDigest: digestSemantic({ checkpoint: this.checkpoint.state.config, events: allEvents, result: base }) };
  }
}
