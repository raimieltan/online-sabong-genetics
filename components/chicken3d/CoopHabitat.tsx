"use client";

import type { HabitatStyle } from "@/lib/coopVillage";

const HUT_COLORS: Record<HabitatStyle, { canvas: string; trim: string }> = {
  common: { canvas: "#8a6a4a", trim: "#5c4530" },
  veteran: { canvas: "#6b5a52", trim: "#3f332d" },
  champion: { canvas: "#caa24a", trim: "#f0c674" },
};

/**
 * A single chicken's home — a simple teepee/hut. `habitatStyle` is a plain
 * data-driven prop (spec §13) so future variants (rare/mutation/legendary
 * huts) only need a new palette entry here, not new geometry code.
 */
export function CoopHabitat({ position, facingY, style }: { position: [number, number, number]; facingY: number; style: HabitatStyle }) {
  const colors = HUT_COLORS[style];

  return (
    <group position={position} rotation={[0, facingY, 0]}>
      {/* Ground pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.95, 24]} />
        <meshStandardMaterial color="#5a4630" roughness={1} />
      </mesh>

      {/* Teepee shell */}
      <mesh position={[0, 0.65, -0.3]} castShadow>
        <coneGeometry args={[0.7, 1.3, 8]} />
        <meshStandardMaterial color={colors.canvas} roughness={0.85} />
      </mesh>

      {/* Trim ring at the base */}
      <mesh position={[0, 0.06, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.05, 8, 16]} />
        <meshStandardMaterial color={colors.trim} roughness={0.7} />
      </mesh>

      {/* Pole tips poking through the apex */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[Math.cos((i / 3) * Math.PI * 2) * 0.12, 1.42, -0.3 + Math.sin((i / 3) * Math.PI * 2) * 0.12]}
          rotation={[0.15, 0, 0]}
        >
          <cylinderGeometry args={[0.02, 0.02, 0.35, 6]} />
          <meshStandardMaterial color="#4a3826" roughness={0.9} />
        </mesh>
      ))}

      {style === "champion" && (
        <mesh position={[0, 1.6, -0.3]}>
          <coneGeometry args={[0.08, 0.2, 6]} />
          <meshStandardMaterial color="#f0c674" metalness={0.6} roughness={0.3} emissive="#5a3f10" emissiveIntensity={0.4} />
        </mesh>
      )}
    </group>
  );
}
