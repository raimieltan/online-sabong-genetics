"use client";

import { useMemo } from "react";
import * as THREE from "three";

import { mulberry32 } from "@/lib/coopVillage";

/** Procedural grass/dirt-path texture for the village ground, in the same style as ArenaGround's canvas dirt. */
function useVillageGroundTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#3f5c34";
    ctx.fillRect(0, 0, size, size);

    const rand = mulberry32(4242);
    for (let i = 0; i < 900; i++) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.fillStyle = rand() > 0.5 ? "rgba(70,100,55,0.35)" : "rgba(30,45,25,0.3)";
      ctx.beginPath();
      ctx.ellipse(x, y, 1.5 + rand() * 2, 1 + rand(), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dirt paths radiating from center toward the two hut rings.
    ctx.strokeStyle = "rgba(107,74,47,0.55)";
    ctx.lineCap = "round";
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(size / 2, size / 2);
      ctx.lineTo(size / 2 + Math.cos(angle) * size * 0.46, size / 2 + Math.sin(angle) * size * 0.46);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(107,74,47,0.6)";
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, size * 0.12, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1, 6]} />
        <meshStandardMaterial color="#4a3826" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.75, 1.4, 8]} />
        <meshStandardMaterial color="#3c6b3a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <coneGeometry args={[0.55, 1.1, 8]} />
        <meshStandardMaterial color="#4a7d47" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} scale={scale} rotation={[0.3, 0.6, 0.1]}>
      <icosahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color="#6b6459" roughness={1} flatShading />
    </mesh>
  );
}

function HayBale({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 0.6, 12]} />
      <meshStandardMaterial color="#c9a84c" roughness={1} />
    </mesh>
  );
}

/** Central campfire with a warm point light — the diorama's visual anchor. */
function CentralFire() {
  return (
    <group position={[0, 0, 1.6]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.35, 0.06, Math.sin((i / 5) * Math.PI * 2) * 0.35]} rotation={[0, i, Math.PI / 2.2]}>
          <cylinderGeometry args={[0.05, 0.06, 0.55, 6]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]}>
        <coneGeometry args={[0.18, 0.5, 8]} />
        <meshStandardMaterial color="#e8823a" emissive="#e8823a" emissiveIntensity={1.4} transparent opacity={0.85} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#ffb066" intensity={2.2} distance={6} decay={2} />
    </group>
  );
}

/** Trophy-topped central roost — the village's gathering-place landmark. */
function CentralRoost() {
  return (
    <group position={[0, 0, -1.6]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1, 1.1, 0.3, 16]} />
        <meshStandardMaterial color="#7a5c3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.7, 8]} />
        <meshStandardMaterial color="#5c4530" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.22, 0.3, 8]} />
        <meshStandardMaterial color="#f0c674" metalness={0.5} roughness={0.35} emissive="#5a3f10" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/** Simple perimeter fence so the diorama reads as a bounded, cozy space rather than open ground. */
function Fence({ radius }: { radius: number }) {
  const posts = 28;
  return (
    <group>
      {Array.from({ length: posts }, (_, i) => {
        const angle = (i / posts) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius]}>
            <cylinderGeometry args={[0.04, 0.05, 0.7, 6]} />
            <meshStandardMaterial color="#4a3826" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

export function CoopEnvironment({ onIncubatorClick }: { onIncubatorClick?: () => void }) {
  const groundTexture = useVillageGroundTexture();

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[11, 64]} />
        <meshStandardMaterial map={groundTexture ?? undefined} color={groundTexture ? undefined : "#3f5c34"} roughness={1} />
      </mesh>

      <Fence radius={10.4} />
      <CentralFire />
      <CentralRoost />

      {/* Incubator area — clicking opens the existing egg/hatch UI (spec §15). */}
      <group
        position={[0, 0, -4.2]}
        onClick={(e) => {
          e.stopPropagation();
          onIncubatorClick?.();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[1.3, 24]} />
          <meshStandardMaterial color="#7a5c3a" roughness={0.9} />
        </mesh>
        {[[-0.5, -0.3], [0.4, -0.1], [0, 0.4], [-0.2, 0.55]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.15, z]}>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#e9dfc8" roughness={0.6} />
          </mesh>
        ))}
      </group>

      <Tree position={[6.5, 0, -6.5]} />
      <Tree position={[-7, 0, -5.5]} />
      <Tree position={[7.5, 0, 4]} />
      <Rock position={[3.2, 0.15, 8.5]} scale={1.1} />
      <Rock position={[-4.5, 0.12, 7.8]} scale={0.8} />
      <Rock position={[8.2, 0.12, -2]} scale={0.9} />
      <HayBale position={[5.5, 0.2, -1.5]} />
      <HayBale position={[-5.8, 0.2, -2.3]} />
    </group>
  );
}
