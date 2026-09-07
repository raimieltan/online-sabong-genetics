import { ACTION_DEFINITIONS } from "./actions";
import { adaptationCounterBonus, experienceConfidenceBonus } from "./experience";
import { fatigueAccuracyPenalty, fatigueDecisionPenalty, fatigueStatMultiplier } from "./fatigue";
import { rollCriticalInjury } from "./injuries";
import { momentumDelta, type MomentumEvent } from "./momentum";
import { clampPosition, shiftDistance } from "./positioning";
import { derivedAccuracy, effectiveStat } from "./stats";
import type { CombatantState } from "./state";
import { calculateStagger } from "../stagger";
import type { PhysicalProfile } from "../physicalProfile";
import type { CombatAction, HitZone, StaggerLevel } from "../types";

export type Rng = () => number;

const MAX_CRIT_CHANCE = 0.25;
const CRIT_DAMAGE_MULT = 1.5;
const MAX_DEFENSE_REDUCTION = 0.4;
const MIN_DAMAGE = 0.5;
/** When both fighters commit to offense, the initiative loser still lands their swing, but at reduced potency — they were caught a beat behind. */
const TRADE_RETURN_POTENCY = 0.6;
const LEG_ZONES: readonly HitZone[] = ["left_leg", "right_leg"];
const WING_ZONES: readonly HitZone[] = ["left_wing", "right_wing"];

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

const HIT_ZONES_ORDER: readonly HitZone[] = ["head", "neck", "body", "left_wing", "right_wing", "left_leg", "right_leg"];

export function rollHitZone(rng: Rng): HitZone {
  const totalWeight = HIT_ZONES_ORDER.reduce((sum, zone) => sum + HIT_ZONE_WEIGHTS[zone], 0);
  let roll = rng() * totalWeight;
  for (const zone of HIT_ZONES_ORDER) {
    roll -= HIT_ZONE_WEIGHTS[zone];
    if (roll < 0) return zone;
  }
  return HIT_ZONES_ORDER[HIT_ZONES_ORDER.length - 1];
}

function hasTrait(chicken: CombatantState["chicken"], id: string): boolean {
  return chicken.traits.some((t) => t.id === id);
}

function traitDamageMult(chicken: CombatantState["chicken"]): number {
  let mult = 1.0;
  if (hasTrait(chicken, "heavy-striker")) mult *= 1.15;
  if (hasTrait(chicken, "glass-cannon")) mult *= 1.2;
  return mult;
}

