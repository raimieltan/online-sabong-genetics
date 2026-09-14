import { applyDevelopment } from "./development";
import { creditXp } from "./xp";
import { spendEffort } from "./effort";
import { applyIntensity } from "./intensity";
import { rollBreakthrough, checkOvertrainedTrigger, BONUS_EV_ON_BREAKTHROUGH } from "./breakthroughs";
import { discoverPotential } from "./potential";
import type {
  BreakthroughLogEntry,
  GeneticStatKey,
  RoosterTrainingState,
  StatBlock,
  TrainingCategory,
  TrainingIntensity,
} from "../types";

export type Rng = () => number;

export function applyTrainingSession(params: {
  roosterTraining: RoosterTrainingState;
  ev: StatBlock;
  category: TrainingCategory;
  stat: GeneticStatKey;
  baseGain: number;
  trainingFatigue: number;
  lifeStageMultiplier: number;
  intensity: TrainingIntensity;
  extremeSessionStreak: number;
  rng: Rng;
}): {
  ev: StatBlock;
  roosterTraining: RoosterTrainingState;
  energyMultiplier: number;
  fatigueMultiplier: number;
  stressGain: number;
  injuryChance: number;
  breakthrough: BreakthroughLogEntry | null;
  overtrainedTriggered: boolean;
} {
  const {
    roosterTraining,
    ev,
    category,
    stat,
    baseGain,
    trainingFatigue,
    lifeStageMultiplier,
    intensity,
    extremeSessionStreak,
    rng,
  } = params;

  const scaled = applyIntensity({ energy: 1, fatigue: 1, evGain: baseGain }, intensity);

  const developedEv = applyDevelopment({
    ev,
    category,
    baseGain: scaled.evGain,
    trainingFatigue,
    lifeStageMultiplier,
  });
  const desiredGain = Math.min(
    developedEv[stat] - ev[stat],
    roosterTraining.trainingPotential[stat] - ev[stat]
  );

  const { evGain, effortSpent } = spendEffort(roosterTraining, stat, Math.max(0, desiredGain));
  const nextEv: StatBlock = { ...ev, [stat]: Math.min(roosterTraining.trainingPotential[stat], ev[stat] + evGain) };

  const xpBefore = roosterTraining;
  const xpAfter = creditXp({ ...roosterTraining, effortSpent }, category);

  const breakthrough = rollBreakthrough({
    state: xpAfter,
    stat,
    category,
    xpBefore,
    xpAfter,
    rng,
  });

  let finalEv = nextEv;
  let traits = xpAfter.traits;
  let breakthroughs = xpAfter.breakthroughs;
  if (breakthrough) {
    breakthroughs = [...breakthroughs, breakthrough].slice(-50);
    if (breakthrough.kind === "bonus_ev") {
      const cap = roosterTraining.trainingPotential[stat];
      finalEv = { ...finalEv, [stat]: Math.min(cap, finalEv[stat] + BONUS_EV_ON_BREAKTHROUGH) };
    } else if (breakthrough.kind === "trait" && breakthrough.traitId) {
      traits = [...traits, { id: breakthrough.traitId, grantedAt: breakthrough.at }];
    }
  }

  const overtrainedTriggered = checkOvertrainedTrigger({
    extremeSessionStreak,
    trainingFatigue,
    hasTrait: traits.some((t) => t.id === "overtrained"),
  });
  if (overtrainedTriggered) {
    traits = [...traits, { id: "overtrained", grantedAt: Date.now() }];
  }

  const potentialRevealed = discoverPotential({ ...xpAfter, effortSpent, traits, breakthroughs });

  return {
    ev: finalEv,
    roosterTraining: potentialRevealed,
    energyMultiplier: scaled.energy,
    fatigueMultiplier: scaled.fatigue,
    stressGain: scaled.stress,
    injuryChance: scaled.injuryChance,
    breakthrough,
    overtrainedTriggered,
  };
}
