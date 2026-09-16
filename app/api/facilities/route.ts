import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { claimExpiredSessions, facilityView, getOrCreateTrainingGym } from "@/lib/facilities/service";
import { prisma } from "@/lib/db";

export async function GET(){
  try{
  const player=await requirePlayer();await claimExpiredSessions(player.id);const facility=await getOrCreateTrainingGym(player.id);
  const [activeSessions,completedSessions]=await Promise.all([
    prisma.trainingSession.findMany({where:{playerId:player.id,status:"ACTIVE"},orderBy:{startedAt:"asc"}}),
    prisma.trainingSession.findMany({where:{playerId:player.id,status:"COMPLETED"},orderBy:{completedAt:"desc"},take:20}),
  ]);
  return NextResponse.json({facility:facilityView(facility),activeSessions,completedSessions});
  }catch(error){return toErrorResponse(error);}
}
