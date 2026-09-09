import { createMatch, stepCombat } from './engine';
import { COMBAT_VERSION } from './constants';
import { toCombatV2Snapshot } from '../combatV2Snapshot';
import type { PlayerCommand } from '../combat/command';
import type { Chicken, CombatLogEntry, CombatResult } from '../types';
import type { TacticalMode } from './types';

/** Server-authoritative, steppable wrapper around the continuous V2 engine. */
export const MAX_TURNS = 300;
const TICKS_PER_STEP = 60;

function commandMode(command: PlayerCommand | null | undefined): TacticalMode | null {
  if (command === 'PRESS') return 'pressure';
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

  constructor(chickenA: Chicken, chickenB: Chicken, matchSeed = Math.floor(Math.random() * 0x1_0000_0000) >>> 0) {
    this.chickenA = chickenA;
    this.chickenB = chickenB;
    this.state = createMatch({ id: `live-${matchSeed.toString(36)}`, version: COMBAT_VERSION, seed: matchSeed,
      fighterA: toCombatV2Snapshot(chickenA, 'player-a'), fighterB: toCombatV2Snapshot(chickenB, 'player-b'),
      arena: { radius: 8 }, maxTicks: 60 * 90 });
  }

  snapshotA() { return this.snapshot(0); }
  snapshotB() { return this.snapshot(1); }
  private snapshot(index: 0 | 1) {
    const f = this.state.fighters[index];
    return { hp: f.health, maxHp: f.snapshot.maxHealth, stamina: f.stamina, maxStamina: 100, momentum: f.balance,
      mentalState: f.state, commandPoints: 3, pendingCommand: null as PlayerCommand | null };
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
      if (!['ATTACK_LANDED', 'COUNTER_LANDED', 'BLOCK'].includes(event.type) || !event.targetId) continue;
      const defender = this.state.fighters.find((f) => f.snapshot.fighterId === event.targetId);
      if (!defender) continue;
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
    return { winnerId, loserId, log: this.log, totalTurns: this.turn,
      outcomeReason: engineResult?.finishReason === 'KO' ? 'ko' : 'timeout', injuredChickenId: null };
  }
}
