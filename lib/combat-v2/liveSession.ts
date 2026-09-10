import { createMatch, stepCombat } from './engine';
import { COMBAT_VERSION } from './constants';
import { toCombatV2Snapshot } from '../combatV2Snapshot';
import type { PlayerCommand } from '../combat/command';
import type { Chicken, CombatLogEntry, CombatResult } from '../types';
import { emptyExperience, gainExperience } from '../combat/experience';
import { fighterStrength } from '../combat/evolution';
import type { CombatCareerFightDelta, CombatCareerTelemetry, SignatureTechnique } from '../types';
import type { TacticalMode } from './types';

/** Server-authoritative, steppable wrapper around the continuous V2 engine. */
export const MAX_TURNS = 300;
const TICKS_PER_STEP = 60;

function commandMode(command: PlayerCommand | null | undefined): TacticalMode | null {
  if (command === 'PRESS') return 'pressure';
  if (command === 'COUNTER') return 'counter';
  if (command === 'GUARD') return 'defensive';
  if (command === 'WAIT') return 'defensive';
  if (command === 'RECOVER') return 'recover';
  return null;
}

export class LiveCombatV2Session {
  readonly chickenA: Chicken;
  readonly chickenB: Chicken;
  readonly state;
  turn = 0;
  fightOver = false;
  private log: CombatLogEntry[] = [];
  // The continuous engine emits events rather than the legacy action-resolution
  // objects. Keep an equivalent per-fighter ledger so its results flow through
  // the same persisted combat-experience pipeline as every other fight mode.
  private experienceGained = new Map<string, ReturnType<typeof emptyExperience>>();
  private careerTelemetry = new Map<string, Partial<CombatCareerTelemetry>>();
  private clashStart = new Map<string, { ownHealth: number; otherHealth: number; stamina: number; opening: boolean }>();
  private clashesSeen = new Map<string, number>();
  private pendingKnockdown = new Set<string>();
  private lastDamageTaken = new Map<string, number>();
  private largestDeficit = new Map<string, number>();
  private signatureAttempts = new Map<string, Partial<Record<SignatureTechnique['id'], number>>>();
  private signatureSuccesses = new Map<string, Partial<Record<SignatureTechnique['id'], number>>>();
  private activeSignature = new Map<string, { id: SignatureTechnique['id']; tick: number }>();
  private countedCommandSuccesses = new Set<string>();

  constructor(chickenA: Chicken, chickenB: Chicken, matchSeed = Math.floor(Math.random() * 0x1_0000_0000) >>> 0) {
    this.chickenA = chickenA;
    this.chickenB = chickenB;
    this.state = createMatch({ id: `live-${matchSeed.toString(36)}`, version: COMBAT_VERSION, seed: matchSeed,
      fighterA: toCombatV2Snapshot(chickenA, 'player-a', chickenB.id), fighterB: toCombatV2Snapshot(chickenB, 'player-b', chickenA.id),
      arena: { radius: 8 }, maxTicks: 60 * 90 });
  }

  snapshotA() { return this.snapshot(0); }
  snapshotB() { return this.snapshot(1); }
  private snapshot(index: 0 | 1) {
    const f = this.state.fighters[index];
    const priorCommand = this.state.commands.filter((command) => command.fighterId === f.snapshot.fighterId).at(-1);
    return { hp: f.health, maxHp: f.snapshot.maxHealth, stamina: f.stamina, maxStamina: 100, momentum: f.balance,
      mentalState: f.state, engagementPhase: f.engagement.phase, intent: f.currentIntent,
      commandCompliance: f.coaching?.compliance ?? null, awakening: f.awakening?.type ?? null,
      commandPoints: !priorCommand || this.state.tick >= priorCommand.effectiveTick + 120 ? 3 : 0, pendingCommand: null as PlayerCommand | null };
  }

