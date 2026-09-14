import { COMBAT_EXPERIENCE_CATEGORIES } from "../types";
import type { CombatExperience, CombatExperienceCategory, CombatResult, TrainingCategory } from "../types";

/** Weakness detection reading the chicken's lifetime battle-earned experience (spec §71-72) — never reads training data, only combat outcomes. */
export type TrainingInsight = {
  weakCategory: CombatExperienceCategory;
  recommendedTraining: TrainingCategory;
  message: string;
};

const CATEGORY_TO_TRAINING: Record<CombatExperienceCategory, TrainingCategory> = {
  offensive: "strength",
  defensive: "defense",
  evasion: "speed",
  counter: "technique",
  pressure: "stamina",
  recovery: "recovery",
  adaptation: "discipline",
};

const MIN_SAMPLE_SIZE = 50;
const WEAKNESS_THRESHOLD = 0.5;

/**
 * Flags experience categories sitting well below the chicken's own average
 * (spec §71) — relative, not absolute, so a well-rounded veteran with high
 * numbers everywhere gets no false positives. Returns nothing until there's
 * enough battle history to read a real pattern from.
 */
export function experienceInsights(experience: CombatExperience): TrainingInsight[] {
  const total = COMBAT_EXPERIENCE_CATEGORIES.reduce((s, c) => s + experience[c], 0);
  if (total < MIN_SAMPLE_SIZE) return [];

  const average = total / COMBAT_EXPERIENCE_CATEGORIES.length;
  return COMBAT_EXPERIENCE_CATEGORIES.filter((c) => experience[c] < average * WEAKNESS_THRESHOLD)
    .sort((a, b) => experience[a] - experience[b])
    .map((weakCategory) => ({
      weakCategory,
      recommendedTraining: CATEGORY_TO_TRAINING[weakCategory],
      message: `${weakCategory} experience is well below your other categories — ${CATEGORY_TO_TRAINING[weakCategory]} training will close the gap.`,
    }));
}

/**
 * Single-fight tactical read (spec §72) — "struggled vs fast opponents"
 * style callouts built purely from the log the simulator already produced.
 */
export function matchupInsight(result: CombatResult, chickenId: string): string | null {
  const mine = result.log.filter((e) => e.attackerId === chickenId || e.defenderId === chickenId);
  if (mine.length === 0) return null;

  const won = result.winnerId === chickenId;
  const staggerCount = mine.filter((e) => e.defenderId === chickenId && e.stagger !== "none").length;
  const counteredCount = mine.filter((e) => e.attackerId === chickenId && e.isCounter).length;
  const opponentPressureCount = mine.filter((e) => e.attackerId !== chickenId && e.attackerAction === "PRESSURE").length;

  if (!won && counteredCount >= 3) {
    return "You got read and countered repeatedly — technique training will sharpen commitment discipline.";
  }
  if (!won && opponentPressureCount >= mine.length * 0.3) {
    return "The opponent pressured relentlessly and you couldn't hold ground — stamina training will help you last.";
  }
  if (!won && staggerCount >= 3) {
    return "You were staggered too often to mount a response — defense training will reduce how hard those hits land.";
  }
  return null;
}
