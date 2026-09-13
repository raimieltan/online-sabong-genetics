"use client";

import {
  memo,
  useMemo,
  useRef,
  useState,
} from "react";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import type { Chicken } from "@/lib/types";

import {
  VILLAGE_SCALE,
  hashString,
  personalityModifiers,
} from "@/lib/coopVillage";

import type { VillageSlot } from "@/lib/coopVillage";

import { VillageChickenAI } from "@/lib/animation/villageIdle";
import { ChickenModel } from "./ChickenModel";

const WANDER_RADIUS = 1.6;
const AI_FPS = 10;

function CoopChickenComponent({
  chicken,
  slot,
  selected,
  onSelect,
}: {
  chicken: Chicken;
  slot: VillageSlot;
  selected: boolean;

  onSelect: (
    chicken: Chicken,
    worldPosition: THREE.Vector3
  ) => void;
}) {
  const group = useRef<THREE.Group>(null);

  const worldPos =
    useRef(new THREE.Vector3());

  const aiAccumulator =
    useRef(0);

  const [hovered, setHovered] =
    useState(false);

  const personality =
    useMemo(
      () =>
        personalityModifiers(
          chicken
        ),
      [
        chicken.id,
        chicken.fightingStyle,
        chicken.energy,
      ]
    );

  const ai =
    useMemo(() => {
      return new VillageChickenAI({
        home: slot.home,

        personalArea:
          slot.personalArea,

        wanderRadius:
          WANDER_RADIUS,

        walkSpeed:
          0.45 *
          personality.walkSpeed,

        restBias:
          personality.restBias,

        wanderFrequency:
          personality.wanderFrequency,

        seed: hashString(
          chicken.id
        ),
      });
    }, [
      chicken.id,

      personality.walkSpeed,
      personality.restBias,
      personality.wanderFrequency,

      slot.home,
      slot.personalArea,
    ]);

  useFrame((_, delta) => {
    const g =
      group.current;

    if (!g) return;

    aiAccumulator.current +=
      delta;

    const interval =
      1 / AI_FPS;

    if (
      aiAccumulator.current <
      interval
    ) {
      return;
    }

    const elapsed =
      Math.min(
        aiAccumulator.current,
        0.2
      );

    aiAccumulator.current %=
      interval;

    const frame =
      ai.update(elapsed);

    g.position.set(
      frame.position[0],
      frame.position[1],
      frame.position[2]
    );

    g.rotation.y =
      frame.rotationY;
  });

  return (
    <group ref={group}>
      {/*
       * ONLY THIS SIMPLE MESH
       * participates in pointer events.
       *
       * R3F no longer needs to raycast
       * through the ChickenModel hierarchy.
       */}
      <mesh
        position={[
          0,
          0.65,
          0,
        ]}
        onClick={(event) => {
          event.stopPropagation();

          if (
            group.current
          ) {
            group.current.getWorldPosition(
              worldPos.current
            );
          }

          onSelect(
            chicken,
            worldPos.current
          );
        }}
        onPointerOver={(event) => {
          event.stopPropagation();

          setHovered(true);

          document.body.style.cursor =
            "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);

          document.body.style.cursor =
            "auto";
        }}
      >
        {/*
         * Low-poly click volume.
         */}
        <sphereGeometry
          args={[
            0.65,
            6,
            4,
          ]}
        />

        {/*
         * Fully invisible but still raycastable.
         */}
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </mesh>

      {/*
       * The visual rooster has NO pointer handlers.
       */}
      <group
        scale={
          VILLAGE_SCALE
        }
      >
        <ChickenModel
          colorScheme={
            chicken.colorScheme
          }
          sex={
            chicken.sex
          }
          growthStage={
            chicken.growthStage
          }
          physical={
            chicken.physical
          }
          mutations={
            chicken.mutations
          }
          animate
          renderMode="village"
        />
      </group>

      {/*
       * Cheap static selection indication.
       */}
      {(selected ||
        hovered) && (
        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[
            0,
            0.02,
            0,
          ]}
        >
          <ringGeometry
            args={[
              0.55,
              0.68,
              12,
            ]}
          />

          <meshBasicMaterial
            color={
              selected
                ? "#f0c674"
                : "#ffffff"
            }
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

export const CoopChicken =
  memo(CoopChickenComponent);