import { growthFactor } from "../growth";
import { MUTATION_POOL } from "../mutations";
import { resolvePhysicalProfile, traitStatModifier } from "../physicalProfile";
import type { Chicken, GeneticStatKey } from "../types";

/** Product of every expressed mutation's modifier for this stat (spec item 6: mutation stat effects). */
export function mutationStatMultiplier(chicken: Chicken, key: GeneticStatKey): number {
  let mult = 1;
  for (const def of MUTATION_POOL) {
    if (!chicken.mutations[def.id]?.expressed) continue;
    const modifier = def.statModifiers[key];
    if (modifier) mult *= 1 + modifier;
  }
  return mult;
}

/**
 * IV is genetic ceiling, EV is trained investment — 60/40 weighting per the
 * combat spec. Physical traits contribute a second, independent bounded
 * modifier (lib/physicalProfile.ts's traitStatModifier) alongside the
 * mutation multiplier — a direct trait→stat path layered on top of the IV/EV
 * core, not a replacement for it. This is genetics/training, untouched by the
 * V2 gameplay layer (fatigue/behavior/experience apply on top, in combat/resolution.ts).
 *
 * Growth stage scales the developed IV/EV core (lifecycle spec §6: "IV ×
 * Growth Factor = Base Developed Capability") — a chick or juvenile hasn't
 * physically matured into its genetic ceiling yet. The IV/EV values
 * themselves are never touched by aging, only this derived read.
 */
export function effectiveStat(chicken: Chicken, key: GeneticStatKey): number {
  const base = (chicken.iv[key] * 0.6 + chicken.ev[key] * 0.4) * growthFactor(chicken.growthStage);
  return base * mutationStatMultiplier(chicken, key) * traitStatModifier(chicken, key) * permanentInjuryStatMultiplier(chicken, key);
}

/** Permanent modifiers are source-id deduplicated and enter the shared stat
 * pipeline exactly once. A -5 stored penalty means five percent, not a second
 * flat subtraction in the V2 adapter. */
export function permanentInjuryStatMultiplier(chicken: Chicken, key: GeneticStatKey): number {
  const seen = new Set<string>();
  let percent = 0;
  for (const injury of chicken.injuries ?? []) {
    if (!injury.permanent || seen.has(injury.id)) continue;
    seen.add(injury.id);
    percent += injury.statPenalty?.[key] ?? 0;
  }
  return Math.max(0.5, 1 + percent / 100);
}

/** Fight-only readiness modifier. Condition and accumulated training fatigue
 * target recovery-related stats more strongly than power, avoiding one opaque
 * scalar across every capability. */
export function effectiveCombatStat(chicken: Chicken, key: GeneticStatKey): number {
  const condition = Math.max(0, Math.min(100, chicken.condition ?? 100));
  const fatigue = Math.max(0, Math.min(100, chicken.trainingState?.trainingFatigue ?? 0));
  const sensitivity = key === "stamina" ? 0.28 : key === "speed" || key === "agility" ? 0.18 : 0.1;
  const readiness = 1 - (100 - condition) / 100 * sensitivity - fatigue / 100 * sensitivity;
  return effectiveStat(chicken, key) * Math.max(0.65, readiness);
}

/** Body-size genetics add mass, which raises the HP pool a bird can soak up (spec: physique → combat). */
export function maxHealth(chicken: Chicken): number {
  const base = 50 + effectiveStat(chicken, "stamina") + effectiveStat(chicken, "defense") * 0.5;
  return base * resolvePhysicalProfile(chicken).mass;
}

/**
 * V2 spec §4 — accuracy stays a derived, bounded, internal value rather than
 * a dominant sixth stat. It's layered on top of the existing trained
 * "accuracy" genetic stat (which stays authoritative genetics), adjusted by
 * combat-only factors: experience, behavioral confidence, fatigue, injury,
 * and positional advantage.
 */
export function derivedAccuracy(params: {
  baseAccuracy: number;
  experienceBonus: number;
  confidenceBonus: number;
  fatiguePenalty: number;
  injuryPenalty: number;
  positionalAdvantage: number;
}): number {
  const { baseAccuracy, experienceBonus, confidenceBonus, fatiguePenalty, injuryPenalty, positionalAdvantage } =
    params;
  return Math.max(1, baseAccuracy + experienceBonus + confidenceBonus - fatiguePenalty - injuryPenalty + positionalAdvantage);
}
