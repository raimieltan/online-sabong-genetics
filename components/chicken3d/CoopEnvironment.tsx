"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { mulberry32 } from "@/lib/coopVillage";

const BAMBOO = "#9a6e38";
const DARK_WOOD = "#49301d";
const THATCH = "#684426";

function useYardTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#68472c";
    ctx.fillRect(0, 0, size, size);
    const rand = mulberry32(6911);
    for (let i = 0; i < 1400; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const radius = .5 + rand() * 3;
      ctx.fillStyle = rand() > .62 ? "rgba(125,94,55,.24)" : rand() > .3 ? "rgba(57,39,24,.18)" : "rgba(67,87,43,.16)";
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.8, radius, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Worn, hand-shaped paths leave the middle as an open packed-dirt yard.
    ctx.strokeStyle = "rgba(164,119,67,.23)";
    ctx.lineCap = "round";
    [[55,380,230,280],[460,375,315,285],[95,90,220,225],[420,85,300,220]].forEach(([x1,y1,x2,y2], index) => {
      ctx.lineWidth = 25 + index * 3;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(256,256,x2,y2); ctx.stroke();
    });
    // A few footprints, intentionally imperfect and off-axis.
    ctx.fillStyle = "rgba(35,24,15,.2)";
    for (let i = 0; i < 34; i++) {
      const x = 150 + i * 7 + (rand() - .5) * 18;
      const y = 360 - i * 4 + (rand() - .5) * 14;
      ctx.beginPath(); ctx.ellipse(x,y,2.4,4.5,rand()-.5,0,Math.PI*2); ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);
}

function Pole({ position, height = 1, radius = .045, rotation = [0,0,0] }: {
  position: [number,number,number]; height?: number; radius?: number; rotation?: [number,number,number];
}) {
  return <mesh position={position} rotation={rotation} castShadow><cylinderGeometry args={[radius*.82,radius,height,7]} /><meshStandardMaterial color={BAMBOO} roughness={.88} /></mesh>;
}

function Roof({ width, depth, y, color = THATCH }: { width:number; depth:number; y:number; color?:string }) {
  return <group>
    <mesh position={[0,y,depth*.25]} rotation={[.38,0,0]} castShadow receiveShadow><boxGeometry args={[width,.08,depth*.62]} /><meshStandardMaterial color={color} roughness={.98} /></mesh>
    <mesh position={[0,y,-depth*.25]} rotation={[-.38,0,0]} castShadow receiveShadow><boxGeometry args={[width,.08,depth*.62]} /><meshStandardMaterial color={color} roughness={.98} /></mesh>
    {Array.from({length:Math.max(3,Math.round(width/.35))},(_,i) => <Pole key={i} position={[-width/2+i*(width/(Math.max(3,Math.round(width/.35))-1)),y+.015,0]} height={depth*1.05} radius={.018} rotation={[Math.PI/2,0,0]} />)}
  </group>;
}

function Lantern({ position, scale = 1 }: { position:[number,number,number]; scale?:number }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({clock}) => { if (light.current) light.current.intensity = 1.1 + Math.sin(clock.elapsedTime * 6 + position[0]) * .12; });
  return <group position={position} scale={scale}>
    <Pole position={[0,.18,0]} height={.42} radius={.025} />
    <mesh position={[0,-.03,0]} castShadow><boxGeometry args={[.16,.24,.16]} /><meshStandardMaterial color="#ba7135" emissive="#ff9d45" emissiveIntensity={1.4} roughness={.4} /></mesh>
    <pointLight ref={light} color="#ffb05b" distance={4.2} decay={2} castShadow={false} />
  </group>;
}

function FenceSection({ position, rotation = 0, length = 3.5 }: { position:[number,number,number]; rotation?:number; length?:number }) {
  const posts = Math.ceil(length/.55);
  return <group position={position} rotation={[0,rotation,0]}>
    {Array.from({length:posts+1},(_,i) => <Pole key={i} position={[-length/2+i*(length/posts),.36,0]} height={.72+(i%2)*.08} radius={.035} />)}
    <Pole position={[0,.23,0]} height={length} radius={.026} rotation={[0,0,Math.PI/2]} />
    <Pole position={[0,.51,0]} height={length} radius={.026} rotation={[0,0,Math.PI/2]} />
  </group>;
}

function Sack({ position, rotation = 0 }: { position:[number,number,number]; rotation?:number }) {
  return <mesh position={position} rotation={[0,rotation,.06]} castShadow scale={[.72,1,.55]}><capsuleGeometry args={[.17,.32,4,8]} /><meshStandardMaterial color="#ae9365" roughness={1} /></mesh>;
}

