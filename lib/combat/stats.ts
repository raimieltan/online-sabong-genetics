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
  return base * mutationStatMultiplier(chicken, key) * traitStatModifier(chicken, key);
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
