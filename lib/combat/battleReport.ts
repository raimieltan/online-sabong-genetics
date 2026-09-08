import type { CombatExperience, CombatExperienceCategory, CombatResult, InjuryRecord } from "../types";
import { COMBAT_EXPERIENCE_CATEGORIES } from "../types";
import type { FightOutcomeUpdate } from "../combat";
import { matchupInsight } from "../training/insights";

/** Structured post-fight summary (spec §70) — the numeric counterpart to the prose in `generateBattleAnalysis`. */
export type BattleReport = {
  won: boolean;
  experienceGained: Partial<Record<CombatExperienceCategory, number>>;
  totalExperienceGained: number;
  confidenceDelta: number;
  moraleDelta: number;
  stressDelta: number;
  newInjuries: InjuryRecord[];
  conditionDelta: number;
  insight: string | null;
};

function nonZeroCategories(gained: CombatExperience | undefined): Partial<Record<CombatExperienceCategory, number>> {
  if (!gained) return {};
  const entries: Partial<Record<CombatExperienceCategory, number>> = {};
  for (const category of COMBAT_EXPERIENCE_CATEGORIES) {
    if (gained[category] > 0) entries[category] = gained[category];
  }
  return entries;
}

/**
 * Builds the structured battle report for `chicken`'s side of `result`, given
 * the state the fight replaced (`before`) and `applyFightOutcome`'s outcome —
 * so every delta here is derived, never recomputed differently from what got
 * persisted.
 */
export function buildBattleReport(
  before: { confidence?: number; morale?: number; stress?: number },
  result: CombatResult,
  chickenId: string,
  outcome: FightOutcomeUpdate
): BattleReport {
  const gained = result.experienceGained?.[chickenId];
  const experienceGained = nonZeroCategories(gained);

  return {
    won: result.winnerId === chickenId,
    experienceGained,
    totalExperienceGained: Object.values(experienceGained).reduce((s, v) => s + (v ?? 0), 0),
    confidenceDelta: outcome.confidence - (before.confidence ?? 50),
    moraleDelta: outcome.morale - (before.morale ?? 75),
    stressDelta: outcome.stress - (before.stress ?? 0),
    newInjuries: result.newInjuries?.[chickenId] ?? [],
    conditionDelta: result.conditionDelta?.[chickenId] ?? 0,
    insight: matchupInsight(result, chickenId),
  };
}
