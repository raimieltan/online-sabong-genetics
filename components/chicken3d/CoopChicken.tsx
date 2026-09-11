"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";

import type { Chicken } from "@/lib/types";
import { VILLAGE_SCALE, hashString, personalityModifiers } from "@/lib/coopVillage";
import type { VillageSlot } from "@/lib/coopVillage";
import { VillageChickenAI } from "@/lib/animation/villageIdle";
import { ChickenModel } from "./ChickenModel";

const WANDER_RADIUS = 1.6;

/**
 * One living chicken in the village: reuses ChickenModel verbatim for the
 * genetics-accurate render, and layers a ref-driven idle/walk state machine
 * on top for movement — no React state touched per frame (spec §21).
 */
export function CoopChicken({
  chicken,
  slot,
  selected,
  onSelect,
}: {
  chicken: Chicken;
  slot: VillageSlot;
  selected: boolean;
  onSelect: (chicken: Chicken, worldPosition: THREE.Vector3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const ai = useMemo(() => {
    const personality = personalityModifiers(chicken);
    return new VillageChickenAI({
      home: slot.home,
      personalArea: slot.personalArea,
      wanderRadius: WANDER_RADIUS,
      walkSpeed: 0.45 * personality.walkSpeed,
      restBias: personality.restBias,
      wanderFrequency: personality.wanderFrequency,
      seed: hashString(chicken.id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chicken.id, chicken.fightingStyle, chicken.energy, slot]);

  const worldPos = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const frame = ai.update(Math.min(delta, 1 / 20));
    const g = group.current;
    if (!g) return;
    g.position.set(frame.position[0], frame.position[1], frame.position[2]);
    g.rotation.y = frame.rotationY;
    if (ringRef.current) {
      ringRef.current.visible = selected || hovered;
      ringRef.current.rotation.z += delta * 0.6;
    }
  });

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        if (group.current) {
          group.current.getWorldPosition(worldPos.current);
        }
        onSelect(chicken, worldPos.current);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} visible={false}>
        <ringGeometry args={[0.55, 0.68, 32]} />
        <meshBasicMaterial color={selected ? "#f0c674" : "#ffffff"} transparent opacity={0.75} />
      </mesh>

      <group scale={VILLAGE_SCALE}>
        <ChickenModel
          colorScheme={chicken.colorScheme}
          sex={chicken.sex}
          growthStage={chicken.growthStage}
          physical={chicken.physical}
          mutations={chicken.mutations}
          animate
        />
      </group>

      {(selected || hovered) && (
        <Billboard position={[0, 1.6, 0]}>
          <Text fontSize={0.22} color="#f0c674" outlineWidth={0.012} outlineColor="#1a1208" anchorX="center" anchorY="bottom">
            {chicken.name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
