import type {
  BreakthroughLogEntry,
  GeneticStatKey,
  RoosterTrainingState,
  TrainingCategory,
  TrainingTraitId,
} from "../types";

export type Rng = () => number;

export const BREAKTHROUGH_BASE_CHANCE = 0.02;
export const BREAKTHROUGH_MILESTONE_BONUS = 0.01;
export const BONUS_EV_ON_BREAKTHROUGH = 5;
export const TRAINING_TRAIT_POOL: readonly TrainingTraitId[] = ["iron_body", "fast_learner"];

const XP_MILESTONE = 100;

/** Whether an XP pool's value just crossed a multiple of 100 this session. */
export function crossedMilestone(before: number, after: number): boolean {
  return Math.floor(before / XP_MILESTONE) < Math.floor(after / XP_MILESTONE);
}

/**
 * Rolls one breakthrough chance per session (design spec: Breakthroughs).
 * `xpBefore`/`xpAfter` are the RoosterTrainingState snapshots straddling this
 * session's `creditXp` call, used to count milestone crossings for the bonus.
 */
export function rollBreakthrough(params: {
  state: RoosterTrainingState;
  stat: GeneticStatKey;
  category: TrainingCategory;
  xpBefore: RoosterTrainingState;
  xpAfter: RoosterTrainingState;
  rng: Rng;
}): BreakthroughLogEntry | null {
  const { state, stat, category, xpBefore, xpAfter, rng } = params;

  const pools: (keyof RoosterTrainingState)[] = [
    "physicalXP",
    "combatXP",
    "tacticalXP",
    "disciplineXP",
    "recoveryXP",
  ];
  const milestonesCrossed = pools.filter((pool) =>
    crossedMilestone(xpBefore[pool] as number, xpAfter[pool] as number)
  ).length;

  const chance = BREAKTHROUGH_BASE_CHANCE + milestonesCrossed * BREAKTHROUGH_MILESTONE_BONUS;
  if (rng() >= chance) return null;

  const kindRoll = rng();
  if (kindRoll < 0.7) {
    return { stat, category, at: Date.now(), kind: "bonus_ev" };
  }

  const available = TRAINING_TRAIT_POOL.filter((id) => !state.traits.some((t) => t.id === id));
  if (available.length === 0) return { stat, category, at: Date.now(), kind: "bonus_ev" };

  const traitId = available[Math.floor(kindRoll * available.length) % available.length];
  return { stat, category, at: Date.now(), kind: "trait", traitId };
}

const OVERTRAINED_SESSION_THRESHOLD = 5;
const OVERTRAINED_FATIGUE_THRESHOLD = 85;

/** Forces (never rolls) the Overtrained penalty trait once a chicken has ground extreme sessions while pinned at high fatigue. */
export function checkOvertrainedTrigger(params: {
  extremeSessionStreak: number;
  trainingFatigue: number;
  hasTrait: boolean;
}): boolean {
  const { extremeSessionStreak, trainingFatigue, hasTrait } = params;
  if (hasTrait) return false;
  return extremeSessionStreak >= OVERTRAINED_SESSION_THRESHOLD && trainingFatigue >= OVERTRAINED_FATIGUE_THRESHOLD;
}
