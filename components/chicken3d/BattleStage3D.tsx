"use client";

import { Suspense, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import type { Chicken } from "@/lib/types";

import { ChickenModel, type FighterAnim } from "./ChickenModel";

const FIGHTER_X = 1.8;
const STAGE_Y_OFFSET = -1.0;
const STAGE_SCALE = 0.55;

/** Latest attack event for the camera to react to — mirrors the timing info BattleCanvas's 2D lunge already uses. */
export interface CameraCue {
  attacker: "r1" | "r2";
  startTime: number;
  isCrit: boolean;
  isMiss: boolean;
}

const IDLE_POS = new THREE.Vector3(0, 0.3, 9);
const IDLE_LOOKAT = new THREE.Vector3(0, 0, 0);

/** How long (ms) the camera stays punched-in before easing back to the idle wide shot. */
const PUNCH_HOLD_MS = 550;
const CRIT_SHAKE_MS = 150;

/**
 * Drives the battle camera each frame: idles on the wide two-fighter shot, and
 * eases into a closer 3/4 angle favoring the attacker/impact point whenever
 * `cameraCue` reports a new attack, easing back out once it settles. Crits add a
 * short decaying shake. Reads mutable refs only — no React state, no re-renders.
 */
function BattleCamera({ cameraCue }: { cameraCue?: RefObject<CameraCue | null> }) {
  const currentPos = useRef(IDLE_POS.clone());
  const currentLookAt = useRef(IDLE_LOOKAT.clone());

  useFrame(({ camera }) => {
    const cue = cameraCue?.current ?? null;
    const now = Date.now();
    const elapsed = cue ? now - cue.startTime : Infinity;

    // Punch intensity: 0 at rest, rises then falls back to 0 over PUNCH_HOLD_MS.
    const progress = Math.min(1, elapsed / PUNCH_HOLD_MS);
    const punch = cue ? Math.sin(progress * Math.PI) : 0;

    const sideSign = cue?.attacker === "r1" ? -1 : 1;
    const targetPos = new THREE.Vector3(sideSign * 1.5, 0.7, 5.3);
    const targetLookAt = new THREE.Vector3(-sideSign * 0.85, 0.3, 0);

    currentPos.current.lerpVectors(IDLE_POS, targetPos, punch);
    currentLookAt.current.lerpVectors(IDLE_LOOKAT, targetLookAt, punch);

    let shakeX = 0;
    let shakeY = 0;
    if (cue?.isCrit && elapsed < CRIT_SHAKE_MS) {
      const decay = 1 - elapsed / CRIT_SHAKE_MS;
      shakeX = Math.sin(elapsed * 0.09) * 0.06 * decay;
      shakeY = Math.cos(elapsed * 0.11) * 0.05 * decay;
    }

    camera.position.set(currentPos.current.x + shakeX, currentPos.current.y + shakeY, currentPos.current.z);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

/**
 * Renders the two live-fighter 3D models for a battle replay. Positioned as a
 * transparent layer over the 2D canvas that still draws the ground, health
 * bars, particles and floating combat text — the fighters themselves are read
 * every frame from `animA`/`animB`, the same mutable per-frame state the 2D
 * replay timeline in BattleCanvas already computes.
 */
export function BattleStage3D({
  fighterA,
  fighterB,
  animA,
  animB,
  cameraCue,
}: {
  fighterA: Pick<Chicken, "colorScheme" | "sex">;
  fighterB: Pick<Chicken, "colorScheme" | "sex">;
  animA: RefObject<FighterAnim | null>;
  animB: RefObject<FighterAnim | null>;
  /** Latest attack event driving the dynamic camera; omit for a static wide shot. */
  cameraCue?: RefObject<CameraCue | null>;
}) {
  return (
    <Canvas
      camera={{ position: [IDLE_POS.x, IDLE_POS.y, IDLE_POS.z], fov: 28 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <BattleCamera cameraCue={cameraCue} />
      <Suspense fallback={null}>
        <group position={[0, STAGE_Y_OFFSET, 0]} scale={STAGE_SCALE}>
          <ChickenModel
            colorScheme={fighterA.colorScheme}
            sex={fighterA.sex}
            combatAnim={animA}
            facing="right"
            basePosition={[-FIGHTER_X, 0, 0]}
          />
          <ChickenModel
            colorScheme={fighterB.colorScheme}
            sex={fighterB.sex}
            combatAnim={animB}
            facing="left"
            basePosition={[FIGHTER_X, 0, 0]}
          />
        </group>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
