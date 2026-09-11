import type { FacilityLevelConfig, ProgramDefinition, ProgramId } from "../facilities/types";
import type { BehavioralProfile, Chicken, CombatExperience, CombatExperienceCategory, GeneticStatKey, InjuryRecord, RoosterTrainingState, StatBlock, Trait, TrainingCategory, TrainingIntensity, TrainingState } from "../types";

export type CanonicalTrainingIntensity = Exclude<TrainingIntensity, "moderate">;
export type TrainingSessionIntent = { id:string; chickenId:string; programId:ProgramId; category:TrainingCategory; intensity:CanonicalTrainingIntensity; startedAt:Date; durationMinutes:number; energyCost:number; fatigueCost:number; stressCost:number; trainingPointCost:number };
export type TrainingResolutionContext = { chicken:Chicken; session:TrainingSessionIntent; program:ProgramDefinition; facility:FacilityLevelConfig; trainingState:TrainingState; roosterTraining:RoosterTrainingState; rng:()=>number; completedAt?:number };
export type BreakthroughResult = { id:string; tag:string; message:string; statChanges:Partial<Record<GeneticStatKey,number>>; XPChanges:Partial<Record<CombatExperienceCategory,number>>; behaviorChanges:Partial<Record<keyof BehavioralProfile,number>>; traitUnlocked?:Trait };
export type PotentialDiscoveryResult = { stat:GeneticStatKey; potential:number; band:"Below Average"|"Average"|"Above Average"|"Exceptional"; message:string };
export type EffectiveStatChange = { before:number; after:number; delta:number };
export type TrainingResult = {
  version:3; sessionId:string; chickenId:string; programId:ProgramId; category:TrainingCategory; intensity:CanonicalTrainingIntensity;
  statChanges:Partial<Record<GeneticStatKey,number>>; effectiveStatChanges:Partial<Record<GeneticStatKey,EffectiveStatChange>>;
  experienceChanges:Partial<Record<CombatExperienceCategory,number>>; behaviorChanges:Partial<Record<keyof BehavioralProfile,number>>;
  resourceChanges:{energy:number;trainingPoints:number;trainingFatigue:number;stress:number;condition:number};
  readinessLoad:Partial<Record<GeneticStatKey,number>>; trainingEfficiency:number; injuryRisk:number; breakthroughChance:number;
  traitProgressChanges:Record<string,number>; specializationProgressChanges:Record<string,number>; specialization:string;
  potentialDiscovery?:PotentialDiscoveryResult; breakthrough?:BreakthroughResult; injury?:InjuryRecord;
  summary:{headline:string;messages:string[]}; completedAt:number;
};
export type TrainingResolution = { persistedResult:TrainingResult; nextEv:StatBlock; nextExperience:CombatExperience; nextBehavior:BehavioralProfile; nextTrainingState:TrainingState; nextRoosterTraining:RoosterTrainingState; nextTraits:Trait[]; nextInjuries:InjuryRecord[]; nextEnergy:number; nextStress:number; nextCondition:number; nextBattleHardening:number };
export type TrainingPreview = { version:3; programId:ProgramId; category:TrainingCategory; intensity:CanonicalTrainingIntensity; expectedEv:Partial<Record<GeneticStatKey,{min:number;max:number}>>; expectedExperience:Partial<Record<CombatExperienceCategory,{min:number;max:number}>>; behaviorChanges:Partial<Record<keyof BehavioralProfile,{min:number;max:number}>>; energyCost:number;trainingPointCost:number;fatigueGain:number;stressChange:number;conditionChange:number;trainingEfficiency:number;estimatedBreakthroughChance:number;injuryRisk:number;potentialDiscoveryChance:number;wastedEv:Partial<Record<GeneticStatKey,number>> };
