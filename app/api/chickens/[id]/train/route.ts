import { NextResponse } from "next/server";
import { getOrCreatePlayer } from "@/lib/player";
import { startTrainingSession } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";
import { GENETIC_STAT_KEYS, TRAINING_INTENSITIES, type GeneticStatKey, type TrainingIntensity } from "@/lib/types";
import type { ProgramId } from "@/lib/facilities/types";

const PROGRAM_BY_STAT:Record<GeneticStatKey,ProgramId>={power:"STRENGTH",speed:"SPEED",agility:"AGILITY",defense:"DEFENSIVE_DRILLS",stamina:"ENDURANCE",accuracy:"REACTION"};

/** Legacy compatibility entry point. It now schedules the same server-authoritative timed V3 session as the Gym. */
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const body=await request.json() as {stat?:string;intensity?:string};
  if(!body.stat||!GENETIC_STAT_KEYS.includes(body.stat as GeneticStatKey))return NextResponse.json({error:"Invalid stat"},{status:400});
  if(body.intensity&&!TRAINING_INTENSITIES.includes(body.intensity as TrainingIntensity))return NextResponse.json({error:"Invalid intensity"},{status:400});
  const player=await getOrCreatePlayer();
  try{const session=await startTrainingSession(player.id,id,PROGRAM_BY_STAT[body.stat as GeneticStatKey],undefined,body.intensity as TrainingIntensity|undefined);return NextResponse.json(session,{status:202});}catch(error){if(error instanceof FacilityError)return NextResponse.json({error:error.code},{status:error.status});throw error;}
}
