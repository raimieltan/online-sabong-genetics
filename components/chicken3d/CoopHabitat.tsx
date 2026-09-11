"use client";

import { Text } from "@react-three/drei";

import type { HabitatStyle, VillageZone } from "@/lib/coopVillage";

const WOOD = "#604329";
const BAMBOO = "#a77b43";

function Rail({ position, rotation = [0, 0, Math.PI / 2], length = 1.7 }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
}) {
  return <mesh position={position} rotation={rotation} castShadow><cylinderGeometry args={[.025,.035,length,6]} /><meshStandardMaterial color={BAMBOO} roughness={.86} /></mesh>;
}

function LowFence() {
  return <group>
    {[-.82,.82].map((x) => <mesh key={`post-${x}`} position={[x,.27,-.52]} castShadow><cylinderGeometry args={[.035,.045,.55,6]} /><meshStandardMaterial color={WOOD} roughness={.9} /></mesh>)}
    <Rail position={[0,.18,-.52]} /><Rail position={[0,.4,-.52]} />
    <Rail position={[-.82,.2,.05]} rotation={[Math.PI/2,0,0]} length={1.15} />
  </group>;
}

export function CoopHabitat({ position, facingY, style, zone, name }: {
  position: [number, number, number];
  facingY: number;
  style: HabitatStyle;
  zone: VillageZone;
  name: string;
}) {
  const champion = style === "champion";
  const recovering = zone === "recovery";
  const young = zone === "young";

  return (
    <group position={position} rotation={[0, facingY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, -.08]} position={[0,.008,0]} receiveShadow>
        <planeGeometry args={[1.85,1.45]} />
        <meshStandardMaterial color={young ? "#6b5135" : "#5a3b24"} roughness={1} transparent opacity={.38} />
      </mesh>
      <LowFence />

      {/* A small practical shade cover replaces the old cone/teepee pedestal. */}
      <group position={[.48,0,-.37]}>
        {[-.45,.45].map((x) => <mesh key={x} position={[x,.55,0]} castShadow><cylinderGeometry args={[.025,.035,1.1,6]} /><meshStandardMaterial color={WOOD} roughness={.9} /></mesh>)}
        <mesh position={[0,1.05,0]} rotation={[0,0,.08]} castShadow receiveShadow>
          <boxGeometry args={[1.12,.06,.82]} />
          <meshStandardMaterial color={recovering ? "#8b755b" : champion ? "#9a6232" : "#75502e"} roughness={.96} />
        </mesh>
        {[-.45,-.22,0,.22,.45].map((x) => <Rail key={x} position={[x,1.08,0]} rotation={[Math.PI/2,0,0]} length={.9} />)}
      </group>

      {/* Feed/water bowl grounds the pen as a functional home. */}
      <mesh position={[-.48,.08,.25]} castShadow><cylinderGeometry args={[.2,.16,.12,14]} /><meshStandardMaterial color="#6e5540" metalness={.12} roughness={.72} /></mesh>
      <mesh position={[-.48,.145,.25]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.14,14]} /><meshStandardMaterial color={recovering ? "#648090" : "#b88b42"} roughness={.55} /></mesh>

      <group position={[-.03,.72,-.57]}>
        <mesh castShadow><boxGeometry args={[.85,.24,.055]} /><meshStandardMaterial color={champion ? "#916326" : "#3e2a1b"} roughness={.9} /></mesh>
        <Text position={[0,0,.032]} fontSize={.105} maxWidth={.72} color={champion ? "#f2c76c" : "#dcc8a1"} anchorX="center" anchorY="middle">{name.toUpperCase()}</Text>
      </group>

      {recovering && <group position={[.62,.78,-.02]}><mesh><boxGeometry args={[.34,.34,.025]} /><meshStandardMaterial color="#e1d6bb" roughness={.9} /></mesh><mesh position={[0,0,.02]}><boxGeometry args={[.09,.26,.025]} /><meshStandardMaterial color="#a53f37" /></mesh><mesh position={[0,0,.021]}><boxGeometry args={[.26,.09,.025]} /><meshStandardMaterial color="#a53f37" /></mesh></group>}
      {champion && <mesh position={[0,1.02,-.58]} castShadow><octahedronGeometry args={[.11,0]} /><meshStandardMaterial color="#e2b758" metalness={.58} roughness={.28} emissive="#6b4510" emissiveIntensity={.25} /></mesh>}
    </group>
  );
}
