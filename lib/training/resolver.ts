import { createInjuryRecord } from "../combat/injuries";
import { effectiveStat } from "../combat/stats";
import { potentialBand } from "./potential";
import { calculateTrainingProjection } from "./calculation";
import { DEVELOPMENT_TRAITS, progressSpecialization, progressTraits } from "./progression";
import type { BehavioralProfile, CombatExperience, CombatExperienceCategory, GeneticStatKey, InjurySeverity, StatBlock, Trait, TrainingHistoryEntry } from "../types";
import type { BreakthroughResult, PotentialDiscoveryResult, TrainingResolution, TrainingResolutionContext } from "./types";

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const round=(v:number,d=4)=>Number(v.toFixed(d));
export function resolveTrainingSession(ctx:TrainingResolutionContext):TrainingResolution{
  const p=calculateTrainingProjection(ctx), at=ctx.completedAt??Date.now();
  const nextEv={...ctx.chicken.ev} as StatBlock; const statChanges:Partial<Record<GeneticStatKey,number>>={};
  const effortSpent={...ctx.roosterTraining.effortSpent};
  for(const [key,gain] of Object.entries(p.statGains) as [GeneticStatKey,number][]){nextEv[key]=clamp(nextEv[key]+gain,0,100);effortSpent[key]+=gain;statChanges[key]=round(gain);}
  const nextExperience={...(ctx.chicken.experience??{})} as CombatExperience; const experienceChanges:Partial<Record<CombatExperienceCategory,number>>={};
  for(const [key,gain] of Object.entries(p.experienceGains) as [CombatExperienceCategory,number][]){nextExperience[key]=(nextExperience[key]??0)+gain;experienceChanges[key]=round(gain,2);}
  const nextBehavior={...(ctx.chicken.behavior??{})} as BehavioralProfile; const behaviorChanges:Partial<Record<keyof BehavioralProfile,number>>={};
  for(const [key,gain] of Object.entries(p.behaviorGains) as [keyof BehavioralProfile,number][]){const before=nextBehavior[key]??.5;nextBehavior[key]=clamp(before+gain,0,1);behaviorChanges[key]=round(nextBehavior[key]-before);}
  const traitProgress=progressTraits(ctx.roosterTraining,ctx.program,p.efficiency);
  const specialization=progressSpecialization(ctx.roosterTraining,ctx.program,p.efficiency,nextExperience);
  const nextTraits=[...(ctx.chicken.traits??[])] as Trait[]; let breakthrough:BreakthroughResult|undefined;
  if(ctx.rng()<p.breakthroughChance){
    const target=(Object.keys(statChanges)[0]??"accuracy") as GeneticStatKey; const tag=ctx.program.breakthroughTags?.[0]??ctx.program.tags[0]??ctx.session.category;
    const bonus=Math.min(1.2,100-nextEv[target],ctx.roosterTraining.trainingPotential[target]-nextEv[target]); if(bonus>0){nextEv[target]+=bonus;statChanges[target]=round((statChanges[target]??0)+bonus);effortSpent[target]+=bonus;}
    const xpKey=(Object.keys(experienceChanges)[0]??"adaptation") as CombatExperienceCategory; const xpBonus=ctx.program.tags.includes("sparring")?12:8; nextExperience[xpKey]=(nextExperience[xpKey]??0)+xpBonus; experienceChanges[xpKey]=round((experienceChanges[xpKey]??0)+xpBonus,2);
    const bKey=(Object.keys(behaviorChanges)[0]??"patience") as keyof BehavioralProfile; const bBonus=.008; const bBefore=nextBehavior[bKey]??.5;nextBehavior[bKey]=clamp(bBefore+bBonus,0,1);behaviorChanges[bKey]=round((behaviorChanges[bKey]??0)+(nextBehavior[bKey]-bBefore));
    const unlockId=traitProgress.eligible.find(id=>!nextTraits.some(t=>t.id===id)&&nextTraits.filter(t=>DEVELOPMENT_TRAITS[t.id]).length<5); const traitUnlocked=unlockId?DEVELOPMENT_TRAITS[unlockId]:undefined;if(traitUnlocked)nextTraits.push(traitUnlocked);
    breakthrough={id:`${ctx.session.id}:breakthrough`,tag,message:`A ${tag} development breakthrough reinforced this fighter's trained direction.`,statChanges:{[target]:round(bonus)},XPChanges:{[xpKey]:xpBonus},behaviorChanges:{[bKey]:bBonus},...(traitUnlocked?{traitUnlocked}:{})};
  }
  const discovered={...ctx.roosterTraining.discovered}; let potentialDiscovery:PotentialDiscoveryResult|undefined;
  const discoverable=(Object.keys(statChanges) as GeneticStatKey[]).filter(k=>!discovered[k]&&effortSpent[k]>=15);
  if(discoverable.length&&ctx.rng()<p.potentialDiscoveryChance){const stat=discoverable[Math.floor(ctx.rng()*discoverable.length)];discovered[stat]=true;const potential=ctx.roosterTraining.trainingPotential[stat];potentialDiscovery={stat,potential,band:potentialBand(potential),message:`${stat} training potential is now understood: ${potentialBand(potential)}.`};}
  let injury; const nextInjuries=[...(ctx.chicken.injuries??[])]; if(ctx.rng()<p.injuryRisk){let severity:InjurySeverity="minor";if((ctx.session.intensity==="extreme"||ctx.program.id==="HARD_SPARRING")&&ctx.rng()<.18)severity="serious";injury={...createInjuryRecord(ctx.rng,severity),id:`training-${ctx.session.id}`,incurredAt:at};nextInjuries.push(injury);}
  const nextEnergy=clamp(ctx.chicken.energy-p.energyCost,0,100), nextStress=clamp((ctx.chicken.stress??0)+p.stressChange,0,100), nextCondition=clamp((ctx.chicken.condition??100)+p.conditionChange,0,100);
  const nextFatigue=clamp(ctx.trainingState.trainingFatigue+p.fatigueGain,0,100), nextPoints=clamp(ctx.trainingState.trainingPoints-ctx.session.trainingPointCost,0,100);
  const resourceChanges={energy:nextEnergy-ctx.chicken.energy,trainingPoints:nextPoints-ctx.trainingState.trainingPoints,trainingFatigue:nextFatigue-ctx.trainingState.trainingFatigue,stress:nextStress-(ctx.chicken.stress??0),condition:nextCondition-(ctx.chicken.condition??100)};
  const effectiveStatChanges:TrainingResolution["persistedResult"]["effectiveStatChanges"]={}; const afterChicken={...ctx.chicken,ev:nextEv,traits:nextTraits};
  for(const key of Object.keys(statChanges) as GeneticStatKey[]){const before=effectiveStat(ctx.chicken,key),after=effectiveStat(afterChicken,key);effectiveStatChanges[key]={before:round(before),after:round(after),delta:round(after-before)};}
  const history:TrainingHistoryEntry={sessionId:ctx.session.id,programId:ctx.program.id,category:ctx.session.category,intensity:ctx.session.intensity,at,startedAt:ctx.session.startedAt.getTime(),completedAt:at,evChanges:statChanges,experienceChanges,behaviorChanges,fatigueChange:resourceChanges.trainingFatigue,energyChange:resourceChanges.energy,stressChange:resourceChanges.stress,conditionChange:resourceChanges.condition,traitProgress:traitProgress.changes,...(breakthrough?{breakthroughId:breakthrough.id}:{}),...(injury?{injuryId:injury.id}:{})};
  const nextTrainingState={trainingPoints:nextPoints,trainingFatigue:nextFatigue,history:[...ctx.trainingState.history,history].slice(-100)};
  const trainingTraits=[...ctx.roosterTraining.traits];
  if(breakthrough&&ctx.program.tags.some(t=>t==="conditioning"||t==="stamina")&&!trainingTraits.some(t=>t.id==="iron_body"))trainingTraits.push({id:"iron_body",grantedAt:at});
  else if(breakthrough&&ctx.program.tags.some(t=>t==="adaptation"||t==="sparring")&&!trainingTraits.some(t=>t.id==="fast_learner"))trainingTraits.push({id:"fast_learner",grantedAt:at});
  const priorExtremeStreak=[...ctx.trainingState.history].reverse().findIndex(h=>h.intensity!=="extreme");const extremeStreak=ctx.session.intensity==="extreme"?1+(priorExtremeStreak<0?ctx.trainingState.history.length:priorExtremeStreak):0;
  if(extremeStreak>=5&&nextFatigue>=85&&!trainingTraits.some(t=>t.id==="overtrained"))trainingTraits.push({id:"overtrained",grantedAt:at});
  const nextRoosterTraining={...ctx.roosterTraining,traits:trainingTraits,effortSpent,discovered,traitProgress:traitProgress.next,specializationProgress:specialization.next,combatXP:ctx.roosterTraining.combatXP+Object.values(experienceChanges).reduce((a,b)=>a+b,0),physicalXP:ctx.roosterTraining.physicalXP+Object.values(statChanges).reduce((a,b)=>a+b,0),disciplineXP:ctx.roosterTraining.disciplineXP+(ctx.session.category==="discipline"?5*p.efficiency:0),recoveryXP:ctx.roosterTraining.recoveryXP+(experienceChanges.recovery??0),breakthroughs:breakthrough?[...ctx.roosterTraining.breakthroughs,{stat:(Object.keys(statChanges)[0]??"accuracy") as GeneticStatKey,category:ctx.session.category,at,kind:"bonus_ev" as const}].slice(-50):ctx.roosterTraining.breakthroughs};
  const messages=[...Object.entries(statChanges).map(([k,v])=>`${k} +${v}`),...Object.entries(experienceChanges).map(([k,v])=>`${k} experience +${v}`)];if(potentialDiscovery)messages.push(potentialDiscovery.message);if(breakthrough)messages.push(breakthrough.message);if(injury)messages.push(`Training injury: ${injury.label}`);
  const persistedResult={version:3 as const,sessionId:ctx.session.id,chickenId:ctx.session.chickenId,programId:ctx.program.id,category:ctx.session.category,intensity:ctx.session.intensity,statChanges,effectiveStatChanges,experienceChanges,behaviorChanges,resourceChanges,readinessLoad:ctx.program.temporaryLoad??{},trainingEfficiency:round(p.efficiency),injuryRisk:round(p.injuryRisk,6),breakthroughChance:round(p.breakthroughChance,6),traitProgressChanges:traitProgress.changes,specializationProgressChanges:specialization.changes,specialization:specialization.specialization,...(potentialDiscovery?{potentialDiscovery}:{}),...(breakthrough?{breakthrough}:{}),...(injury?{injury}:{}),summary:{headline:`${ctx.program.name} complete`,messages},completedAt:at};
  return {persistedResult,nextEv,nextExperience,nextBehavior,nextTrainingState,nextRoosterTraining,nextTraits,nextInjuries,nextEnergy,nextStress,nextCondition,nextBattleHardening:clamp((ctx.chicken.battleHardening??0)+(ctx.program.battleHardeningGain??0),0,100)};
}
