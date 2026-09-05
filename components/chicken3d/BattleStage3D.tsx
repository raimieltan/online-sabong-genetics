"use client";

import { Suspense, useRef } from "react";
import type { Ref, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import type { Chicken, StaggerLevel } from "@/lib/types";

import { ArenaGround } from "./ArenaGround";
import { ArenaPhysics } from "./ArenaPhysics";
import { ChickenPhysicsRig, type ChickenPhysicsHandle } from "./ChickenPhysicsRig";
import type { FighterAnim } from "./ChickenModel";
import type { AnimIntent } from "@/lib/animation/types";

// The GLB models are authored at ~0.7-1 world unit tall (see
// chicken_viewer.html's camera sitting ~0.75 units away). The old camera
// (z=9, fov 28) combined with a 0.55 downscale left them as barely-visible
// specks — these constants keep the models close to their native scale and
// bring the camera in to match, instead of shrinking the fighters further.
const FIGHTER_X = 0.75;
const STAGE_Y_OFFSET = -0.55;
const STAGE_SCALE = 2.2;

/** World-space distance each fighter sits from center (BattleCanvas's lunge clamp reads this so a lunge can never close more than the real gap between fighters and pass through). */
export const WORLD_HALF_GAP = FIGHTER_X * STAGE_SCALE;

/** Latest attack event for the camera to react to — mirrors the timing info BattleCanvas's 2D lunge already uses. */
export interface CameraCue {
  attacker: "r1" | "r2";
  startTime: number;
  isCrit: boolean;
  isMiss: boolean;
  stagger: StaggerLevel;
}

// Elevated 3/4 angle looking down at the stage (bird's-eye but tilted, not
// top-down) — higher and further back than a straight-on eye-level shot so
// both fighters and the ground read clearly, matching a Pokemon-battle-style
// framing rather than a flat portrait shot.
const IDLE_POS = new THREE.Vector3(0, 2.45, 3.7);
const IDLE_LOOKAT = new THREE.Vector3(0, -0.15, 0);

/** How long (ms) the camera stays punched-in before easing back to the idle wide shot. */
const PUNCH_HOLD_MS = 550;

/** Camera shake magnitude/duration scale with how hard the hit rocked the defender (spec §44). */
const STAGGER_SHAKE: Record<StaggerLevel, { mag: number; ms: number }> = {
  none: { mag: 0, ms: 0 },
  light: { mag: 0.008, ms: 90 },
  // A trip reads as a bigger event than a plain medium flinch, so it shakes harder.
  stumble: { mag: 0.02, ms: 170 },
  medium: { mag: 0.015, ms: 140 },
  heavy: { mag: 0.026, ms: 200 },
  knockdown: { mag: 0.042, ms: 340 },
};

/** Heavier hits also earn a longer camera hold before easing back to the idle shot. */
const STAGGER_HOLD_MULT: Record<StaggerLevel, number> = {
  none: 0.7,
  light: 0.85,
  stumble: 1.15,
  medium: 1,
  heavy: 1.3,
  knockdown: 1.8,
};

/** Idle drift: a slow side-to-side/height sway around the elevated base — the
 * fighters sit fixed along the X axis in front of a backdrop, so a full 360°
 * orbit would swing the camera behind the ground plane; this arcs back and
 * forth instead, just enough to keep the shot feeling alive between punches. */
const DRIFT_YAW_MS = 9000;
const DRIFT_YAW_AMPLITUDE = 0.16; // rad
const DRIFT_BOB_MS = 6500;
const DRIFT_BOB_AMPLITUDE = 0.08; // world units of height

/**
 * Drives the battle camera each frame: idles on an elevated angled shot that
 * slowly drifts side to side, and eases into a closer 3/4 angle favoring the
 * attacker/impact point whenever `cameraCue` reports a new attack, easing back
 * out once it settles. Crits add a short decaying shake. Reads mutable refs
 * only — no React state, no re-renders.
 */
function BattleCamera({ cameraCue }: { cameraCue?: RefObject<CameraCue | null> }) {
  const currentPos = useRef(IDLE_POS.clone());
  const currentLookAt = useRef(IDLE_LOOKAT.clone());

  useFrame(({ camera, clock }) => {
    const cue = cameraCue?.current ?? null;
    const now = Date.now();
    const elapsed = cue ? now - cue.startTime : Infinity;
    const holdMs = PUNCH_HOLD_MS * (cue ? STAGGER_HOLD_MULT[cue.stagger] : 1);

    // Punch intensity: 0 at rest, rises then falls back to 0 over holdMs.
    const progress = Math.min(1, elapsed / holdMs);
    const punch = cue ? Math.sin(progress * Math.PI) : 0;

    const t = clock.elapsedTime * 1000;
    const driftYaw = Math.sin((t / DRIFT_YAW_MS) * Math.PI * 2) * DRIFT_YAW_AMPLITUDE * (1 - punch);
    const driftBob = Math.sin((t / DRIFT_BOB_MS) * Math.PI * 2) * DRIFT_BOB_AMPLITUDE * (1 - punch);
    const idlePos = new THREE.Vector3(
      Math.sin(driftYaw) * IDLE_POS.z + IDLE_POS.x,
      IDLE_POS.y + driftBob,
      Math.cos(driftYaw) * IDLE_POS.z
    );

    const sideSign = cue?.attacker === "r1" ? -1 : 1;
    const targetPos = new THREE.Vector3(sideSign * 0.6, 1.35, 1.7);
    const targetLookAt = new THREE.Vector3(-sideSign * 0.35, 0.05, 0);

    currentPos.current.lerpVectors(idlePos, targetPos, punch);
    currentLookAt.current.lerpVectors(IDLE_LOOKAT, targetLookAt, punch);

    let shakeX = 0;
    let shakeY = 0;
    const shakeCfg = cue ? STAGGER_SHAKE[cue.stagger] : null;
    if (shakeCfg && shakeCfg.mag > 0 && elapsed < shakeCfg.ms) {
      const decay = 1 - elapsed / shakeCfg.ms;
      shakeX = Math.sin(elapsed * 0.09) * shakeCfg.mag * decay;
      shakeY = Math.cos(elapsed * 0.11) * shakeCfg.mag * 0.85 * decay;
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
  intentA,
  intentB,
  physicsA,
  physicsB,
  cameraCue,
}: {
  fighterA: Pick<Chicken, "colorScheme" | "sex" | "physical" | "mutations">;
  fighterB: Pick<Chicken, "colorScheme" | "sex" | "physical" | "mutations">;
  animA: RefObject<FighterAnim | null>;
  animB: RefObject<FighterAnim | null>;
  /** Procedural-animation intent per fighter, written by BattleCanvas per turn. */
  intentA?: RefObject<AnimIntent | null>;
  intentB?: RefObject<AnimIntent | null>;
  /** Imperative handles for real-physics knockback/stagger, called by BattleCanvas on impact. */
  physicsA?: Ref<ChickenPhysicsHandle>;
  physicsB?: Ref<ChickenPhysicsHandle>;
  /** Latest attack event driving the dynamic camera; omit for a static wide shot. */
  cameraCue?: RefObject<CameraCue | null>;
}) {
  const worldFighterX = FIGHTER_X * STAGE_SCALE;
  // Fixed opponent world positions for the head-tracking layer (fighters sit at fixed X).
  const oppoPosForA = useRef(new THREE.Vector3(worldFighterX, STAGE_Y_OFFSET, 0));
  const oppoPosForB = useRef(new THREE.Vector3(-worldFighterX, STAGE_Y_OFFSET, 0));

  return (
    <Canvas
      camera={{ position: [IDLE_POS.x, IDLE_POS.y, IDLE_POS.z], fov: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <BattleCamera cameraCue={cameraCue} />
      <Suspense fallback={null}>
        <ArenaGround y={STAGE_Y_OFFSET} />
        <ArenaPhysics floorY={STAGE_Y_OFFSET}>
          <ChickenPhysicsRig
            ref={physicsA}
            colorScheme={fighterA.colorScheme}
            sex={fighterA.sex}
            physical={fighterA.physical}
            mutations={fighterA.mutations}
            combatAnim={animA}
            animIntent={intentA}
            opponentPos={oppoPosForA}
            facing="right"
            position={[-worldFighterX, STAGE_Y_OFFSET, 0]}
            worldScale={STAGE_SCALE}
          />
          <ChickenPhysicsRig
            ref={physicsB}
            colorScheme={fighterB.colorScheme}
            sex={fighterB.sex}
            physical={fighterB.physical}
            mutations={fighterB.mutations}
            combatAnim={animB}
            animIntent={intentB}
            opponentPos={oppoPosForB}
            facing="left"
            position={[worldFighterX, STAGE_Y_OFFSET, 0]}
            worldScale={STAGE_SCALE}
          />
        </ArenaPhysics>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