function Barrel({ position }: { position:[number,number,number] }) {
  return <group position={position}><mesh castShadow><cylinderGeometry args={[.23,.25,.52,12]} /><meshStandardMaterial color="#59402c" roughness={.9} /></mesh>{[-.18,.18].map((y)=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.24,.018,6,16]} /><meshStandardMaterial color="#2f2923" metalness={.45} roughness={.55} /></mesh>)}</group>;
}

function MainStable() {
  return <group position={[-3.5,0,-4.65]}>
    <mesh position={[0,.42,0]} castShadow receiveShadow><boxGeometry args={[5.7,.32,2.5]} /><meshStandardMaterial color="#6c4b2e" roughness={.93} /></mesh>
    {[-2.55,-.85,.85,2.55].map((x)=><Pole key={x} position={[x,1.45,1.05]} height={2.55} radius={.075} />)}
    {[-2.55,2.55].map((x)=><Pole key={x} position={[x,1.45,-1]} height={2.55} radius={.075} />)}
    <Roof width={6.2} depth={3.2} y={2.82} />
    {/* Open-air pens and railings remain visible from the yard. */}
    {[-1.7,0,1.7].map((x)=><group key={x}><Pole position={[x,.95,.9]} height={1.05} radius={.035} /><Pole position={[x+.78,.74,.92]} height={1.45} radius={.025} rotation={[0,0,Math.PI/2]} /></group>)}
    {[[-2.1,.69],[1.55,.69]].map(([x,z],i)=><Lantern key={i} position={[x,2.08,z]} scale={.9} />)}
    <Sack position={[-2.05,.76,.55]} rotation={-.2} /><Sack position={[-1.65,.74,.62]} rotation={.2} /><Barrel position={[2.15,.79,.55]} />
    {/* Uneven front steps. */}
    {[0,1,2].map((i)=><mesh key={i} position={[.15,.22-i*.1,1.35+i*.22]} castShadow><boxGeometry args={[1.25,.16,.45]} /><meshStandardMaterial color="#503720" roughness={.92} /></mesh>)}
    <group position={[-.15,2.1,1.12]}><mesh><planeGeometry args={[.62,.9]} /><meshStandardMaterial color="#6e211d" side={THREE.DoubleSide} roughness={.9} /></mesh><mesh position={[0,0,.01]}><ringGeometry args={[.11,.17,12]} /><meshStandardMaterial color="#d5a342" /></mesh></group>
  </group>;
}

function Incubator({ eggCount, onClick }: { eggCount:number; onClick?:()=>void }) {
  return <group position={[4.8,0,-3.45]} onClick={(event)=>{event.stopPropagation();onClick?.();}} onPointerOver={(event)=>{event.stopPropagation();document.body.style.cursor="pointer";}} onPointerOut={()=>{document.body.style.cursor="auto";}}>
    <mesh position={[0,.22,0]} castShadow receiveShadow><boxGeometry args={[2.8,.38,1.75]} /><meshStandardMaterial color="#634328" roughness={.94} /></mesh>
    {[-1.15,1.15].map((x)=><Pole key={x} position={[x,1.05,.68]} height={1.85} radius={.06} />)}
    <Roof width={3.15} depth={2.3} y={2.05} color="#76502d" />
    {/* Nest shelves with the real available egg count. */}
    <mesh position={[0,.88,.54]} castShadow><boxGeometry args={[2.25,.12,.62]} /><meshStandardMaterial color="#503521" roughness={.95} /></mesh>
    {Array.from({length:Math.min(eggCount,8)},(_,i)=><mesh key={i} position={[-.88+(i%4)*.58,.99+(i>3?.42:0),.77]} scale={[.72,1,.72]} castShadow><sphereGeometry args={[.14,12,10]} /><meshStandardMaterial color="#eee2c7" roughness={.65} /></mesh>)}
    <Lantern position={[1.05,1.35,.72]} scale={.75} />
    <Sack position={[-1.05,.5,.7]} rotation={-.2} />
  </group>;
}

function MedicalHut() {
  return <group position={[7,0,-.7]} rotation={[0,-.22,0]}>
    <mesh position={[0,.75,0]} castShadow><boxGeometry args={[2.2,1.5,1.65]} /><meshStandardMaterial color="#72543a" roughness={.96} /></mesh>
    <Roof width={2.65} depth={2.1} y={1.68} color="#5d4935" />
    <mesh position={[0,.92,.84]}><planeGeometry args={[.58,.58]} /><meshStandardMaterial color="#ddd0b5" side={THREE.DoubleSide} /></mesh>
    <mesh position={[0,.92,.86]}><boxGeometry args={[.14,.42,.025]} /><meshStandardMaterial color="#a94339" /></mesh><mesh position={[0,.92,.861]}><boxGeometry args={[.42,.14,.025]} /><meshStandardMaterial color="#a94339" /></mesh>
    <Barrel position={[.78,.29,.7]} /><Lantern position={[-.78,1.28,.76]} scale={.65} />
  </group>;
}

