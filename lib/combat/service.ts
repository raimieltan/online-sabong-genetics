import { randomInt, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "../db";
import { canFight, applyFightOutcome } from "../combat";
import { buildBattleReport } from "./battleReport";
import { BATTLE_WIN_CREDITS, earnCredits } from "../economy";
import type { Chicken, CombatResult, InjuryRecord } from "../types";
import { getTournamentDefinition, resolveRound } from "../tournament";
import { stateFromRow, toView as tournamentToView } from "../tournament/service";
import { simulateFight } from "../combat";
import { getBoss } from "../pve/bosses";
import {
  CanonicalCombatRuntime, COMBAT_VERSION, RULESET_VERSION, SNAPSHOT_SCHEMA_VERSION,
  type AuthoritativeCombatResult, type BattleSessionStatus, type CanonicalCheckpoint,
  type CanonicalCombatEvent, type CoachingCommand, type CoachingMode, type CombatMode,
  type DisconnectPolicy, isCoachingCommand, publicFighters,
} from "../combat-v2/canonical";
import type { AwakeningType } from "../combat-v2/types";
import { launchSurfaceAllowsAwakening } from "../combat-v2/launchSurface";
import { readTicks } from "../combat-v2/rhythm";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const eventData = (event: CanonicalCombatEvent) => ({ id: event.id, sessionId: event.sessionId, cursor: event.cursor, logicalTick: event.logicalTick, exchangeIndex: event.exchangeIndex, type: event.type, payload: json(event.payload) });
const SESSION_LIFETIME_MS = 15 * 60_000;
const ENCOUNTER_LIFETIME_MS = 10 * 60_000;

export class CombatServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}

export type CombatView = {
  sessionId: string;
  serverTime: string;
  status: BattleSessionStatus;
  revision: number;
  phase: string | null;
  exchangeIndex: number;
  logicalTick: number;
  phaseDeadlineTick: number | null;
  phaseDeadlineAt: string | null;
  activeCommand: CoachingCommand;
  latestEventCursor: number;
  fighters: [Chicken, Chicken];
  projection: ReturnType<typeof publicFighters>;
  events: CanonicalCombatEvent[];
  result: AuthoritativeCombatResult | null;
  settlement: Record<string, unknown> | null;
  allowedActions: { command: boolean; awakening: boolean; sync: boolean };
};

export async function createCombatEncounter(input: {
  ownerPlayerId: string;
  fighterId: string;
  opponent: Chicken;
  mode: CombatMode;
  modeContextId?: string | null;
  ruleset?: Record<string, unknown>;
}) {
  return prisma.combatEncounter.create({ data: {
    ownerPlayerId: input.ownerPlayerId, fighterId: input.fighterId, mode: input.mode,
    modeContextId: input.modeContextId ?? null, opponentSnapshot: json(input.opponent),
    ruleset: json(input.ruleset ?? { version: RULESET_VERSION }),
    expiresAt: new Date(Date.now() + ENCOUNTER_LIFETIME_MS),
  } });
}

