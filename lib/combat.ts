import { battleAftermath } from "./combat/aftermath";
import { evaluateBattleTraits } from "./combat/battleTraits";
import { deriveBehaviorProfile, driftBehaviorProfile } from "./combat/behavior";
import { rollHitZone } from "./combat/resolution";
import { simulateBattle, MAX_TURNS as SIM_MAX_TURNS } from "./combat/simulator";
import { MAX_HEALTH as STATE_MAX_HEALTH } from "./combat/state";
import { effectiveStat, maxHealth } from "./combat/stats";
import { canBattle as canBattleStage } from "./growth";
import type {
  BehavioralProfile,
  Chicken,
  CombatExperience,
  CombatRecord,
  CombatResult,
  InjuryRecord,
  Trait,
} from "./types";

export type Rng = () => number;

export const MAX_TURNS = SIM_MAX_TURNS;
export const MAX_HEALTH = STATE_MAX_HEALTH;

export { effectiveStat, maxHealth, rollHitZone };
export { generateMatchedOpponent } from "./combat/matchmaking";
export { generatePveOpponent, PVE_ENCOUNTERS } from "./combat/pveEncounters";
export type { PveEncounterDefinition, PveEncounterId } from "./combat/pveEncounters";

/** Hens do not fight — only roosters enter combat, per the baseline mechanics spec. */
export function canFight(chicken: Chicken): boolean {
  return chicken.sex === "rooster" && canBattleStage(chicken.growthStage) && !chicken.injured;
}

export function healChicken(): { injured: false; health: number } {
  return { injured: false, health: MAX_HEALTH };
}

/** The chicken's remaining HP at the end of a fight, scaled to the 0–100 `Chicken.health` range. */
export function finalHealthPercent(result: CombatResult, chicken: Chicken): number {
  const max = maxHealth(chicken);
  for (let i = result.log.length - 1; i >= 0; i--) {
    const entry = result.log[i];
    if (entry.defenderId === chicken.id) {
      return Math.round(Math.max(0, Math.min(100, (entry.defenderHp / max) * 100)));
    }
  }
  return 100;
}

/**
 * Runs a full fight to completion and returns the complete log — the client
 * never simulates, it only replays this. Deterministic for a given rng.
 * Delegates to the V2 turn-based simulator (lib/combat/simulator.ts); the
 * exported CombatResult shape is unchanged (with additive optional fields)
 * so every existing caller keeps working.
 */
export function simulateFight(chickenA: Chicken, chickenB: Chicken, rng: Rng = Math.random): CombatResult {
  return simulateBattle(chickenA, chickenB, rng);
}

/** Persistable field updates for one side of a resolved fight — shared by `/api/chickens/[id]/fight` and `/api/live/next` so both apply the same rules to an owned chicken. */
export type FightOutcomeUpdate = {
  record: CombatRecord;
  health: number;
  injured: boolean;
  status: Chicken["status"];
  behavior: BehavioralProfile;
  experience: CombatExperience;
  condition: number;
  injuries: InjuryRecord[];
  confidence: number;
  morale: number;
  stress: number;
  battleHardening: number;
  traits: Trait[];
  /** Traits newly earned by this fight (spec §43-44) — subset of `traits`, empty on most fights. */
  newTraits: Trait[];
};

/**
 * Computes the persisted record/health/injury/status delta for `chicken`'s
 * side of `result`, plus the V2 layer's experience/behavior-drift/condition/
 * injury deltas (spec §19, §16, §28, §27). Caller decides whether to award
 * credits (only the fight-initiating route does).
 */
export function applyFightOutcome(chicken: Chicken, result: CombatResult): FightOutcomeUpdate {
  const won = result.winnerId === chicken.id;
  const wasInjured = result.injuredChickenId === chicken.id;
  const record = chicken.record;

  const gained = result.experienceGained?.[chicken.id];
  const experience: CombatExperience = gained
    ? {
        offensive: (chicken.experience?.offensive ?? 0) + gained.offensive,
        defensive: (chicken.experience?.defensive ?? 0) + gained.defensive,
        evasion: (chicken.experience?.evasion ?? 0) + gained.evasion,
        counter: (chicken.experience?.counter ?? 0) + gained.counter,
        pressure: (chicken.experience?.pressure ?? 0) + gained.pressure,
        recovery: (chicken.experience?.recovery ?? 0) + gained.recovery,
        adaptation: (chicken.experience?.adaptation ?? 0) + gained.adaptation,
      }
    : chicken.experience ?? {
        offensive: 0,
        defensive: 0,
        evasion: 0,
        counter: 0,
        pressure: 0,
        recovery: 0,
        adaptation: 0,
      };

  const baseBehavior = chicken.behavior ?? deriveBehaviorProfile(chicken.fightingStyle, chicken.traits);
  const behavior = driftBehaviorProfile(baseBehavior, experience);
  const conditionDelta = result.conditionDelta?.[chicken.id] ?? 0;
  const condition = Math.max(0, Math.min(100, (chicken.condition ?? 100) + conditionDelta));
  const newInjuries = result.newInjuries?.[chicken.id] ?? [];
  const injuries = [...(chicken.injuries ?? []), ...newInjuries];
  const aftermath = battleAftermath(chicken, result, chicken.id, wasInjured, newInjuries);
  const earnedTraits = evaluateBattleTraits(chicken, aftermath, injuries);
  const traits = earnedTraits.length ? [...chicken.traits, ...earnedTraits] : chicken.traits;

  return {
    record: {
      ...record,
      wins: record.wins + (won ? 1 : 0),
      losses: record.losses + (won ? 0 : 1),
      koTko: record.koTko + (won && result.outcomeReason !== "timeout" ? 1 : 0),
      decisions: record.decisions + (result.outcomeReason === "timeout" ? 1 : 0),
    },
    health: finalHealthPercent(result, chicken),
    injured: wasInjured || injuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
    status: wasInjured ? "injured" : chicken.status,
    behavior,
    experience,
    condition,
    injuries,
    confidence: aftermath.confidence,
    morale: aftermath.morale,
    stress: aftermath.stress,
    battleHardening: aftermath.battleHardening,
    traits,
    newTraits: earnedTraits,
  };
}

