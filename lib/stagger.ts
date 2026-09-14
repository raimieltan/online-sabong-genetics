import type { HitZone, StaggerLevel } from "./types";

/** Everything the stagger calc needs, already resolved by the caller — no rng, fully deterministic. */
export interface StaggerContext {
  damage: number;
  defenderMaxHp: number;
  hitZone: HitZone | null;
  isMiss: boolean;
  isCrit: boolean;
  isCounter: boolean;
  isCritical: boolean;
  /** physicalProfile.stability — higher resists stagger. */
  defenderStability: number;
  /** physicalProfile.mass — heavier bodies resist stagger, per spec §37. */
  defenderMass: number;
  /** defender.stamina / 100 at the moment of the hit. */
  defenderStaminaRatio: number;
  /** effectiveStat(defender, "agility") — higher keeps footing on leg hits instead of stumbling. */
  defenderAgility: number;
}

/** Damage-as-fraction-of-max-HP breakpoints, before resistance/zone/state modifiers. Tune here for balance. */
const STAGGER_THRESHOLDS: Record<Exclude<StaggerLevel, "none">, number> = {
  light: 0.06,
  // "stumble" isn't its own severity rung — it's "medium" relabeled for leg hits, see below.
  stumble: 0.12,
  medium: 0.12,
  heavy: 0.2,
  knockdown: 0.32,
};

const HEAD_STAGGER_MULT = 1.3;
const NECK_STAGGER_MULT = 1.15;
const CRIT_STAGGER_MULT = 1.4;
const COUNTER_STAGGER_MULT = 1.3;
const FATIGUE_STAGGER_MULT = 1.25;
const SEVERE_FATIGUE_STAGGER_MULT = 1.15;
const LEG_ZONES: readonly HitZone[] = ["left_leg", "right_leg"];
/** Baseline "average" agility (mid of the IV 40-99 range) — used to normalize footing resistance. */
const AGILITY_FOOTING_BASELINE = 70;
const LEG_FOOTING_MULT = 1.2;

/**
 * Pure function: given the already-resolved outcome of one attack, decides how
 * hard the defender gets rocked. A critical injury always ends in a knockdown
 * (the fight is over, the bird goes down). No RNG — same inputs, same tier,
 * every time, so this is safe to compute from a replayed log too.
 */
export function calculateStagger(ctx: StaggerContext): StaggerLevel {
  if (ctx.isMiss) return "none";
  if (ctx.isCritical) return "knockdown";

  const dmgRatio = ctx.damage / ctx.defenderMaxHp;
  const resistance = ctx.defenderStability * (0.7 + ctx.defenderMass * 0.3);
  let effective = dmgRatio / resistance;

  if (ctx.defenderStaminaRatio < 0.3) effective *= FATIGUE_STAGGER_MULT;
  if (ctx.defenderStaminaRatio < 0.15) effective *= SEVERE_FATIGUE_STAGGER_MULT;

  if (ctx.isCrit) effective *= CRIT_STAGGER_MULT;
  if (ctx.isCounter) effective *= COUNTER_STAGGER_MULT;

  if (ctx.hitZone === "head") effective *= HEAD_STAGGER_MULT;
  else if (ctx.hitZone === "neck") effective *= NECK_STAGGER_MULT;

  // Leg hits threaten footing rather than raw knockback — a low-agility defender
  // loses their stance far more easily than a nimble one takes the same hit.
  const isLegHit = ctx.hitZone !== null && LEG_ZONES.includes(ctx.hitZone);
  const footingMult = isLegHit
    ? LEG_FOOTING_MULT / (0.6 + (ctx.defenderAgility / AGILITY_FOOTING_BASELINE) * 0.4)
    : 1;
  const tieringEffective = effective * footingMult;

  if (tieringEffective >= STAGGER_THRESHOLDS.knockdown) return "knockdown";
  if (tieringEffective >= STAGGER_THRESHOLDS.heavy) return "heavy";
  if (tieringEffective >= STAGGER_THRESHOLDS.medium) return isLegHit ? "stumble" : "medium";
  if (tieringEffective >= STAGGER_THRESHOLDS.light) return "light";
  return "none";
}