function rowView(row: {
  id: string; mode: string; status: string; revision: number; phase: string | null; exchangeIndex: number;
  logicalTick: number; activeCommand: string; latestEventCursor: number; fighterASnapshot: unknown;
  fighterBSnapshot: unknown; engineCheckpoint: unknown; terminalResult: unknown; postFightPayload: unknown;
}, events: CanonicalCombatEvent[]): CombatView {
  const checkpoint = row.engineCheckpoint as CanonicalCheckpoint;
  const fighter = checkpoint.state.fighters[0];
  const phaseDeadlineTick = row.phase === "READ" ? fighter.engagement.enteredTick + readTicks(fighter)
    : row.phase === "CLASH" ? fighter.engagement.clashUntil
      : row.phase === "DISENGAGE" ? Math.max(fighter.engagement.breakUntil, fighter.engagement.resetUntil) : null;
  return {
    sessionId: row.id, serverTime: new Date().toISOString(), status: row.status as BattleSessionStatus,
    revision: row.revision, phase: row.phase, exchangeIndex: row.exchangeIndex, logicalTick: row.logicalTick,
    phaseDeadlineTick, phaseDeadlineAt: phaseDeadlineTick === null ? null : new Date(Date.now() + Math.max(0, phaseDeadlineTick - row.logicalTick) * 1000 / 60).toISOString(),
    activeCommand: row.activeCommand as CoachingCommand, latestEventCursor: row.latestEventCursor,
    fighters: [row.fighterASnapshot as Chicken, row.fighterBSnapshot as Chicken],
    projection: publicFighters(checkpoint.state), events,
    result: row.terminalResult as AuthoritativeCombatResult | null,
    settlement: row.postFightPayload as Record<string, unknown> | null,
    allowedActions: {
      command: row.status === "ACTIVE" && row.phase === "READ",
      awakening: launchSurfaceAllowsAwakening(row.mode as CombatMode) && row.status === "ACTIVE" && !checkpoint.state.fighters[0].awakening && !checkpoint.state.fighters[0].awakeningAttempted && checkpoint.state.fighters[0].snapshot.evolution.awakenings.length > 0,
      sync: row.status === "ACTIVE",
    },
  };
}

async function eventRows(sessionId: string, after = 0): Promise<CanonicalCombatEvent[]> {
  const rows = await prisma.combatEventRecord.findMany({ where: { sessionId, cursor: { gt: Math.max(0, after) } }, orderBy: { cursor: "asc" } });
  return rows.map(row => ({ id: row.id, sessionId: row.sessionId, cursor: row.cursor, logicalTick: row.logicalTick, exchangeIndex: row.exchangeIndex, type: row.type, payload: row.payload as Record<string, unknown>, semantic: true }));
}

