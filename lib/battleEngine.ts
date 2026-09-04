import { getStatTotal } from "./roosterGenerator";
import type { BattleLogEntry, BattleResult, Rooster } from "./types";

const MAX_TURNS = 300;
const FATIGUE_HP_RATIO = 0.3;
const FATIGUE_DAMAGE_MULT = 0.8;
const CRIT_DAMAGE_MULT = 1.5;
const MAX_CRIT_CHANCE = 0.25;
const MAX_DEFENSE_REDUCTION = 0.4;
const MIN_DAMAGE = 0.5;

/**
 * Pure turn-based battle simulator. No UI coupling, no side effects beyond
 * its own internal state — safe to drive from a `setInterval`/`requestAnimationFrame`
 * loop one turn at a time.
 */
export default class BattleEngine {
  private r1: Rooster;
  private r2: Rooster;
  private turnCount = 0;
  private logs: BattleLogEntry[] = [];
  private active = true;
  private winnerRooster: Rooster | null = null;
  private cachedResult: BattleResult | null = null;
  private readonly firstAttackerIsR1: boolean;

  constructor(rooster1: Rooster, rooster2: Rooster) {
    this.r1 = { ...rooster1, hp: rooster1.maxHp, fatigued: false };
    this.r2 = { ...rooster2, hp: rooster2.maxHp, fatigued: false };

    if (this.r1.aggression === this.r2.aggression) {
      this.firstAttackerIsR1 = Math.random() > 0.5;
    } else {
      this.firstAttackerIsR1 = this.r1.aggression > this.r2.aggression;
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  get winner(): Rooster | null {
    return this.winnerRooster;
  }

  get turn(): number {
    return this.turnCount;
  }

  get maxTurns(): number {
    return MAX_TURNS;
  }

  getAllLogs(): BattleLogEntry[] {
    return [...this.logs];
  }

  getRoosters(): { r1: Rooster; r2: Rooster } {
    return { r1: { ...this.r1 }, r2: { ...this.r2 } };
  }

  getResult(): BattleResult | null {
    return this.cachedResult;
  }

  executeNextTurn(): BattleLogEntry | null {
    if (!this.active) return null;

    this.turnCount += 1;
    const attackerIsR1 =
      this.turnCount % 2 === 1 ? this.firstAttackerIsR1 : !this.firstAttackerIsR1;
    const attacker = attackerIsR1 ? this.r1 : this.r2;
    const defender = attackerIsR1 ? this.r2 : this.r1;

    const baseDamage = 10 + attacker.damage / 10;
    const variance = baseDamage * 0.2 * (Math.random() - 0.5) * 2;
    const missChance = Math.max(0, ((defender.speed - attacker.speed) / 100) * 0.15);
    const isMiss = Math.random() < missChance;

    let damage = 0;
    let isCrit = false;

    if (!isMiss) {
      const critChance = Math.min(attacker.luck / 400, MAX_CRIT_CHANCE);
      isCrit = Math.random() < critChance;
      const critMult = isCrit ? CRIT_DAMAGE_MULT : 1.0;
      const fatigueMult =
        attacker.hp < attacker.maxHp * FATIGUE_HP_RATIO ? FATIGUE_DAMAGE_MULT : 1.0;
      const defenseReduction = Math.min(defender.defense / 250, MAX_DEFENSE_REDUCTION);

      damage = Math.max(
        MIN_DAMAGE,
        (baseDamage + variance) * critMult * fatigueMult * (1 - defenseReduction)
      );
    }

    const wasFatigued = defender.fatigued;
    defender.hp = Math.max(0, defender.hp - damage);
    defender.fatigued = defender.hp < defender.maxHp * FATIGUE_HP_RATIO;
    const isFatigueTriggered = !wasFatigued && defender.fatigued;

    const logEntry: BattleLogEntry = {
      turn: this.turnCount,
      attacker: attacker.name,
      defender: defender.name,
      attackerId: attacker.id,
      defenderId: defender.id,
      damage: Number(damage.toFixed(1)),
      defenderHp: Number(defender.hp.toFixed(1)),
      isMiss,
      isCrit,
      isFatigueTriggered,
      timestamp: Date.now(),
    };
    this.logs.push(logEntry);

    if (defender.hp <= 0) {
      this.finishBattle(attacker, defender, "ko");
    } else if (this.turnCount >= MAX_TURNS) {
      this.finishBattle(...this.resolveTimeoutOutcome(), "timeout");
    }

    return logEntry;
  }

  /** Higher remaining HP wins on timeout; ties break on total stat points, then r1. */
  private resolveTimeoutOutcome(): [Rooster, Rooster] {
    if (this.r1.hp > this.r2.hp) return [this.r1, this.r2];
    if (this.r2.hp > this.r1.hp) return [this.r2, this.r1];
    return getStatTotal(this.r2) > getStatTotal(this.r1) ? [this.r2, this.r1] : [this.r1, this.r2];
  }

  private finishBattle(winner: Rooster, loser: Rooster, outcomeReason: "ko" | "timeout"): void {
    this.active = false;
    this.winnerRooster = winner;
    this.cachedResult = {
      winner: { ...winner },
      loser: { ...loser },
      logs: [...this.logs],
      totalTurns: this.turnCount,
      r1FinalHp: Number(Math.max(0, this.r1.hp).toFixed(1)),
      r2FinalHp: Number(Math.max(0, this.r2.hp).toFixed(1)),
      outcomeReason,
    };
  }
}
