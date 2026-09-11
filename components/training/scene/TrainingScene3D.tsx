"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";

import type { SessionDTO } from "@/components/training/types";
import type { Chicken } from "@/lib/types";
import type { ProgramId } from "@/lib/facilities/types";
import { resolveTrainingStation, visibleTrainingStations } from "@/lib/training/visuals/stations";
import type { TrainingStationDefinition } from "@/lib/training/visuals/types";
import { TrainingCampEnvironment } from "./TrainingCampEnvironment";
import { TrainingCameraController } from "./TrainingCameraController";
import { TrainingStation } from "./TrainingStation";
import { SparringPair, TrainingRooster } from "./TrainingVisualizationController";

function Scene({ level, chickens, sessions, selectedChickenId, selectedProgramId, onStationSelect }: { level:number; chickens:Chicken[]; sessions:SessionDTO[]; selectedChickenId:string; selectedProgramId:ProgramId|null; onStationSelect?:(station:TrainingStationDefinition)=>void }) {
  const selectedChicken=chickens.find(chicken=>chicken.id===selectedChickenId) ?? chickens[0];
  const selectedSession=sessions.find(session=>session.chickenId===selectedChicken?.id);
  const selectedStation=selectedSession?resolveTrainingStation(selectedSession.programId):selectedProgramId?resolveTrainingStation(selectedProgramId):undefined;
  const visible=useMemo(()=>visibleTrainingStations(level),[level]);
  const renderSessions=useMemo(()=>{
    const prioritized=[...sessions].sort((a,b)=>Number(b.chickenId===selectedChickenId)-Number(a.chickenId===selectedChickenId));
    return prioritized.slice(0,3);
  },[sessions,selectedChickenId]);
  const renderedIds=new Set(renderSessions.map(session=>session.chickenId));
  const previewStation=selectedStation ?? { ...resolveTrainingStation("STRENGTH"), id:"central_yard" as const, position:[0,0,0] as [number,number,number], prop:"none" as const, label:"Central Yard" };

  return <>
    <color attach="background" args={["#16150f"]} /><fog attach="fog" args={["#252016",10,24]} />
    <hemisphereLight args={["#f4d69a","#1e2b19",1.45]} />
    <directionalLight position={[-6,10,5]} intensity={2.4} color="#ffd58a" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
    <TrainingCampEnvironment level={level} />
    {visible.map(station=><TrainingStation key={station.id} station={station} selected={station.id===selectedStation?.id} onSelect={onStationSelect} />)}
    {renderSessions.map((session)=>{const chicken=chickens.find(item=>item.id===session.chickenId);if(!chicken)return null;const station=resolveTrainingStation(session.programId);const sparring=session.programId==="CONTROLLED_SPARRING"||session.programId==="HARD_SPARRING";const opponent=chickens.find(item=>item.id!==chicken.id)??chicken;return sparring?<SparringPair key={session.id} chicken={chicken} opponent={opponent} session={session} selected={chicken.id===selectedChickenId} />:<TrainingRooster key={session.id} chicken={chicken} station={station} session={session} selected={chicken.id===selectedChickenId} />;})}
    {selectedChicken&&!renderedIds.has(selectedChicken.id)&&<TrainingRooster chicken={selectedChicken} station={previewStation} selected />}
    <ContactShadows position={[0,.01,0]} opacity={.38} scale={16} blur={2.8} far={7} />
 <TrainingCameraController
  focusPosition={selectedStation?.position}
/>
  </>;
}

export function TrainingScene3D(props: { level:number; chickens:Chicken[]; sessions:SessionDTO[]; selectedChickenId:string; selectedProgramId:ProgramId|null; onStationSelect?:(station:TrainingStationDefinition)=>void }) {
  const sceneContainer=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=sceneContainer.current;if(!element)return;
    // Chrome represents trackpad pinch as ctrl+wheel. Without controls in this
    // scene that gesture falls through to browser page zoom, shrinking the
    // entire application (nav and HUD included). Keep it local to the canvas.
    const preventPinchWheel=(event:WheelEvent)=>{if(event.ctrlKey)event.preventDefault();};
    const preventGesture=(event:Event)=>event.preventDefault();
    element.addEventListener("wheel",preventPinchWheel,{passive:false});
    element.addEventListener("gesturestart",preventGesture,{passive:false});
    element.addEventListener("gesturechange",preventGesture,{passive:false});
    element.addEventListener("gestureend",preventGesture,{passive:false});
    return()=>{element.removeEventListener("wheel",preventPinchWheel);element.removeEventListener("gesturestart",preventGesture);element.removeEventListener("gesturechange",preventGesture);element.removeEventListener("gestureend",preventGesture);};
  },[]);
  return   <div
    ref={sceneContainer}
    className="relative h-[520px] w-full touch-none overflow-hidden rounded-[inherit] bg-[#17130e]"
  >
    <Canvas shadows dpr={[1,1.5]} camera={{position:[0,14,12],fov:42,near:.1,far:70}} gl={{antialias:true,powerPreference:"high-performance"}}>
      <Suspense fallback={null}><Scene {...props} /></Suspense>
    </Canvas>
  </div>;
}
