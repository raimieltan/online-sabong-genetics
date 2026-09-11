"use client";

import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";

import type { Chicken } from "@/lib/types";
import { getVillageSlot, habitatStyle, type VillageZone } from "@/lib/coopVillage";

import { CoopCamera } from "./CoopCamera";
import { CoopEnvironment } from "./CoopEnvironment";
import { CoopHabitat } from "./CoopHabitat";
import { CoopChicken } from "./CoopChicken";

/**
 * The 3D compound Canvas: an asymmetric working stable with condition-aware
 * resident zones, the shared genetics-accurate ChickenModel, and a constrained
 * management-game camera.
 */
export function CoopWorld({
  chickens,
  eggCount,
  selectedId,
  onSelect,
  onIncubatorClick,
  onReady,
}: {
  chickens: Chicken[];
  eggCount: number;
  selectedId: string | null;
  onSelect: (chicken: Chicken | null, worldPosition?: THREE.Vector3) => void;
  onIncubatorClick: () => void;
  onReady?: () => void;
}) {
  const focusTarget = useRef(new THREE.Vector3(0, 0, 0));
  const zoneCounts: Record<VillageZone, number> = { fighter: 0, young: 0, recovery: 0 };
  const residents = chickens.map((chicken) => {
    const zone: VillageZone = chicken.injured || chicken.status === "injured"
      ? "recovery"
      : chicken.growthStage === "chick" || chicken.growthStage === "juvenile"
        ? "young"
        : "fighter";
    return { chicken, zone, slot: getVillageSlot(zoneCounts[zone]++, zone) };
  });

  return (
    <Canvas
      shadows
      camera={{ fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => onSelect(null)}
      onCreated={() => onReady?.()}
    >
      <ambientLight intensity={0.78} color="#ffd9a1" />
      <directionalLight
        position={[6, 9, 4]}
        intensity={1.75}
        color="#ffc77d"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-5, 4, -3]} intensity={0.24} color="#a8c4da" />
      <hemisphereLight args={["#e9ba78", "#51351f", 0.45]} />

      <CoopCamera focusTarget={focusTarget} />

      <Suspense fallback={null}>
        <CoopEnvironment eggCount={eggCount} onIncubatorClick={() => {
          focusTarget.current.set(4.8, 0, -3.4);
          window.setTimeout(onIncubatorClick, 260);
        }} />

        {residents.map(({ chicken, slot, zone }) => {
          return (
            <group key={chicken.id}>
              <CoopHabitat position={slot.home} facingY={slot.facingY} style={habitatStyle(chicken)} zone={zone} name={chicken.name} />
              <CoopChicken
                chicken={chicken}
                slot={slot}
                selected={selectedId === chicken.id}
                onSelect={(c, worldPosition) => {
                  focusTarget.current.copy(worldPosition);
                  onSelect(c, worldPosition);
                }}
              />
            </group>
          );
        })}

      </Suspense>
    </Canvas>
  );
}
