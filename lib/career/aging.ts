import type { CareerLifeStage, Chicken, CombatExperience, GrowthStage } from "../types";

const VETERAN_STAGES: readonly GrowthStage[] = ["senior", "retired"];
const PRIME_EXPERIENCE_THRESHOLD = 400; // sum across all 7 categories
const VETERAN_EXPERIENCE_THRESHOLD = 900;

function totalExperience(experience: CombatExperience | undefined): number {
  if (!experience) return 0;
  return Object.values(experience).reduce((s, v) => s + v, 0);
}

/**
 * Life stage emerges from physical development (growthStage) + accumulated
 * battle experience + readiness (condition), never from age alone (V2 spec
 * §29-30: "prime is not simply age === X").
 */
export function deriveLifeStage(chicken: Chicken): CareerLifeStage {
  const experience = totalExperience(chicken.experience);
  const condition = chicken.condition ?? 100;

  if (VETERAN_STAGES.includes(chicken.growthStage)) {
    return experience >= VETERAN_EXPERIENCE_THRESHOLD && condition >= 60 ? "veteran" : "decline";
  }
  if (chicken.growthStage === "young_adult") return "developing";
  if (experience >= PRIME_EXPERIENCE_THRESHOLD && condition >= 70) return "prime";
  return "developing";
}

/**
 * Veterans trade some physical ceiling for decision quality (spec §31) — a
 * small, bounded multiplier applied only to the derived-accuracy/decision
 * layer, never to raw effectiveStat().
 */
export function veteranExperienceBonus(lifeStage: CareerLifeStage, experience: CombatExperience | undefined): number {
  if (lifeStage !== "veteran" || !experience) return 0;
  return Math.min(8, totalExperience(experience) / 500);
}

/** Decline reduces recovery/training efficiency and raises injury risk, but never erases earned experience (spec §32). */
export function declineMultiplier(lifeStage: CareerLifeStage): number {
  return lifeStage === "decline" ? 0.75 : 1;
}