export async function createSession(input: {
  fighterId: string; encounterId: string; coachingMode: CoachingMode; openingCommand: CoachingCommand;
  disconnectPolicy: DisconnectPolicy; idempotencyKey: string;
}, actorPlayerId: string): Promise<CombatView> {
  if (!input.idempotencyKey) throw new CombatServiceError("IDEMPOTENCY_KEY_REQUIRED", 400);
  if (!isCoachingCommand(input.openingCommand)) throw new CombatServiceError("INVALID_COMMAND", 400);
  if (input.coachingMode !== "MANUAL" && input.coachingMode !== "AUTO") throw new CombatServiceError("INVALID_COACHING_MODE", 400);
  if (input.disconnectPolicy !== "KEEP_INSTRUCTION" && input.disconnectPolicy !== "AUTO_COACH") throw new CombatServiceError("INVALID_DISCONNECT_POLICY", 400);
  const existing = await prisma.combatSessionRecord.findUnique({ where: { ownerPlayerId_createIdempotencyKey: { ownerPlayerId: actorPlayerId, createIdempotencyKey: input.idempotencyKey } } });
  if (existing) return rowView(existing, await eventRows(existing.id));

  const [encounter, fighter] = await Promise.all([
    prisma.combatEncounter.findUnique({ where: { id: input.encounterId } }),
    prisma.chicken.findUnique({ where: { id: input.fighterId } }),
  ]);
  if (!encounter || encounter.ownerPlayerId !== actorPlayerId || encounter.fighterId !== input.fighterId) throw new CombatServiceError("ENCOUNTER_NOT_OWNED", 404);
  if (encounter.expiresAt <= new Date()) throw new CombatServiceError("ENCOUNTER_EXPIRED", 410);
  if (encounter.consumedBySessionId) throw new CombatServiceError("ENCOUNTER_CONSUMED", 409);
  if (!fighter || fighter.playerId !== actorPlayerId) throw new CombatServiceError("FIGHTER_NOT_OWNED", 404);
  if (!canFight(fighter as unknown as Chicken)) throw new CombatServiceError("FIGHTER_NOT_ELIGIBLE", 409);
  if (fighter.activeCombatSessionId) {
    const active = await prisma.combatSessionRecord.findUnique({ where: { id: fighter.activeCombatSessionId } });
    if (active) return rowView(active, await eventRows(active.id));
  }

  const sessionId = randomUUID();
  const seed = randomInt(0, 0x1_0000_0000);
  const runtime = CanonicalCombatRuntime.create({ sessionId, seed, fighterA: fighter as unknown as Chicken, fighterB: encounter.opponentSnapshot as unknown as Chicken, openingCommand: input.openingCommand });
  runtime.advance(1);
  const events = runtime.drainEvents();
  const checkpoint = runtime.checkpoint;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

  const created = await prisma.$transaction(async tx => {
    const lease = await tx.chicken.updateMany({ where: { id: fighter.id, playerId: actorPlayerId, activeCombatSessionId: null }, data: { activeCombatSessionId: sessionId } });
    if (lease.count !== 1) throw new CombatServiceError("FIGHTER_ALREADY_IN_COMBAT", 409);
    const consumed = await tx.combatEncounter.updateMany({ where: { id: encounter.id, consumedBySessionId: null }, data: { consumedBySessionId: sessionId } });
    if (consumed.count !== 1) throw new CombatServiceError("ENCOUNTER_CONSUMED", 409);
    const row = await tx.combatSessionRecord.create({ data: {
      id: sessionId, ownerPlayerId: actorPlayerId, fighterId: fighter.id, encounterId: encounter.id,
      createIdempotencyKey: input.idempotencyKey, mode: encounter.mode, modeContextId: encounter.modeContextId,
      engineVersion: COMBAT_VERSION, rulesetVersion: RULESET_VERSION, snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
      seed: String(seed), fighterASnapshot: json(fighter), fighterBSnapshot: json(encounter.opponentSnapshot),
      coachingMode: input.coachingMode, disconnectPolicy: input.disconnectPolicy, activeCommand: input.openingCommand,
      status: "ACTIVE", phase: checkpoint.phase, exchangeIndex: checkpoint.exchangeIndex, logicalTick: checkpoint.state.tick,
      revision: 1, latestEventCursor: checkpoint.nextCursor - 1, engineCheckpoint: json(checkpoint), settlementKey: `combat:${sessionId}`,
      startedAt: now, lastAdvancedAt: now, expiresAt,
    } });
    await tx.combatEventRecord.createMany({ data: events.map(eventData) });
    return row;
  });
  return rowView(created, events);
}

function elapsedTicks(lastAdvancedAt: Date | null): number {
  if (!lastAdvancedAt) return 1;
  return Math.max(1, Math.min(60 * 120, Math.floor((Date.now() - lastAdvancedAt.getTime()) * 60 / 1000)));
}

