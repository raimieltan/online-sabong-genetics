import type {
  BehavioralProfile,
  CombatExperienceCategory,
  GeneticStatKey,
  TrainingCategory,
} from "../types";

export type FacilityType = "TRAINING_GYM";

export const FACILITY_TYPES: readonly FacilityType[] = ["TRAINING_GYM"];

export type TrainingSessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type ProgramId =
  | "STRENGTH"
  | "SPEED"
  | "ENDURANCE"
  | "AGILITY"
  | "REACTION"
  | "BALANCE"
  | "POWER_CONDITIONING"
  | "SPRINT"
  | "ADVANCED_REACTION"
  | "EXPLOSIVE_CONDITIONING"
  | "ADVANCED_AGILITY"
  | "ADVANCED_ENDURANCE"
  | "RECOVERY_TRAINING"
  | "PRECISION_STRENGTH"
  | "PRECISION_SPEED"
  | "PRECISION_REACTION"
  | "ADVANCED_CONDITIONING"
  | "FOOTWORK_CIRCUIT"
  | "TARGET_DRILLS"
  | "COUNTER_DRILLS"
  | "DEFENSIVE_DRILLS"
  | "PRESSURE_DRILLS"
  | "DISCIPLINE_TRAINING"
  | "CONTROLLED_SPARRING"
  | "HARD_SPARRING"
  | "CUSTOM_TRAINING"
  | "SPECIALIZED_CONDITIONING"
  | "ADVANCED_ADAPTATION";

/** "custom" means the player supplies `category` (any TrainingCategory) at session start (§56-58). */
export type ProgramCategory = TrainingCategory | "custom";

export type ProgramDefinition = {
  id: ProgramId;
  name: string;
  description: string;
  category: ProgramCategory;
  requiredFacilityType: FacilityType;
  requiredFacilityLevel: number;
  durationMinutes: number;
  energyCost: number;
  fatigueCost: number;
  stressCost: number;
  trainingPointCost: number;
  workload: number;
  /** Total EV budget distributed by stat weights. `baseGain` remains as a compatibility alias. */
  baseEvGain: number;
  baseGain: number;
  primaryStats: Partial<Record<GeneticStatKey, number>>;
  secondaryStats?: Partial<Record<GeneticStatKey, number>>;
  experienceGain?: Partial<Record<CombatExperienceCategory, number>>;
  behaviorEffects?: Partial<Record<keyof BehavioralProfile, number>>;
  temporaryLoad?: Partial<Record<GeneticStatKey, number>>;
  breakthroughTags?: string[];
  traitTags?: string[];
  tags: string[];
  baseBreakthroughChance: number;
  baseInjuryRisk: number;
  recoveryModifier?: number;
  battleHardeningGain?: number;
};

export type FacilityLevelConfig = {
  capacity: number;
  efficiency: number;
  fatigueMultiplier: number;
  injuryMultiplier: number;
  experienceMultiplier: number;
  breakthroughMultiplier: number;
  potentialDiscoveryMultiplier: number;
  programs: ProgramId[];
};
