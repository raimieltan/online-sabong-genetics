"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

function Pole({ position, scale = [1,1,1], rotation = [0,0,0] }: { position:[number,number,number]; scale?:[number,number,number]; rotation?:[number,number,number] }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[.055,.075,1.8,7]} /><meshStandardMaterial color="#80602f" roughness={.92} /></mesh>;
}

function Fence() {
  const sides: Array<{ p:[number,number,number]; r:[number,number,number]; count:number }> = [
    {p:[0,0,-6],r:[0,0,0],count:13},{p:[0,0,6],r:[0,0,0],count:13},{p:[-7,0,0],r:[0,Math.PI/2,0],count:10},{p:[7,0,0],r:[0,Math.PI/2,0],count:10},
  ];
  return <group>{sides.flatMap((side, si) => Array.from({length:side.count},(_,i) => { const along=(i-(side.count-1)/2)*1.05; const pos:[number,number,number]=side.r[1] ? [side.p[0],.75,along] : [along,.75,side.p[2]]; return <Pole key={`${si}-${i}`} position={pos} rotation={[0,0,(i%2?-.025:.025)]} />; }))}{sides.flatMap((side,si) => [.45,1.08].map((y) => <mesh key={`${si}-rail-${y}`} position={[side.p[0],y,side.p[2]]} rotation={side.r[1]?[Math.PI/2,0,0]:[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.045,.055,side.r[1]?12:14,7]} /><meshStandardMaterial color="#68491f" roughness={.9} /></mesh>))}</group>;
}

function Shelter({ elite = false }: { elite?: boolean }) {
  return <group position={[-4.7,0,-3.9]}>{[[-1.4,1.15,-1],[1.4,1.15,-1],[-1.4,1.15,1],[1.4,1.15,1]].map((p,i)=><Pole key={i} position={p as [number,number,number]} scale={[1,1.3,1]} />)}<mesh position={[0,2.32,0]} rotation={[0,0,.03]} castShadow><boxGeometry args={[3.4,.12,2.55]} /><meshStandardMaterial color={elite?"#7a3b23":"#5c351d"} roughness={.9} /></mesh><mesh position={[0,.65,-1.08]} receiveShadow><boxGeometry args={[3.2,1.3,.08]} /><meshStandardMaterial color="#4d321c" roughness={1} /></mesh></group>;
}

function EquipmentRack() { return <group position={[-5.7,0,1.2]}><mesh position={[0,.7,0]} castShadow><boxGeometry args={[1.35,.08,.42]} /><meshStandardMaterial color="#6a4726" /></mesh>{[-.55,.55].map(x=><Pole key={x} position={[x,.65,0]} scale={[.8,.75,.8]} />)}{[-.35,0,.35].map((x,i)=><mesh key={x} position={[x,.98,0]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.16+i*.025,.045,8,16]} /><meshStandardMaterial color="#2e2820" roughness={.9} /></mesh>)}</group>; }

function PrestigeDecor() {
  const banner=useRef<THREE.Mesh>(null); useFrame(({clock})=>{if(banner.current)banner.current.rotation.y=Math.sin(clock.elapsedTime*1.2)*.06;});
  return <group><group position={[0,0,-5.75]}><Pole position={[-1.3,1.2,0]} scale={[1,1.4,1]} /><Pole position={[1.3,1.2,0]} scale={[1,1.4,1]} /><mesh ref={banner} position={[0,1.8,.02]}><planeGeometry args={[2.3,.75,8,3]} /><meshStandardMaterial color="#7e281f" side={2} roughness={.8} /></mesh><mesh position={[0,1.82,.04]}><torusGeometry args={[.2,.035,10,24]} /><meshStandardMaterial color="#d4a24e" metalness={.6} /></mesh></group><group position={[5.8,0,-4.5]}>{[0,.42,.84].map((x,i)=><mesh key={x} position={[x,.32+i*.12,0]} castShadow><cylinderGeometry args={[.12,.2,.4+i*.1,12]} /><meshStandardMaterial color="#c79738" metalness={.55} roughness={.3} /></mesh>)}</group></group>;
}

export function TrainingCampEnvironment({ level }: { level: number }) {
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[9,64]} /><meshStandardMaterial color="#624329" roughness={1} /></mesh>
    <mesh position={[0,-.045,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[10.5,64]} /><meshStandardMaterial color="#26371f" roughness={1} /></mesh>
    <Fence /><Shelter elite={level>=5} />
    <mesh position={[5.7,.25,-4.8]} castShadow><boxGeometry args={[1.1,.5,.75]} /><meshStandardMaterial color="#5b3c21" roughness={1} /></mesh>
    <mesh position={[6.2,.2,-3.7]} rotation={[0,.35,Math.PI/2]} castShadow><cylinderGeometry args={[.3,.3,.25,14]} /><meshStandardMaterial color="#29251e" roughness={1} /></mesh>
    {level>=2 && <group position={[2.8,0,-4.8]}><Pole position={[-1,1.1,0]} scale={[1,1.2,1]} /><Pole position={[1,1.1,0]} scale={[1,1.2,1]} /><mesh position={[0,2.08,0]} castShadow><boxGeometry args={[2.5,.1,1.5]} /><meshStandardMaterial color="#76502b" /></mesh></group>}
    {level>=3 && <EquipmentRack />}
    {level>=4 && <group position={[-6,0,3.9]}><mesh position={[0,.36,0]} castShadow><boxGeometry args={[1.6,.72,.8]} /><meshStandardMaterial color="#a8a18b" roughness={.8} /></mesh><mesh position={[0,.75,0]}><boxGeometry args={[.5,.12,.08]} /><meshStandardMaterial color="#8e2e2a" /></mesh></group>}
    {level>=5 && <PrestigeDecor />}
    {Array.from({length:level+2},(_,i)=><mesh key={i} position={[-6.7+i*1.7,.08,5.5-(i%2)*.25]} castShadow><boxGeometry args={[.65,.16,.32]} /><meshStandardMaterial color="#796047" roughness={1} /></mesh>)}
  </group>;
}
