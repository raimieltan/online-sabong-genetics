import { NextResponse } from "next/server";
import { getOrCreatePlayer } from "@/lib/player";
import { previewTrainingForChicken } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";
import { TRAINING_PROGRAMS } from "@/lib/facilities/config";
import type { ProgramId } from "@/lib/facilities/types";
import { TRAINING_CATEGORIES, TRAINING_INTENSITIES, type TrainingCategory, type TrainingIntensity } from "@/lib/types";

export async function POST(request:Request){
  const player=await getOrCreatePlayer();const body=await request.json() as {chickenId?:string;programId?:string;category?:string;intensity?:string};
  if(!body.chickenId||!body.programId||!(body.programId in TRAINING_PROGRAMS))return NextResponse.json({error:"PROGRAM_NOT_FOUND"},{status:400});
  const category=body.category&&TRAINING_CATEGORIES.includes(body.category as TrainingCategory)?body.category as TrainingCategory:undefined;
  const intensity=body.intensity&&TRAINING_INTENSITIES.includes(body.intensity as TrainingIntensity)?body.intensity as TrainingIntensity:undefined;
  try{return NextResponse.json(await previewTrainingForChicken(player.id,body.chickenId,body.programId as ProgramId,category,intensity));}catch(error){if(error instanceof FacilityError)return NextResponse.json({error:error.code},{status:error.status});throw error;}
}