function FeedStation() {
  return <group position={[-6.1,0,1.45]} rotation={[0,.18,0]}>
    {[-1,1].flatMap((x)=>[-.65,.65].map((z)=><Pole key={`${x}-${z}`} position={[x,.85,z]} height={1.7} radius={.045} />))}
    <mesh position={[0,1.72,0]} rotation={[.05,0,-.07]} castShadow><boxGeometry args={[2.5,.05,1.75]} /><meshStandardMaterial color="#705648" roughness={1} side={THREE.DoubleSide} /></mesh>
    <Sack position={[-.7,.32,.2]} /><Sack position={[-.35,.3,.35]} rotation={.25} /><Barrel position={[.72,.28,.2]} />
    <mesh position={[.1,.16,-.45]} castShadow><boxGeometry args={[1.2,.22,.38]} /><meshStandardMaterial color="#4d3828" roughness={.88} /></mesh>
    <mesh position={[.1,.285,-.45]}><boxGeometry args={[1.03,.04,.26]} /><meshStandardMaterial color="#b4853f" roughness={.75} /></mesh>
  </group>;
}

function YoungPen() {
  return <group position={[-1.3,0,5]}>
    <FenceSection position={[0,0,-.85]} length={3.4} /><FenceSection position={[-1.68,0,0]} rotation={Math.PI/2} length={1.7} />
    <mesh position={[1.25,.55,-.25]} castShadow><boxGeometry args={[1.15,.07,1.15]} /><meshStandardMaterial color="#786044" roughness={.96} /></mesh>
    <Pole position={[.72,.28,-.25]} height={.58} /><Pole position={[1.78,.28,-.25]} height={.58} />
  </group>;
}

function BananaPlant({ position, scale=1 }: { position:[number,number,number]; scale?:number }) {
  return <group position={position} scale={scale}>
    <Pole position={[0,.72,0]} height={1.45} radius={.09} />
    {Array.from({length:7},(_,i)=>{const a=(i/7)*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*.42,1.55,Math.sin(a)*.42]} rotation={[0,-a,.55]} scale={[1,1,3.2]} castShadow><sphereGeometry args={[.13,5,8]} /><meshStandardMaterial color={i%2?"#476b31":"#5b7d37"} roughness={.92} /></mesh>;})}
  </group>;
}

function TrainingGate() {
  return <group position={[2.45,0,6.25]} rotation={[0,-.08,0]}>
    <Pole position={[-1,1,0]} height={2} radius={.08} /><Pole position={[1,1,0]} height={2} radius={.08} /><Pole position={[0,1.92,0]} height={2.15} radius={.065} rotation={[0,0,Math.PI/2]} />
    <mesh position={[0,1.62,0]}><boxGeometry args={[1.25,.34,.08]} /><meshStandardMaterial color={DARK_WOOD} roughness={.9} /></mesh>
  </group>;
}

export function CoopEnvironment({ eggCount, onIncubatorClick }: { eggCount:number; onIncubatorClick?:()=>void }) {
  const yard = useYardTexture();
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,.35]} receiveShadow><planeGeometry args={[18,14]} /><meshStandardMaterial map={yard ?? undefined} color={yard?undefined:"#68472c"} roughness={1} transparent opacity={.72} /></mesh>
    <MainStable />
    <Incubator eggCount={eggCount} onClick={onIncubatorClick} />
    <MedicalHut />
    <FeedStation />
    <YoungPen />
    <TrainingGate />

    {/* Broken-up perimeter segments avoid the old circular-island silhouette. */}
    <FenceSection position={[-6.6,0,-3.5]} rotation={Math.PI/2} length={4.2} />
    <FenceSection position={[6.8,0,-4.3]} rotation={Math.PI/2} length={2.2} />
    <FenceSection position={[-5.9,0,6.2]} length={4.1} />
    <FenceSection position={[6.1,0,6.1]} length={3} />
    <FenceSection position={[8.2,0,3]} rotation={Math.PI/2} length={5.1} />
    <BananaPlant position={[-8,0,-4.5]} scale={1.15} /><BananaPlant position={[8.25,0,-4.8]} /><BananaPlant position={[-7.8,0,5.6]} scale={.85} />
    <mesh position={[-4.1,.15,5.7]} rotation={[.25,.6,.1]}><icosahedronGeometry args={[.32,0]} /><meshStandardMaterial color="#665b4c" roughness={1} flatShading /></mesh>
    <mesh position={[5.8,.12,4.8]} rotation={[.2,.25,.1]}><icosahedronGeometry args={[.25,0]} /><meshStandardMaterial color="#6d6150" roughness={1} flatShading /></mesh>
  </group>;
}