async function advanceSession(sessionId: string, actorPlayerId: string): Promise<CombatView> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await prisma.combatSessionRecord.findUnique({ where: { id: sessionId } });
    if (!row || row.ownerPlayerId !== actorPlayerId) throw new CombatServiceError("SESSION_NOT_OWNED", 404);
    if (row.status !== "ACTIVE") return rowView(row, []);
    if (row.expiresAt <= new Date()) {
      const expired = await prisma.$transaction(async tx => {
        const write = await tx.combatSessionRecord.updateMany({ where: { id: row.id, revision: row.revision, status: "ACTIVE" }, data: { status: "EXPIRED", phase: null, revision: { increment: 1 } } });
        if (write.count !== 1) return null;
        await tx.chicken.updateMany({ where: { id: row.fighterId, activeCombatSessionId: row.id }, data: { activeCombatSessionId: null } });
        return tx.combatSessionRecord.findUnique({ where: { id: row.id } });
      });
      if (expired) return rowView(expired, []);
      continue;
    }
    const runtime = CanonicalCombatRuntime.restore(row.engineCheckpoint as unknown as CanonicalCheckpoint);
    const autoCoach = row.coachingMode === "AUTO" || row.disconnectPolicy === "AUTO_COACH" && row.lastAdvancedAt !== null && Date.now() - row.lastAdvancedAt.getTime() > 5_000;
    runtime.advance(elapsedTicks(row.lastAdvancedAt), { autoCoach });
    const events = runtime.drainEvents();
    const checkpoint = runtime.checkpoint;
    const priorEvents = checkpoint.state.phase === "finished" ? await eventRows(row.id) : [];
    const result = checkpoint.state.phase === "finished" ? runtime.result([...priorEvents, ...events]) : null;
    const now = new Date();
    const updated = await prisma.$transaction(async tx => {
      const write = await tx.combatSessionRecord.updateMany({ where: { id: row.id, revision: row.revision, status: "ACTIVE" }, data: {
        status: result ? "TERMINAL_UNSETTLED" : "ACTIVE", phase: checkpoint.phase,
        exchangeIndex: checkpoint.exchangeIndex, logicalTick: checkpoint.state.tick, revision: { increment: 1 },
        latestEventCursor: checkpoint.nextCursor - 1, engineCheckpoint: json(checkpoint), activeCommand: checkpoint.activeCommand,
        terminalResult: result ? json(result) : undefined, terminalAt: result ? now : undefined, lastAdvancedAt: now,
      } });
      if (write.count !== 1) return null;
      if (events.length) await tx.combatEventRecord.createMany({ data: events.map(eventData), skipDuplicates: true });
      return tx.combatSessionRecord.findUnique({ where: { id: row.id } });
    });
    if (!updated) continue;
    if (result) return settleSession(updated.id, actorPlayerId);
    return rowView(updated, events);
  }
  throw new CombatServiceError("STALE_SESSION", 409);
}

export async function getSession(sessionId: string, actorPlayerId: string, after = 0): Promise<CombatView> {
  const view = await advanceSession(sessionId, actorPlayerId);
  view.events = await eventRows(sessionId, after);
  return view;
}

export async function syncSession(sessionId: string, actorPlayerId: string, after = 0): Promise<CombatView> {
  return getSession(sessionId, actorPlayerId, after);
}

