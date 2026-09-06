import { generateRandomChicken } from "./chickenGenerator";
import { canBattle as canBattleStage } from "./growth";
import { MUTATION_POOL } from "./mutations";
import { resolvePhysicalProfile } from "./physicalProfile";
import { calculateStagger } from "./stagger";
import {
  GENETIC_STAT_KEYS,
  HIT_ZONES,
  type Chicken,
  type CombatLogEntry,
  type CombatRecord,
  type CombatResult,
  type FightingStyle,
  type GeneticStatKey,
  type HitZone,
} from "./types";

export type Rng = () => number;

export const MAX_TURNS = 300;
export const MAX_HEALTH = 100;
const FATIGUE_STAMINA_RATIO = 0.3;
const FATIGUE_DAMAGE_MULT = 0.8;
const MAX_CRIT_CHANCE = 0.25;
const CRIT_DAMAGE_MULT = 1.5;
const MAX_DEFENSE_REDUCTION = 0.4;
const MIN_DAMAGE = 0.5;
const CRITICAL_INJURY_BASE_CHANCE = 0.5;
const COUNTER_DAMAGE_MULT = 1.4;
const LEG_ZONES: readonly HitZone[] = ["left_leg", "right_leg"];
const WING_ZONES: readonly HitZone[] = ["left_wing", "right_wing"];

/** Product of every expressed mutation's modifier for this stat (spec item 6: mutation stat effects). */
function mutationStatMultiplier(chicken: Chicken, key: GeneticStatKey): number {
  let mult = 1;
  for (const def of MUTATION_POOL) {
    if (!chicken.mutations[def.id]?.expressed) continue;
    const modifier = def.statModifiers[key];
    if (modifier) mult *= 1 + modifier;
  }
  return mult;
}

/** IV is genetic ceiling, EV is trained investment — 60/40 weighting per the combat spec. */
export function effectiveStat(chicken: Chicken, key: GeneticStatKey): number {
  const base = chicken.iv[key] * 0.6 + chicken.ev[key] * 0.4;
  return base * mutationStatMultiplier(chicken, key);
}

/** Hens do not fight — only roosters enter combat, per the baseline mechanics spec. */
export function canFight(chicken: Chicken): boolean {
  return chicken.sex === "rooster" && canBattleStage(chicken.growthStage) && !chicken.injured;
}

export function healChicken(): { injured: false; health: number } {
  return { injured: false, health: MAX_HEALTH };
}

