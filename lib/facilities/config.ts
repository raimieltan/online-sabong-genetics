import type { FacilityLevelConfig, ProgramDefinition, ProgramId } from "./types";

export const TRAINING_PROGRAMS: Record<ProgramId, ProgramDefinition> = {
  STRENGTH: {
    id: "STRENGTH", name: "Strength Training", description: "Develop physical strength.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 1, energyCost: 18, fatigueCost: 14, workload: 1, baseGain: 2.0,
  },
  SPEED: {
    id: "SPEED", name: "Speed Training", description: "Develop movement speed.",
    category: "speed", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 1, energyCost: 17, fatigueCost: 13, workload: 1, baseGain: 2.0,
  },
  ENDURANCE: {
    id: "ENDURANCE", name: "Endurance Training", description: "Improve sustained performance.",
    category: "stamina", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 1, energyCost: 24, fatigueCost: 18, workload: 1, baseGain: 2.5,
  },
  AGILITY: {
    id: "AGILITY", name: "Agility Training", description: "Improve movement and directional changes.",
    category: "agility", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 1, energyCost: 16, fatigueCost: 12, workload: 1, baseGain: 2.0,
  },
  REACTION: {
    id: "REACTION", name: "Reaction Training", description: "Improve reaction-oriented physical development.",
    category: "technique", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 1, energyCost: 15, fatigueCost: 10, workload: 1, baseGain: 2.0,
  },
  BALANCE: {
    id: "BALANCE", name: "Balance Training", description: "Improve stability and physical control.",
    category: "discipline", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 1, energyCost: 14, fatigueCost: 9, workload: 1, baseGain: 1.75,
  },
  POWER_CONDITIONING: {
    id: "POWER_CONDITIONING", name: "Power Conditioning", description: "High-output strength/power development.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 2,
    durationMinutes: 1, energyCost: 25, fatigueCost: 20, workload: 1, baseGain: 3.0,
  },
  SPRINT: {
    id: "SPRINT", name: "Sprint Training", description: "Stronger than basic speed work, more taxing.",
    category: "speed", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 2,
    durationMinutes: 1, energyCost: 23, fatigueCost: 18, workload: 1, baseGain: 2.75,
  },
  ADVANCED_REACTION: {
    id: "ADVANCED_REACTION", name: "Advanced Reaction Drills", description: "Gateway toward Phase 2 behavioral development.",
    category: "technique", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 2,
    durationMinutes: 1, energyCost: 22, fatigueCost: 16, workload: 1, baseGain: 3.0,
  },
  EXPLOSIVE_CONDITIONING: {
    id: "EXPLOSIVE_CONDITIONING", name: "Explosive Conditioning", description: "Maximum physical development, expensive.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 1, energyCost: 30, fatigueCost: 24, workload: 1, baseGain: 3.5,
  },
  ADVANCED_AGILITY: {
    id: "ADVANCED_AGILITY", name: "Advanced Agility", description: "Deeper agility/balance/movement work.",
    category: "agility", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 1, energyCost: 22, fatigueCost: 16, workload: 1, baseGain: 3.0,
  },
  ADVANCED_ENDURANCE: {
    id: "ADVANCED_ENDURANCE", name: "Advanced Endurance", description: "The longest basic conditioning session.",
    category: "stamina", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 1, energyCost: 32, fatigueCost: 25, workload: 1, baseGain: 3.5,
  },
  RECOVERY_TRAINING: {
    id: "RECOVERY_TRAINING", name: "Recovery Training",
    description: "Low-intensity training that assists normal recovery. Not medical treatment — cannot heal injuries.",
    category: "recovery", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 1, energyCost: 8, fatigueCost: 3, workload: 1, baseGain: 1.0,
  },
  PRECISION_STRENGTH: {
    id: "PRECISION_STRENGTH", name: "Precision Strength", description: "Efficiency over raw output.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 1, energyCost: 22, fatigueCost: 16, workload: 1, baseGain: 3.0,
  },
  PRECISION_SPEED: {
    id: "PRECISION_SPEED", name: "Precision Speed", description: "Efficiency over raw output.",
    category: "speed", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 1, energyCost: 21, fatigueCost: 15, workload: 1, baseGain: 3.0,
  },
  PRECISION_REACTION: {
    id: "PRECISION_REACTION", name: "Precision Reaction", description: "Efficiency over raw output.",
    category: "technique", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 1, energyCost: 19, fatigueCost: 13, workload: 1, baseGain: 3.25,
  },
  ADVANCED_CONDITIONING: {
    id: "ADVANCED_CONDITIONING", name: "Advanced Conditioning", description: "Endurance-led all-round conditioning.",
    category: "stamina", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 1, energyCost: 28, fatigueCost: 21, workload: 1, baseGain: 2.5,
  },
  CUSTOM_TRAINING: {
    id: "CUSTOM_TRAINING", name: "Custom Training", description: "Player-directed specialization.",
    category: "custom", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 5,
    durationMinutes: 1, energyCost: 24, fatigueCost: 17, workload: 1, baseGain: 3.25,
  },
  SPECIALIZED_CONDITIONING: {
    id: "SPECIALIZED_CONDITIONING", name: "Specialized Conditioning", description: "Powerful and expensive; caps still apply.",
    category: "custom", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 5,
    durationMinutes: 1, energyCost: 34, fatigueCost: 25, workload: 1, baseGain: 4.0,
  },
  ADVANCED_ADAPTATION: {
    id: "ADVANCED_ADAPTATION", name: "Advanced Adaptation Program", description: "One of the strongest Phase 1 programs; heavily diminished near potential.",
    category: "custom", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 5,
    durationMinutes: 1, energyCost: 40, fatigueCost: 30, workload: 1, baseGain: 4.5,
  },
};

function programsUpTo(level: number): ProgramId[] {
  return (Object.values(TRAINING_PROGRAMS) as ProgramDefinition[])
    .filter((p) => p.requiredFacilityLevel <= level)
    .map((p) => p.id);
}

export const TRAINING_GYM_LEVELS: Record<number, FacilityLevelConfig> = {
  1: { capacity: 2, efficiency: 1.0, programs: programsUpTo(1) },
  2: { capacity: 3, efficiency: 1.05, programs: programsUpTo(2) },
  3: { capacity: 4, efficiency: 1.1, programs: programsUpTo(3) },
  4: { capacity: 5, efficiency: 1.15, programs: programsUpTo(4) },
  5: { capacity: 6, efficiency: 1.2, programs: programsUpTo(5) },
};

export const TRAINING_GYM_MAX_LEVEL = 5;

export const TRAINING_GYM_UPGRADES: Record<number, { cost: number }> = {
  2: { cost: 1000 },
  3: { cost: 2500 },
  4: { cost: 5000 },
  5: { cost: 10000 },
};

export function isProgramUnlocked(programId: ProgramId, level: number): boolean {
  return TRAINING_GYM_LEVELS[level]?.programs.includes(programId) ?? false;
}
