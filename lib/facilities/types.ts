import type { TrainingCategory } from "../types";

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
  workload: number;
  /** Base adaptation gain fed into applyDevelopment()'s baseGain, before facility efficiency (§59). */
  baseGain: number;
};

export type FacilityLevelConfig = {
  capacity: number;
  efficiency: number;
  programs: ProgramId[];
};
