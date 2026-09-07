"use client";

import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import type { Chicken } from "@/lib/types";
import { getVillageSlot, habitatStyle } from "@/lib/coopVillage";

import { CoopCamera } from "./CoopCamera";
import { CoopEnvironment } from "./CoopEnvironment";
import { CoopHabitat } from "./CoopHabitat";
import { CoopChicken } from "./CoopChicken";

/**
 * The 3D village Canvas: ground/environment, one hut+chicken pair per active
 * chicken (deterministic slot per index — spec §5), and the orbit camera.
 * This is the primary Coop experience, not a backdrop behind chicken cards.
 */
export function CoopWorld({
  chickens,
  selectedId,
  onSelect,
  onIncubatorClick,
  onReady,
}: {
  chickens: Chicken[];
  selectedId: string | null;
  onSelect: (chicken: Chicken | null, worldPosition?: THREE.Vector3) => void;
  onIncubatorClick: () => void;
  onReady?: () => void;
}) {
  const focusTarget = useRef(new THREE.Vector3(0, 0, 0));

  return (
    <Canvas
      shadows
      camera={{ fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
      onPointerMissed={() => onSelect(null)}
      onCreated={() => onReady?.()}
    >
      <color attach="background" args={["#1c2418"]} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[6, 9, 4]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-5, 4, -3]} intensity={0.35} color="#8fb3ff" />

      <CoopCamera focusTarget={focusTarget} />

      <Suspense fallback={null}>
        <CoopEnvironment onIncubatorClick={onIncubatorClick} />

        {chickens.map((chicken, index) => {
          const slot = getVillageSlot(index);
          return (
            <group key={chicken.id}>
              <CoopHabitat position={slot.home} facingY={slot.facingY} style={habitatStyle(chicken)} />
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

        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  );
}