  step(command?: PlayerCommand | null, _autoCoach?: unknown) {
    const logStart = this.log.length;
    const mode = commandMode(command);
    if (mode && this.state.phase === 'active') {
      const prior = this.state.commands.filter((c) => c.fighterId === this.chickenA.id).at(-1);
      // Command scheduling and cooldown validation remain engine-owned.
      if (!prior || this.state.tick + 12 - prior.effectiveTick >= 120) this.state.commands.push({
        playerId: 'player-a', fighterId: this.chickenA.id, command: mode, issuedTick: this.state.tick,
        effectiveTick: this.state.tick + 12, sequence: (prior?.sequence ?? -1) + 1,
      });
    }
    const startTick = this.state.tick;
    while (this.state.phase === 'active' && this.state.tick - startTick < TICKS_PER_STEP) {
      stepCombat(this.state);
      this.recordEvents();
    }
    this.turn += 1;
    this.fightOver = this.state.phase === 'finished';
    return { turn: this.turn, entries: this.log.slice(logStart), fightOver: this.fightOver, durationMs: (this.state.tick - startTick) * (1000 / 60) };
  }

  private recordEvents() {
    for (const event of this.state.eventBuffer) {
      const fighter = this.state.fighters.find((entry) => entry.snapshot.fighterId === event.fighterId);
      const opponent = this.state.fighters.find((entry) => entry.snapshot.fighterId !== event.fighterId);
      if (fighter && opponent) {
        const deficit = opponent.health / opponent.snapshot.maxHealth - fighter.health / fighter.snapshot.maxHealth;
        this.largestDeficit.set(event.fighterId, Math.max(this.largestDeficit.get(event.fighterId) ?? 0, deficit));
      }
      const addTelemetry = (fighterId: string, key: keyof CombatCareerTelemetry, amount = 1) => {
        const current = this.careerTelemetry.get(fighterId) ?? {};
        current[key] = (current[key] ?? 0) + amount;
        this.careerTelemetry.set(fighterId, current);
      };
      if (event.type === 'COMMAND_RESPONSE') {
        addTelemetry(event.fighterId, 'playerCommandsIssued');
        addTelemetry(event.fighterId, 'playerCommandCompliance', event.value ?? 0);
      }
      if (event.type === 'INTENT_CHANGED' && fighter?.coaching?.successful) {
        const key = `${event.fighterId}:${fighter.coaching.issuedTick}`;
        if (!this.countedCommandSuccesses.has(key)) { this.countedCommandSuccesses.add(key); addTelemetry(event.fighterId, 'playerCommandSuccess'); }
      }
      if (event.type === 'SIGNATURE_TECHNIQUE' && event.actionId) {
        const id = event.actionId as SignatureTechnique['id'];
        const attempts = this.signatureAttempts.get(event.fighterId) ?? {};
        attempts[id] = (attempts[id] ?? 0) + 1;
        this.signatureAttempts.set(event.fighterId, attempts);
        this.activeSignature.set(event.fighterId, { id, tick: event.tick });
      }
      if (event.type === 'CLASH_STARTED' && fighter && opponent) {
        const seen = this.clashesSeen.get(event.fighterId) ?? 0;
        this.clashesSeen.set(event.fighterId, seen + 1);
        this.clashStart.set(event.fighterId, { ownHealth: fighter.health, otherHealth: opponent.health, stamina: fighter.stamina, opening: seen === 0 });
      }
      if (event.type === 'CLASH_ENDED' && fighter && opponent) {
        const start = this.clashStart.get(event.fighterId);
        if (start) {
          const dealt = start.otherHealth - opponent.health, taken = start.ownHealth - fighter.health;
          const won = dealt > taken;
          addTelemetry(event.fighterId, won ? 'clashesWon' : 'clashesLost');
          if (start.opening) addTelemetry(event.fighterId, won ? 'openingClashesWon' : 'openingClashesLost');
          if (won && start.stamina < 25) addTelemetry(event.fighterId, 'lowStaminaClashesWon');
          addTelemetry(event.fighterId, 'successfulDisengagements');
          this.clashStart.delete(event.fighterId);
        }
      }
      if (event.type === 'STAGGER') {
        addTelemetry(event.fighterId, 'knockdownsTaken');
        this.pendingKnockdown.add(event.fighterId);
      }
      if (event.type === 'STATE_CHANGED' && event.detail === 'neutral' && this.pendingKnockdown.delete(event.fighterId)) addTelemetry(event.fighterId, 'knockdownsRecovered');
      if (event.type === 'ATTACK_MISSED' && event.actionId === 'wing_counter') addTelemetry(event.fighterId, 'failedCounters');
      if (event.type === 'DAMAGE') {
        addTelemetry(event.fighterId, (event.value ?? 0) >= 9 ? 'heavyHitsTaken' : 'lightHitsTaken');
        if (fighter?.tacticalMode === 'pressure' || fighter?.tacticalMode === 'all_in') addTelemetry(event.fighterId, 'damageTakenWhilePressing', event.value ?? 0);
        if (fighter?.state === 'retreating' || fighter?.engagement.phase === 'breaking') addTelemetry(event.fighterId, 'damageTakenWhileRetreating', event.value ?? 0);
        if (fighter?.state === 'advancing' || fighter?.tacticalMode === 'pressure') addTelemetry(event.fighterId, 'punishedChases');
        this.lastDamageTaken.set(event.fighterId, event.tick);
      }
      if (!['ATTACK_LANDED', 'COUNTER_LANDED', 'BLOCK'].includes(event.type) || !event.targetId) continue;
      const defender = this.state.fighters.find((f) => f.snapshot.fighterId === event.targetId);
      if (!defender) continue;
      const attackerId = event.fighterId;
      const defenderId = defender.snapshot.fighterId;
      const addExperience = (fighterId: string, category: keyof ReturnType<typeof emptyExperience>, amount: number) => {
        this.experienceGained.set(
          fighterId,
          gainExperience(this.experienceGained.get(fighterId) ?? emptyExperience(), category, amount),
        );
      };

      if (event.type === 'COUNTER_LANDED') { addExperience(attackerId, 'counter', 3); addTelemetry(attackerId, 'successfulCounters'); }
      else if (event.type === 'ATTACK_LANDED') addExperience(attackerId, 'offensive', 2);
      else {
        addExperience(attackerId, 'defensive', 2);
        addExperience(defenderId, 'pressure', 1);
      }
      if (fighter?.tacticalMode === 'pressure' || fighter?.state === 'advancing') addTelemetry(attackerId, 'successfulChases');
      if (event.tick - (this.lastDamageTaken.get(attackerId) ?? -1000) <= 90) addTelemetry(attackerId, 'retaliationDamageAfterHit', event.value ?? 0);
      const activeSignature = this.activeSignature.get(attackerId);
      if (activeSignature && event.tick - activeSignature.tick <= 90) {
        const successes = this.signatureSuccesses.get(attackerId) ?? {};
        successes[activeSignature.id] = (successes[activeSignature.id] ?? 0) + 1;
        this.signatureSuccesses.set(attackerId, successes);
        this.activeSignature.delete(attackerId);
      }
      this.log.push({ turn: Math.ceil(event.tick / TICKS_PER_STEP), attackerId: event.fighterId, defenderId: event.targetId,
        damage: event.value ?? 0, hitZone: null, isMiss: false, isCrit: false, isCounter: event.type === 'COUNTER_LANDED',
        isCritical: false, defenderHp: defender.health, stagger: event.type === 'BLOCK' ? 'light' : (event.value ?? 0) > 10 ? 'heavy' : 'medium',
        timestamp: event.tick * (1000 / 60), durationMs: 1000 / 60 });
    }
  }

