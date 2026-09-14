import { declineMultiplier, deriveLifeStage } from "../career/aging";
import { INTENSITY_MULTIPLIERS } from "./intensity";
import { trainingEffectiveness } from "./limits";
import type { BehavioralProfile, CombatExperienceCategory, GeneticStatKey, TrainingCategory } from "../types";
import type { TrainingResolutionContext } from "./types";

export function normalizeIntensity(value:string|undefined): "light"|"normal"|"hard"|"extreme" { return value === "moderate" || !value ? "normal" : value as "light"|"normal"|"hard"|"extreme"; }
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const PRIMARY_BY_CATEGORY:Record<TrainingCategory,GeneticStatKey>={strength:"power",speed:"speed",agility:"agility",defense:"defense",stamina:"stamina",technique:"accuracy",recovery:"stamina",discipline:"accuracy"};
/** Small global pacing lift for permanent development rewards; resource costs and risks stay unchanged. */
export const TRAINING_GAIN_MULTIPLIER=1.15;
export function calculateTrainingProjection(ctx:TrainingResolutionContext) {
  const intensity=INTENSITY_MULTIPLIERS[ctx.session.intensity];
  const physicalLife=declineMultiplier(deriveLifeStage(ctx.chicken));
  const learningLife=deriveLifeStage(ctx.chicken)==="decline"?.95:1;
  const fatigueEfficiency=trainingEffectiveness(ctx.trainingState.trainingFatigue);
  const stressEfficiency=clamp(1-(ctx.chicken.stress??0)/500,.8,1);
  const efficiency=fatigueEfficiency*stressEfficiency;
  const fastLearner=ctx.roosterTraining.traits.some(t=>t.id==="fast_learner")?1.1:1;
  const overtrainedPenalty=ctx.roosterTraining.traits.some(t=>t.id==="overtrained")?.9:1;
  const weights=ctx.program.category==="custom"?{[PRIMARY_BY_CATEGORY[ctx.session.category]]:1}:{...(ctx.program.primaryStats??{}),...(ctx.program.secondaryStats??{})};
  const statGains:Partial<Record<GeneticStatKey,number>>={};
  const wastedEv:Partial<Record<GeneticStatKey,number>>={};
  for(const [key,weight] of Object.entries(weights) as [GeneticStatKey,number][]){
    const potential=ctx.roosterTraining.trainingPotential[key];
    const potentialMultiplier=.85+potential*.003;
    const desired=ctx.program.baseEvGain*weight*ctx.facility.efficiency*efficiency*intensity.evGain*physicalLife*potentialMultiplier*fastLearner*overtrainedPenalty*TRAINING_GAIN_MULTIPLIER;
    const effortHeadroom=Math.max(0,Math.min(100-ctx.roosterTraining.effortSpent[key],500-Object.values(ctx.roosterTraining.effortSpent).reduce((a,b)=>a+b,0)));
    const actual=Math.max(0,Math.min(desired,100-ctx.chicken.ev[key],potential-ctx.chicken.ev[key],effortHeadroom));
    statGains[key]=actual; wastedEv[key]=Math.max(0,desired-actual);
  }
  const experienceGains:Partial<Record<CombatExperienceCategory,number>>={};
  for(const [key,base] of Object.entries(ctx.program.experienceGain??{}) as [CombatExperienceCategory,number][]) experienceGains[key]=base*ctx.facility.experienceMultiplier*intensity.evGain*efficiency*learningLife*fastLearner*TRAINING_GAIN_MULTIPLIER;
  const behaviorGains:Partial<Record<keyof BehavioralProfile,number>>={};
  for(const [key,base] of Object.entries(ctx.program.behaviorEffects??{}) as [keyof BehavioralProfile,number][]) behaviorGains[key]=base*intensity.evGain*efficiency*learningLife*TRAINING_GAIN_MULTIPLIER;
  const recoverySkill=Math.min(.15,(ctx.roosterTraining.recoveryXP/1000)+(ctx.program.recoveryModifier??0));
  const fatigueGain=Math.max(1,Math.round(ctx.session.fatigueCost*ctx.facility.fatigueMultiplier*(1-recoverySkill)));
  const energyCost=Math.max(1,ctx.session.energyCost);
  const stressChange=Math.round(ctx.session.stressCost+Math.max(0,ctx.trainingState.trainingFatigue-65)/12);
  const load=Object.values(ctx.program.temporaryLoad??{}).reduce((a,b)=>a+Math.abs(b),0);
  const conditionChange=-(ctx.program.recoveryModifier?Math.max(1,Math.ceil(fatigueGain*.1)):Math.max(1,Math.ceil(fatigueGain*.22+load*.1)));
  const fatigueRisk=.1+.9*Math.pow(clamp((ctx.trainingState.trainingFatigue+fatigueGain)/100,0,1),3);
  const conditionRisk=1+(100-(ctx.chicken.condition??100))/100;
  const trainingTraitRisk=(ctx.roosterTraining.traits.some(t=>t.id==="iron_body")?.75:1)*(ctx.roosterTraining.traits.some(t=>t.id==="overtrained")?1.4:1);
  const injuryRisk=clamp(ctx.program.baseInjuryRisk*intensity.injuryChance*fatigueRisk*conditionRisk*ctx.facility.injuryMultiplier*trainingTraitRisk*(deriveLifeStage(ctx.chicken)==="decline"?1.35:1)*(1+((ctx.chicken.injuries?.filter(i=>i.permanent||i.recoveryRemaining>0).length??0)*.2)),0,.25);
  const avgPotential=Object.keys(weights).length?Object.keys(weights).reduce((s,k)=>s+ctx.roosterTraining.trainingPotential[k as GeneticStatKey],0)/Object.keys(weights).length:50;
  const breakthroughChance=clamp(ctx.program.baseBreakthroughChance*intensity.breakthrough*(.85+avgPotential*.003)*ctx.facility.breakthroughMultiplier*efficiency,0,.12);
  const potentialDiscoveryChance=clamp(.05*ctx.facility.potentialDiscoveryMultiplier*(ctx.program.tags.includes("sparring")?1.6:1)*efficiency,0,.3);
  return {efficiency,statGains,wastedEv,experienceGains,behaviorGains,fatigueGain,energyCost,stressChange,conditionChange,injuryRisk,breakthroughChance,potentialDiscoveryChance};
}
