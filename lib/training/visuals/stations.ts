import type { ProgramId } from "../../facilities/types";
import type { TrainingStationDefinition } from "./types";

export const TRAINING_STATIONS: readonly TrainingStationDefinition[] = [
  { id:"strength_post",label:"Strength Post",programs:["STRENGTH","POWER_CONDITIONING","EXPLOSIVE_CONDITIONING","PRECISION_STRENGTH"],position:[-4,0,-1.2],rotation:Math.PI/2,minimumGymLevel:1,animationSequence:"heavy_strikes",cameraPreset:"physical_close",prop:"post" },
  { id:"sprint_lane",label:"Sprint Lane",programs:["SPEED","SPRINT","PRECISION_SPEED"],position:[0,0,-3.6],rotation:0,minimumGymLevel:1,animationSequence:"sprint_shuttles",cameraPreset:"lane_wide",prop:"lane" },
  { id:"footwork_markers",label:"Footwork Yard",programs:["AGILITY","FOOTWORK_CIRCUIT","ADVANCED_AGILITY","BALANCE"],position:[3.4,0,-2.2],rotation:-Math.PI/3,minimumGymLevel:1,animationSequence:"footwork_circuit",cameraPreset:"technique_close",prop:"markers" },
  { id:"endurance_lane",label:"Conditioning Track",programs:["ENDURANCE","ADVANCED_ENDURANCE","ADVANCED_CONDITIONING"],position:[-3.5,0,2.5],rotation:Math.PI/3,minimumGymLevel:1,animationSequence:"endurance_loop",cameraPreset:"lane_wide",prop:"lane" },
  { id:"target_pad",label:"Accuracy Pad",programs:["REACTION","TARGET_DRILLS"],position:[3.8,0,1.2],rotation:-Math.PI/2,minimumGymLevel:1,animationSequence:"precision_target",cameraPreset:"technique_close",prop:"bag" },
  { id:"reaction_rig",label:"Reaction Rig",programs:["COUNTER_DRILLS","ADVANCED_REACTION","PRECISION_REACTION"],position:[5,0,3],rotation:-Math.PI/2,minimumGymLevel:2,animationSequence:"counter_target",cameraPreset:"technique_close",prop:"reaction" },
  { id:"discipline_post",label:"Tactics Corner",programs:["DEFENSIVE_DRILLS","PRESSURE_DRILLS","DISCIPLINE_TRAINING","ADVANCED_ADAPTATION"],position:[-1,0,2],rotation:0,minimumGymLevel:2,animationSequence:"discipline_drill",cameraPreset:"fighter_close",prop:"markers" },
  { id:"recovery_corner",label:"Recovery Corner",programs:["RECOVERY_TRAINING","SPECIALIZED_CONDITIONING"],position:[-5,0,4],rotation:Math.PI/4,minimumGymLevel:3,animationSequence:"recovery_drill",cameraPreset:"recovery_close",prop:"water" },
  { id:"sparring_pen",label:"Sparring Pen",programs:["CONTROLLED_SPARRING","HARD_SPARRING"],position:[1.4,0,4.2],rotation:0,opponentPosition:[1.2,0,0],minimumGymLevel:3,animationSequence:"controlled_sparring",cameraPreset:"sparring_wide",prop:"pen" },
  { id:"central_yard",label:"Open Yard",programs:["CUSTOM_TRAINING"],position:[0,0,0],rotation:0,minimumGymLevel:1,animationSequence:"generic_technique",cameraPreset:"fighter_close",prop:"none" },
];

const fallback = TRAINING_STATIONS.find((station) => station.id === "central_yard")!;

export function resolveTrainingStation(programId: ProgramId): TrainingStationDefinition {
  return TRAINING_STATIONS.find((station) => station.programs.includes(programId)) ?? fallback;
}

export function visibleTrainingStations(level: number): TrainingStationDefinition[] {
  return TRAINING_STATIONS.filter((station) => station.minimumGymLevel <= level);
}