function traitDefenseMult(chicken: CombatantState["chicken"]): number {
  return hasTrait(chicken, "glass-cannon") ? 0.8 : 1.0;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function staggerLevelToTurns(level: StaggerLevel): number {
  if (level === "knockdown") return 2;
  if (level === "heavy" || level === "medium" || level === "stumble") return 1;
  return 0;
}

function isOffensive(action: CombatAction): boolean {
  return action === "LIGHT_ATTACK" || action === "HEAVY_ATTACK" || action === "PRESSURE";
}

/**
 * AGI/SPD/distance/position/opponent-commitment/fatigue/experience/behavior/
 * randomness all feed the evade roll (spec §12 EVADE) — a successful dodge is
 * never a coinflip on AGI alone.
 */
function computeEvadeChance(
  defender: CombatantState,
  defenderPhysical: PhysicalProfile,
  attackerAction: CombatAction
): number {
  const agi = effectiveStat(defender.chicken, "agility") * defenderPhysical.mobility * fatigueStatMultiplier(defender.fatigue);
  const spd = effectiveStat(defender.chicken, "speed") * fatigueStatMultiplier(defender.fatigue);
  const commitment = ACTION_DEFINITIONS[attackerAction].commitment;

  let chance = 0.15 + (agi + spd) / 500 + commitment * 0.25;
  chance += (defender.experience.evasion / 500) * 0.15;
  chance += defender.behavior.caution * 0.05;
  if (defender.distance === "FAR") chance += 0.1;
  if (defender.position > 0) chance += 0.05 * defender.position;
  chance -= fatigueDecisionPenalty(defender.fatigue);

  return clamp01(chance);
}

/** Counters punish commitment, not randomness — strongest vs heavy/predictable attacks (spec §12 COUNTER). */
function computeCounterChance(defender: CombatantState, attackerAction: CombatAction): number {
  const def = ACTION_DEFINITIONS[attackerAction];
  let chance = defender.behavior.counterPreference * 0.3 + (defender.experience.counter / 500) * 0.25 + def.commitment * 0.3;
  chance += adaptationCounterBonus(defender.opponentModel, defender.experience.adaptation);
  return clamp01(chance);
}

export type HitOutcome = {
  isMiss: boolean;
  hitZone: HitZone | null;
  damage: number;
  isCrit: boolean;
  isCritical: boolean;
  stagger: StaggerLevel;
};

/** Resolves `action` from `attacker` landing (or not) on `defender`, with an optional multiplier for reactive vulnerability/mitigation (guard reduces, recover/whiffed-counter increases). */
function resolveHit(params: {
  attacker: CombatantState;
  defender: CombatantState;
  action: CombatAction;
  attackerPhysical: PhysicalProfile;
  defenderPhysical: PhysicalProfile;
  vulnerabilityMult: number;
  forceMiss: boolean;
  rng: Rng;
}): HitOutcome {
  const { attacker, defender, action, attackerPhysical, defenderPhysical, vulnerabilityMult, forceMiss, rng } = params;
  const def = ACTION_DEFINITIONS[action];

  const baseAccuracy = effectiveStat(attacker.chicken, "accuracy") * attackerPhysical.reach;
  const accuracy = derivedAccuracy({
    baseAccuracy,
    experienceBonus: experienceConfidenceBonus(attacker.experience),
    confidenceBonus: (attacker.momentum / 100) * 5,
    fatiguePenalty: fatigueAccuracyPenalty(attacker.fatigue),
    injuryPenalty: (attacker.chicken.injuries?.length ?? 0) * 2,
    positionalAdvantage: attacker.position > 0 ? attacker.position * 3 : 0,
  });

  const defenderAgility = effectiveStat(defender.chicken, "agility") * defenderPhysical.mobility * fatigueStatMultiplier(defender.fatigue);
  let missChance = forceMiss ? 1 : Math.max(0, ((defenderAgility - accuracy) / 100) * 0.15);
  if (hasTrait(attacker.chicken, "calm")) missChance *= 0.7;
  const isMiss = rng() < missChance;

  if (isMiss) {
    return { isMiss: true, hitZone: null, damage: 0, isCrit: false, isCritical: false, stagger: "none" };
  }

  const hitZone = rollHitZone(rng);
  const power = effectiveStat(attacker.chicken, "power") * fatigueStatMultiplier(attacker.fatigue);
  let baseDamage = (10 + power / 10) * def.damagePotential;
  if (hasTrait(attacker.chicken, "quick-starter") && attacker.stamina === attacker.maxStamina) baseDamage *= 1.05;
  const variance = baseDamage * 0.2 * (rng() - 0.5) * 2;

  const critChance = Math.min(accuracy / 400, MAX_CRIT_CHANCE);
  const isCrit = rng() < critChance;
  const critMult = isCrit ? CRIT_DAMAGE_MULT : 1.0;

  const defenderDefense =
    effectiveStat(defender.chicken, "defense") * defenderPhysical.stability * fatigueStatMultiplier(defender.fatigue) * traitDefenseMult(defender.chicken);
  const defenseReduction = Math.min(defenderDefense / 250, MAX_DEFENSE_REDUCTION);

  const traitMult = traitDamageMult(attacker.chicken);
  const zonePhysicalMult = LEG_ZONES.includes(hitZone)
    ? attackerPhysical.kickPower
    : WING_ZONES.includes(hitZone)
      ? 1 / defenderPhysical.wingControl
      : 1;

  const damage = Math.max(
    MIN_DAMAGE,
    (baseDamage + variance) * critMult * traitMult * zonePhysicalMult * vulnerabilityMult * (1 - defenseReduction)
  );

  const isCritical = rollCriticalInjury({
    rng,
    isCrit,
    hitZone,
    hasSurvivorTrait: hasTrait(defender.chicken, "survivor"),
    defenderFatigue: defender.fatigue,
  });

  const stagger = isCritical
    ? "knockdown"
    : calculateStagger({
        damage,
        defenderMaxHp: defender.maxHp,
        hitZone,
        isMiss: false,
        isCrit,
        isCounter: def.id === "COUNTER",
        isCritical,
        defenderStability: defenderPhysical.stability,
        defenderMass: defenderPhysical.mass,
        defenderStaminaRatio: Math.min(defender.stamina / 100, 1 - defender.fatigue / 100),
        defenderAgility: effectiveStat(defender.chicken, "agility"),
      });

  return { isMiss: false, hitZone, damage, isCrit, isCritical, stagger };
}

export type ExchangeOutcome = {
  attackerId: string;
  defenderId: string;
  attackerAction: CombatAction;
  defenderAction: CombatAction;
  hit: HitOutcome;
  isCounterSwitch: boolean;
  /**
   * Present only when both fighters committed to offensive actions this turn:
   * the initiative loser's own attack still connects (spec §13 "exchange"),
   * resolved second and at reduced potency. Without this a fast fighter that
   * always wins initiative shuts a slower opponent out of the fight entirely.
   */
  returnExchange?: {
    attackerId: string;
    defenderId: string;
    attackerAction: CombatAction;
    defenderAction: CombatAction;
    hit: HitOutcome;
  };
};

/**
 * Resolves one turn's exchange between two fighters who have each already
 * picked an action (spec §13 steps 6-12). Mutates both CombatantStates in
 * place (hp/stamina/fatigue/momentum/position/distance/stagger/recovery/
 * opponentModel) and returns enough detail for the simulator to build one
 * CombatLogEntry and apply experience gain.
 */
export function resolveExchange(params: {
  first: CombatantState;
  firstAction: CombatAction;
  second: CombatantState;
  secondAction: CombatAction;
  firstPhysical: PhysicalProfile;
  secondPhysical: PhysicalProfile;
  rng: Rng;
}): ExchangeOutcome {
  const { first, firstAction, second, secondAction, firstPhysical, secondPhysical, rng } = params;

  let attacker = first;
  let attackerAction = firstAction;
  let attackerPhysical = firstPhysical;
  let defender = second;
  let defenderAction = secondAction;
  let defenderPhysical = secondPhysical;

  // Whoever has initiative acts; if they held back while the other committed
  // to an attack, the offensive fighter becomes the one resolved this turn.
  if (!isOffensive(attackerAction) && isOffensive(defenderAction)) {
    [attacker, defender] = [defender, attacker];
    [attackerAction, defenderAction] = [defenderAction, attackerAction];
    [attackerPhysical, defenderPhysical] = [defenderPhysical, attackerPhysical];
  }

  let vulnerabilityMult = 1;
  let forceMiss = false;
  let isCounterSwitch = false;
  let evadedByDefender = false;
  let guardedByDefender = false;
  let counteredByDefender = false;

  if (isOffensive(attackerAction)) {
    if (defenderAction === "EVADE") {
      if (rng() < computeEvadeChance(defender, defenderPhysical, attackerAction)) {
        forceMiss = true;
        evadedByDefender = true;
      }
    } else if (defenderAction === "REPOSITION") {
      if (rng() < computeEvadeChance(defender, defenderPhysical, attackerAction) * 0.5) {
        forceMiss = true;
        evadedByDefender = true;
      }
    } else if (defenderAction === "GUARD") {
      vulnerabilityMult = 0.55;
      guardedByDefender = true;
    } else if (defenderAction === "RECOVER") {
      vulnerabilityMult = 1.15;
    } else if (defenderAction === "COUNTER") {
      if (rng() < computeCounterChance(defender, attackerAction)) {
        // Roles flip: the would-be defender punishes the committed attacker.
        isCounterSwitch = true;
        counteredByDefender = true;
        [attacker, defender] = [defender, attacker];
        [attackerAction, defenderAction] = ["COUNTER", attackerAction];
        [attackerPhysical, defenderPhysical] = [defenderPhysical, attackerPhysical];
      } else {
        vulnerabilityMult = 1.2; // committed to a counter and got caught mid-read
      }
    }
    // else: defender also chose an offensive action but lost initiative — resolves as a plain hit.
  } else {
    // Neither fighter committed to offense this turn (both reactive) — a quiet turn, no damage.
    forceMiss = true;
  }

  const hit = resolveHit({ attacker, defender, action: attackerAction, attackerPhysical, defenderPhysical, vulnerabilityMult, forceMiss, rng });

  if (!hit.isMiss) {
    defender.hp = Math.max(0, defender.hp - hit.damage);
    defender.staggerTurns = Math.max(defender.staggerTurns, staggerLevelToTurns(hit.stagger));
  }

  const attackerDef = ACTION_DEFINITIONS[attackerAction];
  const defenderDef = ACTION_DEFINITIONS[defenderAction];

  attacker.stamina = Math.max(0, Math.min(attacker.maxStamina, attacker.stamina - attackerDef.staminaCost));
  defender.stamina = Math.max(0, Math.min(defender.maxStamina, defender.stamina - defenderDef.staminaCost));

  if (attackerDef.recovery > 0) attacker.recoveryTurns = Math.max(attacker.recoveryTurns, attackerDef.recovery);
  if (defenderDef.recovery > 0 && defenderAction !== attackerAction) {
    defender.recoveryTurns = Math.max(defender.recoveryTurns, defenderDef.recovery);
  }

  attacker.position = clampPosition(attacker.position + (hit.isMiss ? -attackerDef.positionalEffect * 0.5 : attackerDef.positionalEffect));
  defender.position = clampPosition(defender.position - (hit.isMiss ? -attackerDef.positionalEffect * 0.5 : attackerDef.positionalEffect));
  attacker.distance = shiftDistance(attacker.distance, attackerDef.positionalEffect);
  defender.distance = attacker.distance;

  const attackerEvent: MomentumEvent = {
    landedHit: !hit.isMiss,
    wasEvaded: hit.isMiss && evadedByDefender,
    wasGuarded: guardedByDefender,
    wasCountered: isCounterSwitch === false && counteredByDefender,
    didCounter: isCounterSwitch,
    causedStagger: hit.stagger !== "none",
    gainedPosition: attacker.position > 0,
    opponentFatigued: defender.fatigue >= 50,
  };
  attacker.momentum = Math.max(-100, Math.min(100, attacker.momentum + momentumDelta(attackerEvent)));
  defender.momentum = Math.max(-100, Math.min(100, defender.momentum - momentumDelta(attackerEvent) * 0.6));

  // Both fighters swung: the one who lost initiative still gets their attack in,
  // resolved second, unless the first hit already dropped or rocked them.
  let returnExchange: ExchangeOutcome["returnExchange"];
  if (
    !isCounterSwitch &&
    isOffensive(attackerAction) &&
    isOffensive(defenderAction) &&
    defender.hp > 0 &&
    !hit.isCritical &&
    staggerLevelToTurns(hit.stagger) === 0
  ) {
    const returnHit = resolveHit({
      attacker: defender,
      defender: attacker,
      action: defenderAction,
      attackerPhysical: defenderPhysical,
      defenderPhysical: attackerPhysical,
      vulnerabilityMult: TRADE_RETURN_POTENCY,
      forceMiss: false,
      rng,
    });
    if (!returnHit.isMiss) {
      attacker.hp = Math.max(0, attacker.hp - returnHit.damage);
      attacker.staggerTurns = Math.max(attacker.staggerTurns, staggerLevelToTurns(returnHit.stagger));
      defender.momentum = Math.max(-100, Math.min(100, defender.momentum + momentumDelta({
        landedHit: true,
        wasEvaded: false,
        wasGuarded: false,
        wasCountered: false,
        didCounter: false,
        causedStagger: returnHit.stagger !== "none",
        gainedPosition: false,
        opponentFatigued: attacker.fatigue >= 50,
      }) * 0.6));
    }
    returnExchange = {
      attackerId: defender.chicken.id,
      defenderId: attacker.chicken.id,
      attackerAction: defenderAction,
      defenderAction: attackerAction,
      hit: returnHit,
    };
  }

  return {
    attackerId: attacker.chicken.id,
    defenderId: defender.chicken.id,
    attackerAction,
    defenderAction,
    hit,
    isCounterSwitch,
    returnExchange,
  };
}