/** Body-size genetics add mass, which raises the HP pool a bird can soak up (spec: physique → combat). */
export function maxHealth(chicken: Chicken): number {
  const base = 50 + effectiveStat(chicken, "stamina") + effectiveStat(chicken, "defense") * 0.5;
  return base * resolvePhysicalProfile(chicken).mass;
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

/** Persistable field updates for one side of a resolved fight — shared by `/api/chickens/[id]/fight` and `/api/live/next` so both apply the same rules to an owned chicken. */
export type FightOutcomeUpdate = {
  record: CombatRecord;
  health: number;
  injured: boolean;
  status: Chicken["status"];
};

/** Computes the persisted record/health/injury/status delta for `chicken`'s side of `result`. Caller decides whether to award credits (only the fight-initiating route does). */
export function applyFightOutcome(chicken: Chicken, result: CombatResult): FightOutcomeUpdate {
  const won = result.winnerId === chicken.id;
  const wasInjured = result.injuredChickenId === chicken.id;
  const record = chicken.record;

  return {
    record: {
      ...record,
      wins: record.wins + (won ? 1 : 0),
      losses: record.losses + (won ? 0 : 1),
      koTko: record.koTko + (won && result.outcomeReason !== "timeout" ? 1 : 0),
      decisions: record.decisions + (result.outcomeReason === "timeout" ? 1 : 0),
    },
    health: finalHealthPercent(result, chicken),
    injured: wasInjured,
    status: wasInjured ? "injured" : chicken.status,
  };
}

/** Weighted so head/neck are rare relative to body/wings/legs (5/5/30/15/15/15/15). */
const HIT_ZONE_WEIGHTS: Record<HitZone, number> = {
  head: 5,
  neck: 5,
  body: 30,
  left_wing: 15,
  right_wing: 15,
  left_leg: 15,
  right_leg: 15,
};

export function rollHitZone(rng: Rng): HitZone {
  const totalWeight = HIT_ZONES.reduce((sum, zone) => sum + HIT_ZONE_WEIGHTS[zone], 0);
  let roll = rng() * totalWeight;
  for (const zone of HIT_ZONES) {
    roll -= HIT_ZONE_WEIGHTS[zone];
    if (roll < 0) return zone;
  }
  return HIT_ZONES[HIT_ZONES.length - 1];
}

const STYLE_FREQUENCY_WEIGHT: Record<FightingStyle, number> = {
  aggressive: 1.25,
  counter: 0.85,
  endurance: 0.9,
  balanced: 1.0,
};

const STYLE_STAMINA_COST_MULT: Record<FightingStyle, number> = {
  aggressive: 1.2,
  counter: 0.9,
  endurance: 0.75,
  balanced: 1.0,
};

const STYLE_DEFENSE_MULT: Record<FightingStyle, number> = {
  aggressive: 0.9,
  counter: 1.0,
  endurance: 1.0,
  balanced: 1.0,
};

function hasTrait(chicken: Chicken, id: string): boolean {
  return chicken.traits.some((trait) => trait.id === id);
}

function styleDamageMult(style: FightingStyle, turn: number): number {
  if (style === "aggressive") return 1.1;
  if (style === "endurance") return turn <= 15 ? 0.9 : 1.15;
  return 1.0;
}

function traitDamageMult(chicken: Chicken): number {
  let mult = 1.0;
  if (hasTrait(chicken, "heavy-striker")) mult *= 1.15;
  if (hasTrait(chicken, "glass-cannon")) mult *= 1.2;
  return mult;
}

function traitDefenseMult(chicken: Chicken): number {
  return hasTrait(chicken, "glass-cannon") ? 0.8 : 1.0;
}

function traitStaminaCostMult(chicken: Chicken): number {
  let mult = 1.0;
  if (hasTrait(chicken, "iron-stamina")) mult *= 0.8;
  if (hasTrait(chicken, "heavy-striker")) mult *= 1.15;
  return mult;
}

function counterChance(chicken: Chicken): number {
  let chance = 0;
  if (chicken.fightingStyle === "counter") chance += 0.6;
  if (hasTrait(chicken, "counter-fighter")) chance += 0.2;
  return chance;
}

type FighterState = {
  chicken: Chicken;
  hp: number;
  maxHp: number;
  stamina: number;
  wasHitLastTurn: boolean;
};

function makeFighterState(chicken: Chicken): FighterState {
  const hp = maxHealth(chicken);
  return { chicken, hp, maxHp: hp, stamina: 100, wasHitLastTurn: false };
}

/**
 * Runs a full fight to completion and returns the complete log — the client
 * never simulates, it only replays this. Deterministic for a given rng.
 */
export function simulateFight(
  chickenA: Chicken,
  chickenB: Chicken,
  rng: Rng = Math.random
): CombatResult {
  const stateA = makeFighterState(chickenA);
  const stateB = makeFighterState(chickenB);
  const log: CombatLogEntry[] = [];

  let turn = 0;
  let outcomeReason: CombatResult["outcomeReason"] = "timeout";
  let injuredChickenId: string | null = null;
  let winner: FighterState = stateA;
  let loser: FighterState = stateB;
  let fightOver = false;

  while (turn < MAX_TURNS && !fightOver) {
    turn += 1;

    const physicalA = resolvePhysicalProfile(stateA.chicken);
    const physicalB = resolvePhysicalProfile(stateB.chicken);

    const weightA =
      STYLE_FREQUENCY_WEIGHT[stateA.chicken.fightingStyle] *
      (effectiveStat(stateA.chicken, "speed") + effectiveStat(stateA.chicken, "agility") + 1) *
      physicalA.mobility;
    const weightB =
      STYLE_FREQUENCY_WEIGHT[stateB.chicken.fightingStyle] *
      (effectiveStat(stateB.chicken, "speed") + effectiveStat(stateB.chicken, "agility") + 1) *
      physicalB.mobility;

    const attacker = rng() < weightA / (weightA + weightB) ? stateA : stateB;
    const defender = attacker === stateA ? stateB : stateA;
    const attackerPhysical = attacker === stateA ? physicalA : physicalB;
    const defenderPhysical = defender === stateA ? physicalA : physicalB;

    const attackerAccuracy = effectiveStat(attacker.chicken, "accuracy") * attackerPhysical.reach;
    const defenderAgility = effectiveStat(defender.chicken, "agility") * defenderPhysical.mobility;
    let missChance = Math.max(0, ((defenderAgility - attackerAccuracy) / 100) * 0.15);
    if (hasTrait(attacker.chicken, "calm")) missChance *= 0.7;
    const isMiss = rng() < missChance;

    let damage = 0;
    let isCrit = false;
    let isCounter = false;
    let isCritical = false;
    let hitZone: HitZone | null = null;

    if (!isMiss) {
      hitZone = rollHitZone(rng);

      const attackerPower = effectiveStat(attacker.chicken, "power");
      let baseDamage = 10 + attackerPower / 10;
      if (hasTrait(attacker.chicken, "quick-starter") && turn <= 5) baseDamage *= 1.15;
      const variance = baseDamage * 0.2 * (rng() - 0.5) * 2;

      const critChance = Math.min(attackerAccuracy / 400, MAX_CRIT_CHANCE);
      isCrit = rng() < critChance;
      const critMult = isCrit ? CRIT_DAMAGE_MULT : 1.0;

      const fatigueMult =
        attacker.stamina < 100 * FATIGUE_STAMINA_RATIO ? FATIGUE_DAMAGE_MULT : 1.0;

      const defenderDefense =
        effectiveStat(defender.chicken, "defense") *
        STYLE_DEFENSE_MULT[defender.chicken.fightingStyle] *
        traitDefenseMult(defender.chicken) *
        defenderPhysical.stability;
      const defenseReduction = Math.min(defenderDefense / 250, MAX_DEFENSE_REDUCTION);

      if (counterChance(attacker.chicken) > 0 && attacker.wasHitLastTurn && rng() < counterChance(attacker.chicken)) {
        isCounter = true;
      }
      const counterMult = isCounter ? COUNTER_DAMAGE_MULT : 1.0;

      const styleMult = styleDamageMult(attacker.chicken.fightingStyle, turn);
      const traitMult = traitDamageMult(attacker.chicken);

      /** Thick-legged kickers hit harder on leg zones; good wing control shields against wing hits. */
      const zonePhysicalMult = LEG_ZONES.includes(hitZone as HitZone)
        ? attackerPhysical.kickPower
        : WING_ZONES.includes(hitZone as HitZone)
          ? 1 / defenderPhysical.wingControl
          : 1;

      damage = Math.max(
        MIN_DAMAGE,
        (baseDamage + variance) * critMult * fatigueMult * counterMult * styleMult * traitMult *
          zonePhysicalMult * (1 - defenseReduction)
      );

      if (isCrit && (hitZone === "head" || hitZone === "neck")) {
        let injuryChance = CRITICAL_INJURY_BASE_CHANCE;
        if (hasTrait(defender.chicken, "survivor")) injuryChance *= 0.5;
        if (rng() < injuryChance) {
          isCritical = true;
        }
      }

      defender.hp = Math.max(0, defender.hp - damage);
    }

    const staminaCost =
      10 * STYLE_STAMINA_COST_MULT[attacker.chicken.fightingStyle] * traitStaminaCostMult(attacker.chicken);
    attacker.stamina = Math.max(0, attacker.stamina - staminaCost);

    defender.wasHitLastTurn = !isMiss;
    attacker.wasHitLastTurn = false;

    const stagger = calculateStagger({
      damage,
      defenderMaxHp: defender.maxHp,
      hitZone,
      isMiss,
      isCrit,
      isCounter,
      isCritical,
      defenderStability: defenderPhysical.stability,
      defenderMass: defenderPhysical.mass,
      defenderStaminaRatio: defender.stamina / 100,
      defenderAgility: effectiveStat(defender.chicken, "agility"),
    });

    log.push({
      turn,
      attackerId: attacker.chicken.id,
      defenderId: defender.chicken.id,
      damage: Number(damage.toFixed(1)),
      hitZone,
      isMiss,
      isCrit,
      isCounter,
      isCritical,
      defenderHp: Number(defender.hp.toFixed(1)),
      stagger,
      timestamp: Date.now(),
    });

    if (isCritical) {
      fightOver = true;
      outcomeReason = "critical_injury";
      injuredChickenId = defender.chicken.id;
      winner = attacker;
      loser = defender;
    } else if (defender.hp <= 0) {
      fightOver = true;
      outcomeReason = "ko";
      winner = attacker;
      loser = defender;
    }
  }

  if (!fightOver) {
    outcomeReason = "timeout";
    if (stateA.hp === stateB.hp) {
      const totalA = effectiveStat(stateA.chicken, "power") + effectiveStat(stateA.chicken, "stamina");
      const totalB = effectiveStat(stateB.chicken, "power") + effectiveStat(stateB.chicken, "stamina");
      winner = totalB > totalA ? stateB : stateA;
      loser = winner === stateA ? stateB : stateA;
    } else {
      winner = stateA.hp > stateB.hp ? stateA : stateB;
      loser = winner === stateA ? stateB : stateA;
    }
  }

  return {
    winnerId: winner.chicken.id,
    loserId: loser.chicken.id,
    log,
    totalTurns: turn,
    outcomeReason,
    injuredChickenId,
  };
}

const MATCH_TOLERANCE = 0.2; // ±20% of the player chicken's total effective stats
const MATCH_ATTEMPTS = 20;

function totalEffectiveStats(chicken: Chicken): number {
  return GENETIC_STAT_KEYS.reduce((sum, key) => sum + effectiveStat(chicken, key), 0);
}

/**
 * Generates an NPC opponent, not persisted, roughly matched to `playerChicken`'s
 * total effective stats. Tries several random candidates for one inside the
 * tolerance band; falls back to the closest candidate seen if none land in it.
 */
export function generateMatchedOpponent(
  playerChicken: Chicken,
  generator: () => Chicken = () => generateRandomChicken({ sex: "rooster" })
): Chicken {
  const targetTotal = totalEffectiveStats(playerChicken);
  const minTotal = targetTotal * (1 - MATCH_TOLERANCE);
  const maxTotal = targetTotal * (1 + MATCH_TOLERANCE);

  let closest: Chicken | null = null;
  let closestDiff = Infinity;

  for (let i = 0; i < MATCH_ATTEMPTS; i++) {
    const candidate = generator();
    const candidateTotal = totalEffectiveStats(candidate);

    if (candidateTotal >= minTotal && candidateTotal <= maxTotal) {
      return candidate;
    }

    const diff = Math.abs(candidateTotal - targetTotal);
    if (diff < closestDiff) {
      closest = candidate;
      closestDiff = diff;
    }
  }

  return closest ?? generator();
}
