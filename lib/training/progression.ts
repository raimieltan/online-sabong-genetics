import type { ProgramDefinition } from "../facilities/types";
import type { CombatExperience, RoosterTrainingState, Trait } from "../types";

export const DEVELOPMENT_TRAITS: Record<string,Trait> = {
  "counter-specialist":{id:"counter-specialist",name:"Counter Specialist",rarity:"rare",description:"Recognizes and punishes committed attacks more reliably."},
  "pressure-fighter":{id:"pressure-fighter",name:"Pressure Fighter",rarity:"rare",description:"Maintains pursuit and offensive tempo."},
  "iron-conditioning":{id:"iron-conditioning",name:"Iron Conditioning",rarity:"uncommon",description:"Responds exceptionally well to conditioning work."},
  "sharp-eyes":{id:"sharp-eyes",name:"Sharp Eyes",rarity:"uncommon",description:"Reads targets and openings with unusual precision."},
  "disciplined-fighter":{id:"disciplined-fighter",name:"Disciplined Fighter",rarity:"rare",description:"Keeps composure and follows tactical direction."},
  "elusive-fighter":{id:"elusive-fighter",name:"Elusive Fighter",rarity:"rare",description:"Prefers efficient movement and safe positioning."},
  "heavy-hitter":{id:"heavy-hitter",name:"Heavy Hitter",rarity:"rare",description:"Commits to trained power with confidence."},
  "patient-reader":{id:"patient-reader",name:"Patient Reader",rarity:"rare",description:"Waits for stronger commitment before reacting."},
};
const SPECIALIZATIONS=["aggressive","counter","endurance","defensive","pressure","adaptive","balanced"] as const;
export function progressTraits(state:RoosterTrainingState,program:ProgramDefinition,multiplier:number){
  const changes:Record<string,number>={}; const next={...state.traitProgress};
  for(const tag of program.traitTags??[]){const gain=(program.tags.includes("sparring")?5:3)*multiplier; changes[tag]=gain; next[tag]=Math.min(100,(next[tag]??0)+gain);}
  return {next,changes,eligible:Object.keys(next).filter(id=>next[id]>=100&&DEVELOPMENT_TRAITS[id])};
}
export function progressSpecialization(state:RoosterTrainingState,program:ProgramDefinition,multiplier:number,experience:CombatExperience){
  const changes:Record<string,number>={}; const next={...state.specializationProgress};
  const add=(id:string,n:number)=>{changes[id]=(changes[id]??0)+n;next[id]=(next[id]??0)+n;};
  if(program.tags.includes("counter"))add("counter",4*multiplier); if(program.tags.includes("pressure"))add("pressure",4*multiplier);
  if(program.tags.includes("evasion"))add("adaptive",3*multiplier); if(program.tags.includes("defense"))add("defensive",4*multiplier);
  if(program.tags.includes("stamina")||program.tags.includes("conditioning"))add("endurance",4*multiplier);
  if(program.tags.includes("offensive")||program.tags.includes("power"))add("aggressive",2*multiplier);
  if(Object.keys(changes).length===0)add("balanced",2*multiplier);
  const score=(id:string)=>(next[id]??0)+(id==="counter"?experience.counter*.3:id==="pressure"?experience.pressure*.3:id==="adaptive"?experience.adaptation*.3:0);
  const specialization=[...SPECIALIZATIONS].sort((a,b)=>score(b)-score(a))[0];
  return {next,changes,specialization};
}
