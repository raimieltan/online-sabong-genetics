import { createHash } from "node:crypto";

import { COMBAT_VERSION } from "./constants";
import { createMatch, queueCommand, stepCombat } from "./engine";
import type { CombatEvent as EngineEvent, CombatMatchState, EngagementPhase } from "./types";
import { toCombatV2Snapshot } from "../combatV2Snapshot";
import type { Chicken, InjuryLocation, InjurySeverity } from "../types";

export { COMBAT_VERSION };
export const RULESET_VERSION = "continuous-v2-canonical-1";
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
  stamina: number;
  balance: number;
  combatMomentum: number;
  mentalState: string;
  position: { x: number; y: number; z: number };
  facing: number;
  actionId: string | null;
  engagement: EngagementPhase;
  readTells: readonly { type: string; strength: number; confidence: number; startedTick: number }[];
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
    stamina: fighter.stamina,
    balance: fighter.balance,
    combatMomentum: fighter.combatMomentum,
    mentalState: fighter.mentalState,
    position: { ...fighter.position },
    facing: fighter.facing,
    actionId: fighter.currentAction?.id ?? null,
    engagement: fighter.engagement.phase,
    readTells: fighter.readTells.map(tell => ({ ...tell })),
  }));
}

function canonicalEventType(event: EngineEvent): string {
  const map: Partial<Record<EngineEvent["type"], string>> = {
    READ_TELL_STARTED: "TELL_STARTED", READ_TELL_UPDATED: "TELL_INTENSIFIED", READ_TELL_ENDED: "TELL_REVEALED",
    ATTACK_STARTED: "ACTION_STARTED", ATTACK_ACTIVE: "ACTION_CHAINED", ATTACK_MISSED: "ACTION_ENDED",
    ATTACK_LANDED: "HIT", COUNTER_LANDED: "COUNTER_TRIGGERED", DAMAGE: "HEALTH_CHANGED",
    STATE_CHANGED: "STANCE_CHANGED", INTENT_CHANGED: "STANCE_CHANGED", COMMAND_RESPONSE: "COMMAND_RESOLVED",
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
    const runtime = new CanonicalCombatRuntime({ sessionId: input.sessionId, seed: input.seed, state, phase: "READ", exchangeIndex: 0, nextCursor: 1, activeCommand: input.openingCommand, commandSequence: -1, commandSummary: { accepted: 0, locked: 0, resolved: 0 } });
    runtime.emit("SESSION_STARTED", { engineVersion: COMBAT_VERSION, rulesetVersion: RULESET_VERSION });
    runtime.emit("PHASE_CHANGED", { phase: "READ" });
    runtime.acceptCommand(input.openingCommand);
    return runtime;
  }

  static restore(checkpoint: CanonicalCheckpoint): CanonicalCombatRuntime {
    return new CanonicalCombatRuntime(structuredClone(checkpoint));
  }

  private emit(type: string, payload: Record<string, unknown>, tick = this.checkpoint.state.tick): void {
    const cursor = this.checkpoint.nextCursor++;
    this.emitted.push({ id: digestSemantic([this.checkpoint.sessionId, cursor]), sessionId: this.checkpoint.sessionId, cursor, logicalTick: tick, exchangeIndex: this.checkpoint.exchangeIndex, type, payload, semantic: true });
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

  advance(ticks: number): void {
    for (let index = 0; index < ticks && this.checkpoint.state.phase === "active"; index++) {
      const previous = this.checkpoint.phase;
      stepCombat(this.checkpoint.state);
      const next = phaseFromEngagement(this.checkpoint.state.fighters[0].engagement.phase);
      if (previous === "READ" && next !== "READ") {
        this.checkpoint.phase = "COMMIT";
        this.checkpoint.commandSummary.locked++;
        this.emit("COMMAND_LOCKED", { command: this.checkpoint.activeCommand });
        this.emit("PHASE_CHANGED", { phase: "COMMIT" });
      }
      if (next !== this.checkpoint.phase) {
        if (next === "READ" && previous !== "READ") this.checkpoint.exchangeIndex++;
        this.checkpoint.phase = next;
        this.emit("PHASE_CHANGED", { phase: next });
      }
      for (const event of this.checkpoint.state.eventBuffer) {
        if (event.type === "COMMAND_RESPONSE") this.checkpoint.commandSummary.resolved++;
        this.emit(canonicalEventType(event), { engineType: event.type, fighterId: event.fighterId, targetId: event.targetId, actionId: event.actionId, value: event.value, detail: event.detail });
      }
    }
    if (this.checkpoint.state.phase === "finished") this.checkpoint.phase = "TERMINAL";
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
      const detail = String(event.payload.detail ?? "internal:fight_ending");
      const rawLocation = detail.split(":")[0];
      const location: InjuryLocation = rawLocation === "head" || rawLocation === "neck" ? rawLocation : "internal";
      const injuryType = `${location}_critical_impact`;
      return {
        id: digestSemantic([event.sessionId, event.cursor, fighterId, injuryType]),
        fighterId,
        eventCursor: event.cursor,
        occurredAtTick: event.logicalTick,
        injuryType,
        severity: "serious" as const,
        location,
        detail,
      };
    });
    const base = { sessionId: this.checkpoint.sessionId, engineVersion: COMBAT_VERSION, rulesetVersion: RULESET_VERSION, seed: String(this.checkpoint.seed), winnerId: result.winnerId, loserId, isDraw, finishReason, terminalTick: result.durationTicks, finalState: { fighters: publicFighters(this.checkpoint.state) }, injuryEvents, commandSummary: { ...this.checkpoint.commandSummary, lastCommand: this.checkpoint.activeCommand } };
    return { ...base, eventDigest: digestSemantic({ checkpoint: this.checkpoint.state.config, events: allEvents, result: base }) };
  }
}
