"use client";

import { useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

import type { Chicken, RoosterColorScheme } from "@/lib/types";

const MODEL_PATH = "/new-chickens/rooster_gamefowl.glb";

/** Maps a mesh name in the rigged rooster model to a colorScheme slot. */
const PART_COLOR_MAP: Record<string, keyof RoosterColorScheme> = {
  BodyMain: "body",
  Breast: "body",
  Hackle: "body",
  WingBase: "body",
  WingTip: "body",
  HeadSphere: "head",
  Beak: "feet",
  CombSpike0: "comb",
  CombSpike1: "comb",
  CombSpike2: "comb",
  WattleL: "comb",
  WattleR: "comb",
  TailFeather0: "tail",
  TailFeather1: "tail",
  TailFeather2: "tail",
  TailFeather3: "tail",
  TailFeather4: "tail",
  TailFeather5: "tail",
  TailFeather6: "tail",
  Thigh: "feet",
  Shin: "feet",
  "Toe-1": "feet",
  Toe0: "feet",
  Toe1: "feet",
};

/** Meshes shrunk down for hens, since the model only ships rigged as a rooster. */
const HEN_SHRINK_PREFIXES = ["CombSpike", "Wattle"];

/** Converts the pixel-space offsets the 2D battle timeline produces into world units. */
const PX_TO_WORLD = 0.016;

/**
 * Per-frame fighter animation state driven by the battle timeline (turn lunges,
 * hit flashes, idle bob/breathing, limb phases). Shape mirrors the values the
 * canvas-based battle replay already computes each frame.
 */
export interface FighterAnim {
  offsetX: number;
  offsetY: number;
  rot: number;
  scaleX: number;
  scaleY: number;
  flash: number; // 0..1 flash white on hit
  wingPhase: number;
  legPhase: number;
}

export function ChickenModel({
  colorScheme,
  sex,
  animate = true,
  combatAnim,
  facing,
  basePosition = [0, 0, 0],
}: {
  colorScheme: RoosterColorScheme;
  sex: Chicken["sex"];
  animate?: boolean;
  /** When provided, the model is driven by this ref every frame instead of the idle showcase spin. */
  combatAnim?: RefObject<FighterAnim | null>;
  /** Which way the fighter should face when `combatAnim` drives it (head points toward the opponent). */
  facing?: "left" | "right";
  basePosition?: [number, number, number];
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const group = useRef<THREE.Group>(null);
  const henScale = sex === "hen" ? 0.85 : 1;

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const source = Array.isArray(node.material) ? node.material[0] : node.material;
      const material = source.clone();
      node.material = material;

      const part = PART_COLOR_MAP[node.name];
      if (part && material instanceof THREE.MeshStandardMaterial) {
        material.color = new THREE.Color(colorScheme[part]);
      }

      if (sex === "hen" && HEN_SHRINK_PREFIXES.some((prefix) => node.name.startsWith(prefix))) {
        node.scale.multiplyScalar(0.35);
      }
    });

    return clone;
  }, [scene, colorScheme, sex]);

  useFrame((state) => {
    if (!group.current) return;

    if (combatAnim) {
      const a = combatAnim.current;
      if (!a) return;

      const yaw = facing === "right" ? Math.PI / 2 : facing === "left" ? -Math.PI / 2 : 0;
      group.current.rotation.y = yaw;
      group.current.rotation.x = -a.rot;
      group.current.position.set(
        basePosition[0] + a.offsetX * PX_TO_WORLD,
        basePosition[1] - a.offsetY * PX_TO_WORLD,
        basePosition[2]
      );
      group.current.scale.set(a.scaleX * henScale, a.scaleY * henScale, a.scaleX * henScale);

      const wingR = clonedScene.getObjectByName("WingR");
      const wingL = clonedScene.getObjectByName("WingL");
      if (wingR) wingR.rotation.z = a.wingPhase * 0.35;
      if (wingL) wingL.rotation.z = -a.wingPhase * 0.35;

      const head = clonedScene.getObjectByName("Head");
      if (head) head.rotation.x = a.wingPhase * 0.1 - Math.max(0, a.rot) * 1.2;

      const legR = clonedScene.getObjectByName("LegR");
      const legL = clonedScene.getObjectByName("LegL");
      if (legR) legR.rotation.x = a.legPhase * 0.15;
      if (legL) legL.rotation.x = -a.legPhase * 0.15;

      const tail = clonedScene.getObjectByName("Tail");
      if (tail) tail.rotation.x = a.wingPhase * 0.08;

      clonedScene.traverse((node) => {
        if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
          node.material.emissive.setScalar(a.flash);
          node.material.emissiveIntensity = a.flash;
        }
      });
      return;
    }

    if (!animate) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.4) * 0.35;

    const neck = clonedScene.getObjectByName("Neck");
    if (neck) neck.rotation.x = Math.sin(t * 1.6) * 0.06;

    const tail = clonedScene.getObjectByName("Tail");
    if (tail) tail.rotation.x = Math.sin(t * 1.2) * 0.05;

    const wingR = clonedScene.getObjectByName("WingR");
    const wingL = clonedScene.getObjectByName("WingL");
    if (wingR) wingR.rotation.z = Math.sin(t * 5) * 0.15;
    if (wingL) wingL.rotation.z = -Math.sin(t * 5) * 0.15;

    const head = clonedScene.getObjectByName("Head");
    if (head) head.rotation.x = Math.sin(t * 2) * 0.15;
  });

  return (
    <group ref={group} position={basePosition} scale={henScale} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