export async function issueCommand(sessionId: string, input: { commandId: string; command: unknown; observedRevision: number }, actorPlayerId: string) {
  if (!input.commandId) throw new CombatServiceError("INVALID_COMMAND", 400);
  const owned = await prisma.combatSessionRecord.findUnique({ where: { id: sessionId } });
  if (!owned || owned.ownerPlayerId !== actorPlayerId) throw new CombatServiceError("SESSION_NOT_OWNED", 404);
  if (!Number.isSafeInteger(input.observedRevision) || input.observedRevision > owned.revision || input.observedRevision < owned.revision && owned.phase !== "READ") throw new CombatServiceError("STALE_SESSION", 409);
  const recentCommands = await prisma.combatCommandRecord.count({ where: { sessionId, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentCommands >= 30) throw new CombatServiceError("RATE_LIMITED", 429);
  const duplicate = await prisma.combatCommandRecord.findUnique({ where: { sessionId_commandId: { sessionId, commandId: input.commandId } } });
  if (duplicate) return duplicate.receipt;
  if (!isCoachingCommand(input.command)) throw new CombatServiceError("INVALID_COMMAND", 400);
  const command = input.command;
  const advanced = await advanceSession(sessionId, actorPlayerId);
  if (advanced.status !== "ACTIVE") throw new CombatServiceError(advanced.status === "EXPIRED" ? "SESSION_EXPIRED" : "SESSION_TERMINAL", 409);
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await prisma.combatSessionRecord.findUnique({ where: { id: sessionId } });
    if (!row || row.ownerPlayerId !== actorPlayerId) throw new CombatServiceError("SESSION_NOT_OWNED", 404);
    if (row.status !== "ACTIVE") throw new CombatServiceError(row.status === "EXPIRED" ? "SESSION_EXPIRED" : "SESSION_TERMINAL", 409);
    const runtime = CanonicalCombatRuntime.restore(row.engineCheckpoint as unknown as CanonicalCheckpoint);
    try { runtime.acceptCommand(command); }
    catch (error) { throw new CombatServiceError(error instanceof Error ? error.message : "COMMAND_LOCKED", 409); }
    const events = runtime.drainEvents();
    const checkpoint = runtime.checkpoint;
    const receipt = { status: "ACCEPTED", commandId: input.commandId, command, revision: row.revision + 1, acceptedAtTick: checkpoint.state.tick, eligibleExchangeIndex: checkpoint.exchangeIndex };
    const committed = await prisma.$transaction(async tx => {
      const write = await tx.combatSessionRecord.updateMany({ where: { id: row.id, revision: row.revision, status: "ACTIVE" }, data: { revision: { increment: 1 }, phase: checkpoint.phase, exchangeIndex: checkpoint.exchangeIndex, logicalTick: checkpoint.state.tick, latestEventCursor: checkpoint.nextCursor - 1, engineCheckpoint: json(checkpoint), activeCommand: command, lastAdvancedAt: new Date() } });
      if (write.count !== 1) return false;
      if (events.length) await tx.combatEventRecord.createMany({ data: events.map(eventData) });
      await tx.combatCommandRecord.create({ data: { sessionId, commandId: input.commandId, command, receipt: json(receipt) } });
      return true;
    });
    if (committed) return receipt;
  }
  throw new CombatServiceError("STALE_SESSION", 409);
}

const AWAKENING_TYPES: readonly AwakeningType[] = ["unbreakable", "berserker", "flow-state", "second-wind", "apex"];

export async function triggerSessionAwakening(sessionId: string, input: { actionId: string; type: unknown; observedRevision: number }, actorPlayerId: string) {
  if (!input.actionId || typeof input.type !== "string" || !AWAKENING_TYPES.includes(input.type as AwakeningType)) {
    throw new CombatServiceError("INVALID_AWAKENING", 400);
  }
  const owned = await prisma.combatSessionRecord.findUnique({ where: { id: sessionId } });
  if (!owned || owned.ownerPlayerId !== actorPlayerId) throw new CombatServiceError("SESSION_NOT_OWNED", 404);
  const duplicate = await prisma.combatCommandRecord.findUnique({ where: { sessionId_commandId: { sessionId, commandId: input.actionId } } });
  if (duplicate) return duplicate.receipt;
  if (!launchSurfaceAllowsAwakening(owned.mode as CombatMode)) throw new CombatServiceError("AWAKENING_UNAVAILABLE", 409);
  const type = input.type as AwakeningType;
  const advanced = await advanceSession(sessionId, actorPlayerId);
  if (advanced.status !== "ACTIVE") throw new CombatServiceError(advanced.status === "EXPIRED" ? "SESSION_EXPIRED" : "SESSION_TERMINAL", 409);
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await prisma.combatSessionRecord.findUnique({ where: { id: sessionId } });
    if (!row || row.ownerPlayerId !== actorPlayerId) throw new CombatServiceError("SESSION_NOT_OWNED", 404);
    if (row.status !== "ACTIVE") throw new CombatServiceError(row.status === "EXPIRED" ? "SESSION_EXPIRED" : "SESSION_TERMINAL", 409);
    const runtime = CanonicalCombatRuntime.restore(row.engineCheckpoint as unknown as CanonicalCheckpoint);
    try { runtime.triggerPlayerAwakening(type); }
    catch (error) { throw new CombatServiceError(error instanceof Error ? error.message : "AWAKENING_REJECTED", 409); }
    const events = runtime.drainEvents();
    const checkpoint = runtime.checkpoint;
    const receipt = { status: "ACCEPTED", actionId: input.actionId, type, revision: row.revision + 1, acceptedAtTick: checkpoint.state.tick };
    const committed = await prisma.$transaction(async tx => {
      const write = await tx.combatSessionRecord.updateMany({ where: { id: row.id, revision: row.revision, status: "ACTIVE" }, data: { revision: { increment: 1 }, latestEventCursor: checkpoint.nextCursor - 1, engineCheckpoint: json(checkpoint), lastAdvancedAt: new Date() } });
      if (write.count !== 1) return false;
      if (events.length) await tx.combatEventRecord.createMany({ data: events.map(eventData) });
      await tx.combatCommandRecord.create({ data: { sessionId, commandId: input.actionId, command: `AWAKEN:${type}`, receipt: json(receipt) } });
      return true;
    });
    if (committed) return receipt;
  }
  throw new CombatServiceError("STALE_SESSION", 409);
}