  finalize(): CombatResult {
    const [a, b] = this.state.fighters;
    const engineResult = this.state.result;
    const winnerId = engineResult?.winnerId ?? (a.health >= b.health ? this.chickenA.id : this.chickenB.id);
    const loserId = winnerId === this.chickenA.id ? this.chickenB.id : this.chickenA.id;
    for (const [attacker, defender] of [[this.chickenA, b], [this.chickenB, a]] as const) {
      if (!this.log.some((entry) => entry.defenderId === defender.snapshot.fighterId)) this.log.push({
        turn: this.turn, attackerId: attacker.id, defenderId: defender.snapshot.fighterId, damage: 0, hitZone: null,
        isMiss: true, isCrit: false, isCounter: false, isCritical: false, defenderHp: defender.health, stagger: 'none', timestamp: this.state.tick * (1000 / 60),
      });
    }
    // A very short or defensive bout may not emit a qualifying combat event.
    // Completing a real fight still earns a small adaptation/recovery lesson.
    const ensureExperience = (fighterId: string) => {
      const gained = this.experienceGained.get(fighterId) ?? emptyExperience();
      return gainExperience(gained, 'adaptation', 1);
    };

    const careerDelta = (chicken: Chicken, opponent: Chicken, index: 0 | 1): CombatCareerFightDelta => {
      const fighter = this.state.fighters[index], other = this.state.fighters[1 - index];
      const won = winnerId === chicken.id;
      const telemetry = { ...(this.careerTelemetry.get(chicken.id) ?? {}) };
      telemetry[won ? 'fightsWon' : 'fightsLost'] = 1;
      const finalHealthRatio = fighter.health / fighter.snapshot.maxHealth;
      const opponentFinalHealthRatio = other.health / other.snapshot.maxHealth;
      if (won && (this.largestDeficit.get(chicken.id) ?? 0) >= .2) telemetry.comebackWins = 1;
      if (won && finalHealthRatio >= .7 && opponentFinalHealthRatio <= .3) telemetry.dominantWins = 1;
      if (!won && Math.abs(finalHealthRatio - opponentFinalHealthRatio) <= .12) telemetry.closeLosses = 1;
      if (this.state.tick >= this.state.config.maxTicks * .65) telemetry.lateFightPerformance = Math.max(0, (finalHealthRatio - opponentFinalHealthRatio) * 10 + (won ? 2 : 0));
      if (fighterStrength(opponent) > fighterStrength(chicken) * 1.08) telemetry.strongerOpponentsFaced = 1;
      if ((chicken.confidence ?? 50) < 30 && fighterStrength(opponent) > fighterStrength(chicken)) telemetry.timesIntimidated = 1;
      const signatureAttempts = { ...(this.signatureAttempts.get(chicken.id) ?? {}) };
      const signatureSuccesses = { ...(this.signatureSuccesses.get(chicken.id) ?? {}) };
      const evidence = (id: SignatureTechnique['id'], attempts: number, successes: number) => {
        signatureAttempts[id] = (signatureAttempts[id] ?? 0) + attempts;
        signatureSuccesses[id] = (signatureSuccesses[id] ?? 0) + successes;
      };
      evidence('relentless-rush', (telemetry.successfulChases ?? 0) + (telemetry.punishedChases ?? 0), telemetry.successfulChases ?? 0);
      evidence('sky-counter', (telemetry.successfulCounters ?? 0) + (telemetry.failedCounters ?? 0), telemetry.successfulCounters ?? 0);
      evidence('ghost-step', telemetry.successfulDisengagements ?? 0, Math.max(0, (telemetry.successfulDisengagements ?? 0) - (telemetry.damageTakenWhileRetreating ?? 0) / 10));
      evidence('second-wind', telemetry.lowStaminaClashesWon ?? 0, telemetry.lowStaminaClashesWon ?? 0);
      return { telemetry, opponentId: opponent.id, opponentName: opponent.name, opponentStrength: fighterStrength(opponent), ownStrength: fighterStrength(chicken), won, finalHealthRatio, opponentFinalHealthRatio,
        signatureAttempts, signatureSuccesses, awakeningTriggered: fighter.awakening?.type };
    };
    return { winnerId, loserId, log: this.log, totalTurns: this.turn,
      outcomeReason: engineResult?.finishReason === 'KO' ? 'ko' : 'timeout', injuredChickenId: null,
      experienceGained: {
        [this.chickenA.id]: ensureExperience(this.chickenA.id),
        [this.chickenB.id]: ensureExperience(this.chickenB.id),
      },
      combatCareerGained: {
        [this.chickenA.id]: careerDelta(this.chickenA, this.chickenB, 0),
        [this.chickenB.id]: careerDelta(this.chickenB, this.chickenA, 1),
      } };
  }
}
