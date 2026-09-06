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
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 1000) / 1000;
    };
    for (let i = 0; i < 220; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r * 0.94;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      ctx.fillStyle = rand() > 0.5 ? "rgba(40,26,16,0.25)" : "rgba(160,130,95,0.18)";
      const s = 1.5 + rand() * 3;
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.6, a, 0, Math.PI * 2);
      ctx.fill();
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

/** Simple circular ground disc anchored under the fighters, giving the flat
 * 2D backdrop's sandy pit an actual 3D surface that shares the battle
 * camera's perspective instead of looking pasted-on as it moves. */
export function ArenaGround({ y, radius = 4.6 }: { y: number; radius?: number }) {
  const texture = useDirtTexture();

  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={texture ?? undefined} color={texture ? undefined : "#4a3320"} roughness={1} />
    </mesh>
  );
}