function legacyResult(result: AuthoritativeCombatResult): CombatResult {
  const finalHealth = Object.fromEntries(result.finalState.fighters.map(fighter => [fighter.fighterId, { current: fighter.health, max: fighter.maxHealth, percent: Math.round(fighter.health / fighter.maxHealth * 100) }]));
  const damageRatio = (fighter: AuthoritativeCombatResult["finalState"]["fighters"][number]) =>
    Math.max(0, Math.min(1, (fighter.startingHealth - fighter.health) / fighter.maxHealth));
  const conditionDelta = Object.fromEntries(result.finalState.fighters.map(fighter => {
    const damage = damageRatio(fighter);
    if (result.isDraw) return [fighter.fighterId, -Math.min(22, 5 + damage * 20)];
    if (fighter.fighterId === result.winnerId) return [fighter.fighterId, -Math.min(15, damage * 20)];
    return [fighter.fighterId, -Math.min(30, 8 + damage * 25)];
  }));
  const newInjuries = result.injuryEvents.reduce<Record<string, InjuryRecord[]>>((byFighter, injury) => {
    (byFighter[injury.fighterId] ??= []).push({
      id: injury.id,
      severity: injury.severity,
      label: injury.location === "head" ? "Severe head trauma" : injury.location === "neck" ? "Critical neck trauma" : "Internal impact trauma",
      incurredAt: injury.occurredAtTick,
      recoveryRemaining: injury.severity === "minor" ? 1 : injury.severity === "serious" ? 3 : 0,
      permanent: injury.severity === "career_altering",
      statPenalty: injury.severity === "career_altering" ? { power: -5, speed: -5 } : undefined,
      location: injury.location,
    });
    return byFighter;
  }, {});
  return { winnerId: result.winnerId, loserId: result.loserId, isDraw: result.isDraw, finishReason: result.finishReason,
    log: [], totalTurns: Math.ceil(result.terminalTick / 60), outcomeReason: result.finishReason.includes("MEDICAL") ? "critical_injury" : result.finishReason.includes("TIME_LIMIT") ? "timeout" : "ko",
    injuredChickenId: result.injuryEvents[0]?.fighterId ?? null, newInjuries, conditionDelta, experienceGained: result.experienceGained, combatCareerGained: result.careerGained, matchSeed: Number(result.seed), finalHealth } as unknown as CombatResult;
}

