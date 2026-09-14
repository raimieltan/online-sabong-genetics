"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { ChickenModel, PX_TO_WORLD, type FighterAnim } from "@/components/chicken3d/ChickenModel";
import type { SessionDTO } from "@/components/training/types";
import type { Chicken } from "@/lib/types";
import type { AnimIntent } from "@/lib/animation/types";
import { resolveTrainingSequence, TRAINING_ANIMATION_SEQUENCES, TRAINING_INTENSITY_PACE } from "@/lib/training/visuals/sequences";
import { resolveTrainingStation } from "@/lib/training/visuals/stations";
import type { TrainingAnimationStep, TrainingStationDefinition, TrainingVisualState } from "@/lib/training/visuals/types";

const blankAnim = (): FighterAnim => ({ offsetX:0,offsetY:0,offsetZ:0,rot:0,yaw:0,roll:0,scaleX:1.02,scaleY:1.02,flash:0,wingPhase:0,legPhase:0 });

function movement(step: TrainingAnimationStep, progress: number, anim: FighterAnim, mirrored: boolean) {
  const direction=mirrored?-1:1;
  const eased=Math.sin(progress*Math.PI);
  anim.offsetX=0; anim.offsetZ=0; anim.yaw=0;
  if(step.move==="forward") anim.offsetX=eased*22*direction;
  if(step.move==="back") anim.offsetX=-eased*13*direction;
  if(step.move==="circle_left"||step.move==="circle_right"){
    const turn=step.move==="circle_left"?1:-1;
    const angle=progress*Math.PI*1.4*turn*direction;
    anim.offsetX=Math.sin(angle)*18; anim.offsetZ=(Math.cos(angle)-1)*12; anim.yaw=-angle*.38;
  }
}

export function TrainingVisualizationController({ chicken, station, session, active, mirrored=false, selected=false }: { chicken:Chicken; station:TrainingStationDefinition; session?:SessionDTO; active:boolean; mirrored?:boolean; selected?:boolean }) {
  const anim=useRef<FighterAnim>(blankAnim());
  const intent=useRef<AnimIntent|null>(null);
  const visualState=useRef<TrainingVisualState>(active?"approach_station":"idle");
  const sequence=TRAINING_ANIMATION_SEQUENCES[resolveTrainingSequence(session?.programId,station.animationSequence)];
  const total=useMemo(()=>sequence.reduce((sum,item)=>sum+item.duration,0),[sequence]);
  const lastStep=useRef(-1);
  // A stable, arbitrary loop phase is sufficient when restoring an offline
  // session; the visual loop never attempts to reconstruct server state.
  const origin=useRef(active&&session ? session.id.split("").reduce((sum,char)=>sum+char.charCodeAt(0),0)%Math.max(1,total) : 0);
  const opponent=useRef(new THREE.Vector3(station.position[0]+(mirrored?-1:1),.55,station.position[2]));

  useFrame(({clock})=>{
    const pose=anim.current; if(!active){ pose.offsetX=0;pose.offsetZ=0;pose.yaw=0;return; }
    const pace=TRAINING_INTENSITY_PACE[session?.intensity ?? "normal"];
    let elapsed=(origin.current+clock.elapsedTime)*pace%total,index=0;
    while(elapsed>sequence[index].duration){elapsed-=sequence[index].duration;index=(index+1)%sequence.length;}
    const current=sequence[index], progress=Math.min(1,elapsed/current.duration);
    movement(current,progress,pose,mirrored); visualState.current=current.visualState;
    if(index!==lastStep.current){lastStep.current=index; intent.current={state:current.state,startedAt:performance.now(),speed:pace,facing:mirrored?"left":"right"};}
  });

  const scale=selected?1.5:1.34;
  return <group
  position={station.position}
  rotation={[0, station.rotation, 0]}
  scale={scale}
>
    {selected && <pointLight position={[0,1.3,.8]} color="#f1c76f" intensity={.75} distance={3} />}
    <ChickenModel colorScheme={chicken.colorScheme} sex={chicken.sex} growthStage={chicken.growthStage} physical={chicken.physical} mutations={chicken.mutations} combatAnim={anim} animIntent={intent} opponentPos={opponent} facing={mirrored?"left":"right"} />
  </group>;
}

export function TrainingRooster({ chicken, station, session, selected=false }: { chicken:Chicken; station:TrainingStationDefinition; session?:SessionDTO; selected?:boolean }) {
  return <TrainingVisualizationController chicken={chicken} station={station} session={session} active={Boolean(session)} selected={selected} />;
}

export function SparringPair({
  chicken,
  opponent,
  session,
  selected = false,
}: {
  chicken: Chicken;
  opponent: Chicken;
  session: SessionDTO;
  selected?: boolean;
}) {
  const station = resolveTrainingStation(session.programId);

  const MODEL_YAW_OFFSET = Math.PI / 20; 

  const spacing = 1.05;

  const left = {
    ...station,
    position: [
      station.position[0] - spacing,
      station.position[1],
      station.position[2],
    ] as [number, number, number],

    // Face right →
    rotation: MODEL_YAW_OFFSET,
  };

  const right = {
    ...station,
    position: [
      station.position[0] + spacing,
      station.position[1],
      station.position[2],
    ] as [number, number, number],

    // Face left ←
    rotation: -MODEL_YAW_OFFSET,
  };

  return (
    <>
      <TrainingVisualizationController
        chicken={chicken}
        station={left}
        session={session}
        active
        selected={selected}
      />

      <TrainingVisualizationController
        chicken={opponent}
        station={right}
        session={session}
        active
        mirrored
      />
    </>
  );
}

export const TRAINING_MODEL_WORLD_SCALE = PX_TO_WORLD;
