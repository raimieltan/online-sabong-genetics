import { calculateTrainingProjection } from "./calculation";
import type { BehavioralProfile, CombatExperienceCategory, GeneticStatKey } from "../types";
import type { TrainingPreview, TrainingResolutionContext } from "./types";

const range=(value:number,variance=.05)=>({min:Number(Math.max(0,value*(1-variance)).toFixed(4)),max:Number((value*(1+variance)).toFixed(4))});
export function previewTrainingSession(ctx:Omit<TrainingResolutionContext,"rng">):TrainingPreview{
  const p=calculateTrainingProjection({...ctx,rng:()=>.5});
  const expectedEv:TrainingPreview["expectedEv"]={};for(const [key,value] of Object.entries(p.statGains) as [GeneticStatKey,number][])expectedEv[key]=range(value);
  const expectedExperience:TrainingPreview["expectedExperience"]={};for(const [key,value] of Object.entries(p.experienceGains) as [CombatExperienceCategory,number][])expectedExperience[key]=range(value,.1);
  const behaviorChanges:TrainingPreview["behaviorChanges"]={};for(const [key,value] of Object.entries(p.behaviorGains) as [keyof BehavioralProfile,number][])behaviorChanges[key]=range(Math.abs(value),.1);
  return {version:3,programId:ctx.program.id,category:ctx.session.category,intensity:ctx.session.intensity,expectedEv,expectedExperience,behaviorChanges,energyCost:p.energyCost,trainingPointCost:ctx.session.trainingPointCost,fatigueGain:p.fatigueGain,stressChange:p.stressChange,conditionChange:p.conditionChange,trainingEfficiency:Number(p.efficiency.toFixed(4)),estimatedBreakthroughChance:Number(p.breakthroughChance.toFixed(6)),injuryRisk:Number(p.injuryRisk.toFixed(6)),potentialDiscoveryChance:Number(p.potentialDiscoveryChance.toFixed(6)),wastedEv:p.wastedEv};
}
