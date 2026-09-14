import type { InjuryRecord, Trait } from "../types";

/**
 * Career-earned traits from repeated hard battles (spec §43-44) — distinct
 * from `TRAIT_POOL` (lib/traits.ts): these are never handed out by the
 * breeding wild-trait roll, only awarded post-fight by `evaluateBattleTraits`.
 * Once earned they live in `Chicken.traits` like any other trait, so they
 * inherit through `inheritTraits`' normal pass-through roll and feed the same
 * `hasTrait` checks in behavior.ts/resolution.ts/injuries.ts.
 */
export const VETERAN_TRAIT: Trait = {
  id: "veteran",
  name: "Veteran",
  rarity: "rare",
  description: "Battle-tested reflexes from a long, clean fight record — steadier and harder to rattle.",
};

export const BATTLE_SCARRED_TRAIT: Trait = {
  id: "battle-scarred",
  name: "Battle-Scarred",
  rarity: "rare",
  description: "Shaken by a brutal career — flinches more, but has learned to punish openings.",
};

/** Clean fights survived (spec §44) before a rooster earns "Veteran". */
const VETERAN_BATTLE_HARDENING_THRESHOLD = 15;

/** Confidence at/below this after a fight marks a rooster as psychologically worn down. */
const TRAUMA_CONFIDENCE_THRESHOLD = 15;

/** Lifetime serious-or-worse injuries at/above this also mark trauma, independent of confidence. */
const TRAUMA_SEVERE_INJURY_THRESHOLD = 2;

function hasTrait(traits: readonly Trait[], id: string): boolean {
  return traits.some((t) => t.id === id);
}

function severeInjuryCount(injuries: readonly InjuryRecord[]): number {
  return injuries.filter((i) => i.severity === "serious" || i.severity === "career_altering").length;
}

/**
 * Evaluates whether `chicken` has just crossed a battle-earned trait
 * threshold. Called from `applyFightOutcome` with the post-fight
 * `battleHardening`/`confidence` (from `battleAftermath`) and the chicken's
 * full lifetime injury list. Returns only newly-earned traits (never
 * re-awards one already held) — caller appends them to `Chicken.traits`.
 */
export function evaluateBattleTraits(
  chicken: { traits: readonly Trait[]; battleHardening?: number },
  aftermath: { confidence: number },
  injuries: readonly InjuryRecord[]
): Trait[] {
  const earned: Trait[] = [];

  if (
    !hasTrait(chicken.traits, VETERAN_TRAIT.id) &&
    (chicken.battleHardening ?? 0) >= VETERAN_BATTLE_HARDENING_THRESHOLD
  ) {
    earned.push(VETERAN_TRAIT);
  }

  if (
    !hasTrait(chicken.traits, BATTLE_SCARRED_TRAIT.id) &&
    (aftermath.confidence <= TRAUMA_CONFIDENCE_THRESHOLD ||
      severeInjuryCount(injuries) >= TRAUMA_SEVERE_INJURY_THRESHOLD)
  ) {
    earned.push(BATTLE_SCARRED_TRAIT);
  }

  return earned;
}