export async function settleSession(sessionId: string, actorPlayerId: string): Promise<CombatView> {
  const row = await prisma.combatSessionRecord.findUnique({ where: { id: sessionId } });
  if (!row || row.ownerPlayerId !== actorPlayerId) throw new CombatServiceError("SESSION_NOT_OWNED", 404);
  const prior = await prisma.combatSettlementRecord.findUnique({ where: { sessionId } });
  if (prior) {
    const current = await prisma.combatSessionRecord.findUniqueOrThrow({ where: { id: sessionId } });
    return rowView(current, []);
  }
  if (row.status !== "TERMINAL_UNSETTLED" || !row.terminalResult) throw new CombatServiceError("SESSION_NOT_TERMINAL", 409);
  const result = row.terminalResult as unknown as AuthoritativeCombatResult;
  const fighter = await prisma.chicken.findUnique({ where: { id: row.fighterId } });
  if (!fighter) throw new CombatServiceError("FIGHTER_NOT_FOUND", 404);
  const canonicalLegacy = legacyResult(result);
  const tournamentRow = row.mode === "TOURNAMENT" && row.modeContextId ? await prisma.tournament.findUnique({ where: { id: row.modeContextId } }) : null;
  const tournamentPlan = tournamentRow && !result.isDraw ? resolveRound(stateFromRow(tournamentRow), fighter as unknown as Chicken, (a, b) => a.id === fighter.id || b.id === fighter.id ? canonicalLegacy : simulateFight(a, b)) : null;
  const tournamentWon = tournamentPlan?.state.status === "complete" && tournamentPlan.state.placement === 1;
  const tournamentPrize = tournamentWon && tournamentRow ? getTournamentDefinition(tournamentRow.definitionId)?.championPrize ?? 0 : 0;
  const boss = (row.mode === "BOSS" || row.mode === "PVE" || row.mode === "SIDE_ENCOUNTER") && row.modeContextId ? getBoss(row.modeContextId) : null;
  const experienceMultiplier = boss?.rewards.experienceMultiplier ?? 1;
  if (experienceMultiplier !== 1 && canonicalLegacy.experienceGained) {
    canonicalLegacy.experienceGained = Object.fromEntries(Object.entries(canonicalLegacy.experienceGained).map(([fighterId, gained]) => [fighterId, Object.fromEntries(Object.entries(gained).map(([category, amount]) => [category, Math.round(amount * experienceMultiplier)]))])) as typeof canonicalLegacy.experienceGained;
  }
  const outcome = applyFightOutcome(fighter as unknown as Chicken, canonicalLegacy);
  const battleReport = buildBattleReport(fighter as unknown as Chicken, canonicalLegacy, fighter.id, outcome);
  const bossProgress = boss ? await prisma.pveProgress.findUnique({ where: { playerId_bossId: { playerId: actorPlayerId, bossId: boss.id } } }) : null;
  const bossWon = Boolean(boss && result.winnerId === fighter.id);
  const bossFirstClear = bossWon && (bossProgress?.clearCount ?? 0) === 0;
  const creditsEarned = tournamentPrize || (row.mode === "NORMAL" && result.winnerId === fighter.id ? BATTLE_WIN_CREDITS
    : bossWon && boss ? (bossFirstClear ? boss.rewards.firstClearCredits : boss.rewards.repeatCredits) : 0);
  const { newTraits: _newTraits, ...basePersistedOutcome } = outcome;
  const persistedOutcome = tournamentWon
    ? { ...basePersistedOutcome, record: { ...basePersistedOutcome.record, championships: basePersistedOutcome.record.championships + 1 } }
    : basePersistedOutcome;
  void _newTraits;
  const payload = { result, legacyResult: canonicalLegacy, battleReport, creditsEarned, mode: row.mode, modeContextId: row.modeContextId,
    chicken: { ...(fighter as unknown as Chicken), ...persistedOutcome },
    rewards: { credits: creditsEarned, tournamentTokens: tournamentPlan?.state.tokensAwarded ?? 0, championship: tournamentWon, firstClear: bossFirstClear, experienceMultiplier },
    tournament: tournamentPlan ? { ...tournamentPlan.state, id: tournamentRow!.id, chickenId: tournamentRow!.chickenId, definitionId: tournamentRow!.definitionId } : tournamentRow ? tournamentToView(tournamentRow) : null,
    tournamentRematchRequired: Boolean(tournamentRow && result.isDraw),
    campaign: boss ? { bossId: boss.id, won: bossWon, firstClear: bossFirstClear, credits: creditsEarned, experienceMultiplier: boss.rewards.experienceMultiplier } : null };
  const settled = await prisma.$transaction(async tx => {
    const created = await tx.combatSettlementRecord.create({ data: { sessionId, settlementKey: row.settlementKey, resultDigest: result.eventDigest, payload: json(payload) } });
    await tx.chicken.update({ where: { id: fighter.id }, data: { ...persistedOutcome, activeCombatSessionId: null } });
    if (creditsEarned) {
      const player = await tx.player.findUniqueOrThrow({ where: { id: actorPlayerId } });
      await tx.player.update({ where: { id: actorPlayerId }, data: { credits: earnCredits(player.credits, creditsEarned) } });
    }
    if (tournamentPlan && tournamentRow) {
      const next = tournamentPlan.state;
      await tx.tournament.update({ where: { id: tournamentRow.id }, data: { currentRound: next.currentRound, status: next.status === "complete" ? "COMPLETE" : "IN_PROGRESS", entrants: json(next.entrants), history: json(next.history), placement: next.placement, tokensAwarded: next.tokensAwarded } });
      if (next.tokensAwarded > 0) await tx.player.update({ where: { id: actorPlayerId }, data: { tournamentTokens: { increment: next.tokensAwarded } } });
    }
    if (boss) {
      await tx.pveOpponentHistory.upsert({ where: { playerId_bossId: { playerId: actorPlayerId, bossId: boss.id } }, create: { playerId: actorPlayerId, bossId: boss.id, wins: bossWon ? 1 : 0, losses: bossWon || result.isDraw ? 0 : 1, kosFor: bossWon && result.finishReason === "KNOCKOUT" ? 1 : 0, kosAgainst: !bossWon && !result.isDraw && result.finishReason === "KNOCKOUT" ? 1 : 0 }, update: { wins: { increment: bossWon ? 1 : 0 }, losses: { increment: bossWon || result.isDraw ? 0 : 1 }, kosFor: { increment: bossWon && result.finishReason === "KNOCKOUT" ? 1 : 0 }, kosAgainst: { increment: !bossWon && !result.isDraw && result.finishReason === "KNOCKOUT" ? 1 : 0 }, lastFightAt: new Date() } });
      if (bossWon) await tx.pveProgress.upsert({ where: { playerId_bossId: { playerId: actorPlayerId, bossId: boss.id } }, create: { playerId: actorPlayerId, bossId: boss.id, clearCount: 1, firstClearedAt: new Date(), firstClearChickenId: fighter.id, lastClearedAt: new Date() }, update: { clearCount: { increment: 1 }, lastClearedAt: new Date() } });
      if (bossFirstClear) await tx.pveCampaignState.upsert({ where: { playerId: actorPlayerId }, create: { playerId: actorPlayerId, reputation: Math.round(boss.rewards.firstClearCredits / 10) }, update: { reputation: { increment: Math.round(boss.rewards.firstClearCredits / 10) } } });
    }
    const settledCursor = row.latestEventCursor + 1;
    await tx.combatEventRecord.create({ data: { id: `${sessionId}:settled`, sessionId, cursor: settledCursor, logicalTick: row.logicalTick, exchangeIndex: row.exchangeIndex, type: "SESSION_SETTLED", payload: json({ settlementId: created.id }) } });
    await tx.combatSessionRecord.update({ where: { id: sessionId }, data: { status: "SETTLED", settledAt: new Date(), postFightPayload: json(payload), latestEventCursor: settledCursor, revision: { increment: 1 } } });
    return created;
  }).catch(async error => {
    const duplicate = await prisma.combatSettlementRecord.findUnique({ where: { sessionId } });
    if (duplicate) return duplicate;
    throw error;
  });
  const current = await prisma.combatSessionRecord.findUniqueOrThrow({ where: { id: sessionId } });
  return rowView(current, [{ id: `${sessionId}:settled`, sessionId, cursor: current.latestEventCursor, logicalTick: current.logicalTick, exchangeIndex: current.exchangeIndex, type: "SESSION_SETTLED", payload: { settlementId: settled.id }, semantic: true }]);
}
