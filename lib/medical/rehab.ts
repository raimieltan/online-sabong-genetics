import { TRAINING_CATEGORIES, type InjuryLocation, type InjuryRecord, type RehabStage, type TrainingCategory } from "../types";

/**
 * Which training categories a given injury location locks out (spec §86).
 * Recovery training is never locked — it is the way back in.
 */
const LOCATION_LOCKS: Record<InjuryLocation, TrainingCategory[]> = {
  head: ["strength", "speed", "technique"],
  neck: ["strength", "technique"],
  chest: ["strength", "stamina"],
  wing: ["technique", "defense"],
  leg: ["strength", "speed", "agility", "stamina"],
  foot: ["speed", "agility"],
  joint: ["strength", "speed", "agility"],
  muscle: ["strength", "speed"],
  internal: ["strength", "speed", "agility", "stamina", "technique", "defense", "discipline"],
};

/**
 * Categories the chicken cannot train right now because of an active injury
 * (spec §86). A serious/career injury with no recorded location locks
 * everything except recovery, to be safe.
 */
export function trainingLocks(injuries: readonly InjuryRecord[]): Set<TrainingCategory> {
  const locked = new Set<TrainingCategory>();
  for (const injury of injuries) {
    if (!injury.permanent && injury.recoveryRemaining <= 0) continue;
    if (injury.severity === "minor" && !injury.permanent) continue;
    if (injury.location) {
      for (const cat of LOCATION_LOCKS[injury.location]) locked.add(cat);
    } else {
      for (const cat of TRAINING_CATEGORIES) if (cat !== "recovery") locked.add(cat);
    }
  }
  return locked;
}

export function isTrainingLocked(injuries: readonly InjuryRecord[], category: TrainingCategory): boolean {
  return trainingLocks(injuries).has(category);
}

const REHAB_LADDER: readonly RehabStage[] = [
  "critical",
  "stabilized",
  "recovery",
  "rehabilitation",
  "light_training",
  "normal_training",
  "recovered",
];

/**
 * Where a healing injury sits on the return-to-training ladder (spec §41, §87),
 * derived from how much of its recovery is done. Minor injuries skip most of
 * the ladder.
 */
export function rehabStage(injury: InjuryRecord, totalRecovery: number): RehabStage {
  if (injury.permanent) return "rehabilitation";
  if (injury.recoveryRemaining <= 0) return "recovered";
  if (totalRecovery <= 0) return "recovered";

  const done = 1 - Math.max(0, Math.min(1, injury.recoveryRemaining / totalRecovery));

  if (injury.severity === "minor") return done < 0.5 ? "light_training" : "normal_training";
  if (done < 0.15) return "critical";
  if (done < 0.35) return "stabilized";
  if (done < 0.55) return "recovery";
  if (done < 0.75) return "rehabilitation";
  if (done < 0.9) return "light_training";
  return "normal_training";
}

const REHAB_LABEL: Record<RehabStage, string> = {
  critical: "Critical",
  stabilized: "Stabilized",
  recovery: "Recovery",
  rehabilitation: "Rehabilitation",
  light_training: "Light Training",
  normal_training: "Normal Training",
  recovered: "Fully Recovered",
};

export function describeRehabStage(stage: RehabStage): string {
  return REHAB_LABEL[stage];
}

export { REHAB_LADDER };
