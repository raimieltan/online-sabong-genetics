"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Procedural packed-dirt texture for the arena floor — reuses the sandy
 * palette from ArenaBackdrop's 2D pit so the 3D disc blends into it instead
 * of looking like a different material.
 */
function useDirtTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    base.addColorStop(0, "#8a6a4a");
    base.addColorStop(0.55, "#6b4a2f");
    base.addColorStop(1, "#2e2018");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // scuff/speck texture
    const rand = (seed: number) => {
      const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return value - Math.floor(value);
    };
    for (let i = 0; i < 320; i++) {
      const a = rand(i * 4) * Math.PI * 2;
      const d = Math.sqrt(rand(i * 4 + 1)) * r * 0.94;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      ctx.fillStyle = rand(i * 4 + 2) > 0.5 ? "rgba(40,26,16,0.25)" : "rgba(160,130,95,0.18)";
      const s = 1.5 + rand(i * 4 + 3) * 3;
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.6, a, 0, Math.PI * 2);
      ctx.fill();
    }

    // Old scrape paths, compressed soil and scattered feather-like marks
    // establish a used pit before transient battle evidence is added.
    for (let i = 0; i < 46; i++) {
      const a = rand(1500 + i * 6) * Math.PI * 2;
      const d = Math.sqrt(rand(1501 + i * 6)) * r * 0.82;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const len = 8 + rand(1502 + i * 6) * 25;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + (rand(1503 + i * 6) - .5) * .8);
      ctx.strokeStyle = i % 4 === 0 ? "rgba(202,177,132,.18)" : "rgba(35,22,13,.18)";
      ctx.lineWidth = .8 + rand(1504 + i * 6) * 1.6;
      ctx.beginPath();
      ctx.moveTo(-len * .5, 0);
      ctx.quadraticCurveTo(0, (rand(1505 + i * 6) - .5) * 5, len * .5, 0);
      ctx.stroke();
      ctx.restore();
    }

    // boundary ring
    ctx.strokeStyle = "rgba(20,12,8,0.5)";
    ctx.lineWidth = size * 0.012;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

/** Simple circular ground disc anchored under the fighters. */
export function ArenaGround({ y, radius = 8.4 }: { y: number; radius?: number }) {
  const texture = useDirtTexture();

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={texture ?? undefined} color={texture ? undefined : "#4a3320"} roughness={0.94} envMapIntensity={0.18} />
    </mesh>
  );
}

const RIM_RADIUS = 8.45;

/**
 * The battle's actual Three.js environment. The dirt floor, raised stone rim,
 * and low rail all live in the same perspective as the birds, so contact
 * shadows and movement have a reliable visual ground reference.
 */
export function ArenaEnvironment({ floorY }: { floorY: number }) {
  const posts = useMemo(
    () => Array.from({ length: 12 }, (_, index) => {
      const angle = (index / 12) * Math.PI * 2;
      return [Math.cos(angle) * RIM_RADIUS, Math.sin(angle) * RIM_RADIUS] as const;
    }),
    []
  );

  return (
    <>
      <hemisphereLight args={["#cfe8ff", "#1d120d", 1.1]} />

      {/* A solid plinth makes the circular dirt pit feel set into the world. */}
      <mesh position={[0, floorY - 0.16, 0]} receiveShadow>
        <cylinderGeometry args={[RIM_RADIUS + 0.26, RIM_RADIUS + 0.48, 0.32, 96]} />
        <meshStandardMaterial color="#241812" roughness={0.92} />
      </mesh>
      <ArenaGround y={floorY + 0.012} radius={8.28} />

      {/* Painted lines and a low rail give the pit a readable 3D boundary
          without obscuring the fighters from the spectator camera. */}
      <mesh position={[0, floorY + 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.66, 7.73, 96]} />
        <meshStandardMaterial color="#c59757" emissive="#5d3518" emissiveIntensity={0.24} roughness={0.78} />
      </mesh>
      <mesh position={[0, floorY + 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RIM_RADIUS, 0.09, 8, 96]} />
        <meshStandardMaterial color="#765036" roughness={0.72} metalness={0.08} />
      </mesh>
      {posts.map(([x, z], index) => (
        <mesh key={index} position={[x, floorY + 0.28, z]}>
          <cylinderGeometry args={[0.07, 0.1, 0.56, 10]} />
          <meshStandardMaterial color="#4a2b1b" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, floorY + 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RIM_RADIUS, 0.035, 6, 96]} />
        <meshStandardMaterial color="#a87846" roughness={0.66} metalness={0.12} />
      </mesh>
    </>
  );
}
