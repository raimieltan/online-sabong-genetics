"use client";

import { useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

import type { TrainingStationDefinition } from "@/lib/training/visuals/types";

function Bamboo({ position, height = 1.8, rotation = [0, 0, 0] }: { position: [number, number, number]; height?: number; rotation?: [number, number, number] }) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[.055,.075,height,7]} /><meshStandardMaterial color="#86622d" roughness={.9} /></mesh>;
}

function StationProp({ station }: { station: TrainingStationDefinition }) {
  const moving = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!moving.current) return;
    const t = clock.elapsedTime;
    if (station.prop === "bag") moving.current.rotation.z = Math.sin(t * 1.7) * .14;
    if (station.prop === "reaction") moving.current.rotation.y = Math.sin(t * 2.1) * .8;
  });

  if (station.prop === "post") return <group><Bamboo position={[.75,.9,0]} height={1.8} /><mesh position={[.58,1.05,0]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.18,.18,.45,12]} /><meshStandardMaterial color="#6c241b" roughness={.82} /></mesh><mesh position={[.58,1.05,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.19,.025,6,16]} /><meshStandardMaterial color="#c09545" /></mesh></group>;
  if (station.prop === "bag" || station.prop === "reaction") return <group ref={moving}><Bamboo position={[.82,1.05,0]} height={2.1} /><Bamboo position={[.82,2.02,0]} height={.75} rotation={[0,0,Math.PI/2]} /><mesh position={[.46,1.25,0]} castShadow><capsuleGeometry args={[.18,.55,6,10]} /><meshStandardMaterial color={station.prop === "reaction" ? "#a1422d" : "#3d2b1d"} roughness={.8} /></mesh></group>;
  if (station.prop === "lane") return <group>{[-.48,.48].map((z) => <mesh key={z} position={[0,.012,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.7,.045]} /><meshBasicMaterial color="#d2a957" /></mesh>)}{[-1.7,-.85,0,.85,1.7].map((x) => <mesh key={x} position={[x,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.09,.13,12]} /><meshBasicMaterial color="#d86735" /></mesh>)}</group>;
  if (station.prop === "markers") return <group>{[0,1,2,3,4].map((i) => { const a=i*Math.PI*2/5; return <mesh key={i} position={[Math.cos(a)*.72,.035,Math.sin(a)*.72]} castShadow><coneGeometry args={[.09,.22,8]} /><meshStandardMaterial color="#d16b31" /></mesh>; })}</group>;
  if (station.prop === "water") return <group><mesh position={[.7,.18,0]} castShadow><cylinderGeometry args={[.42,.34,.36,16]} /><meshStandardMaterial color="#786445" metalness={.15} roughness={.7} /></mesh><mesh position={[.7,.37,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.32,16]} /><meshStandardMaterial color="#3c7182" metalness={.25} roughness={.25} /></mesh><Bamboo position={[-.2,.4,.55]} height={.8} rotation={[Math.PI/2,0,.25]} /></group>;
  if (station.prop === "pen") return <group>{[-1.5,1.5].flatMap((x) => [-1,1].map((z) => <Bamboo key={`${x}-${z}`} position={[x,.55,z]} height={1.1} />))}{[-1,1].map((z) => <mesh key={z} position={[0,.48,z]} castShadow><boxGeometry args={[3,.07,.07]} /><meshStandardMaterial color="#79572b" /></mesh>)}</group>;
  return null;
}

export function TrainingStation({ station, selected, onSelect }: { station: TrainingStationDefinition; selected: boolean; onSelect?: (station: TrainingStationDefinition) => void }) {
  return <group position={station.position} rotation={[0,station.rotation,0]} onClick={(event) => { event.stopPropagation(); onSelect?.(station); }}>
    <StationProp station={station} />
    <mesh position={[0,.018,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.82,.9,32]} />
      <meshBasicMaterial color={selected ? "#f0c674" : "#6f542b"} transparent opacity={selected ? .75 : .22} />
    </mesh>
    {selected && <Billboard position={[0,1.7,0]}><Text fontSize={.19} color="#f3d58e" outlineWidth={.015} outlineColor="#171008" anchorY="bottom">{station.label.toUpperCase()}</Text></Billboard>}
  </group>;
}
