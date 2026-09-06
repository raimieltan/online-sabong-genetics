"use client";

import { Suspense, useMemo, useRef } from "react";
import type { Ref, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import type { Chicken, StaggerLevel } from "@/lib/types";
import { CameraDirector, type CameraCueName } from "@/lib/animation/cameraDirector";

import { ArenaGround } from "./ArenaGround";
import { ArenaPhysics } from "./ArenaPhysics";
import { ChickenPhysicsRig, type ChickenPhysicsHandle } from "./ChickenPhysicsRig";
import { ImpactVFX, type ImpactVFXHandle } from "./ImpactVFX";
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

/**
 * Latest attack event for the camera to react to. `seq` is a monotonic counter
 * BattleCanvas bumps on every discrete beat (attack start, impact, KO, victory)
 * — the camera keys new cues off `seq` changing, not off deep-equality.
 */
export interface CameraCue {
  attacker: "r1" | "r2";
  startTime: number;
  isCrit: boolean;
  isMiss: boolean;
  stagger: StaggerLevel;
  /** Monotonic beat counter; a change means "act on this cue now". */
  seq?: number;
  /** Explicit director cue for this beat. Falls back to a heuristic if absent. */
  cueName?: CameraCueName;
  /** Which fighter the frame should favour for this beat. */
  focus?: "r1" | "r2" | "midpoint";
}

// Elevated 3/4 angle looking down at the stage (bird's-eye but tilted, not
// top-down) — higher and further back than a straight-on eye-level shot so
// both fighters and the ground read clearly, matching a Pokemon-battle-style
// framing rather than a flat portrait shot.
const IDLE_POS = new THREE.Vector3(0, 2.45, 3.7);
const IDLE_LOOKAT = new THREE.Vector3(0, -0.15, 0);
const ORBIT_RADIUS = Math.hypot(IDLE_POS.x, IDLE_POS.z);
const FOV = 90;

/**
 * Camera driven by the V2 `CameraDirector` (spec §20–22): a slow front-arc
 * orbit as the base motion, biased / pushed / shaken by discrete battle cues.
 * All easing lives in the director; this component only copies the result onto
 * the real camera each frame and adds the shake as a position offset.
 */
function DirectedCamera({
  cueRef,
  hitStopScaleRef,
}: {
  cueRef?: RefObject<CameraCue | null>;
  hitStopScaleRef?: RefObject<number>;
}) {
  const director = useMemo(
    () =>
      new CameraDirector({
        radius: ORBIT_RADIUS,
        height: IDLE_POS.y,
        fov: FOV,
        center: { x: IDLE_LOOKAT.x, y: IDLE_LOOKAT.y, z: IDLE_LOOKAT.z },
      }),
    []
  );
  const lastSeq = useRef<number>(-1);
  const lastStart = useRef<number>(-1);
  const virtualMs = useRef(0);
  const midpoint = useRef({ x: 0, y: IDLE_LOOKAT.y, z: 0 });
  const focusA = useRef({ x: -WORLD_HALF_GAP, y: STAGE_Y_OFFSET + 0.3, z: 0 });
  const focusB = useRef({ x: WORLD_HALF_GAP, y: STAGE_Y_OFFSET + 0.3, z: 0 });

  useFrame(({ camera }, rawDelta) => {
    const scale = hitStopScaleRef?.current ?? 1;
    const dt = Math.min(rawDelta, 1 / 30) * scale;
    // Virtual clock — freezes with the rest of the presentation during hit-stop
    // so the orbit sweep and shake phase hold still too.
    virtualMs.current += dt * 1000;
    const nowMs = virtualMs.current;

    const cue = cueRef?.current ?? null;
    if (cue) {
      const seq = cue.seq ?? 0;
      const fired = seq !== lastSeq.current || cue.startTime !== lastStart.current;
      if (fired) {
        lastSeq.current = seq;
        lastStart.current = cue.startTime;
        const focusVec =
          cue.focus === "r1"
            ? focusA.current
            : cue.focus === "r2"
              ? focusB.current
              : cue.focus === "midpoint"
                ? midpoint.current
                : cue.attacker === "r1"
                  ? focusB.current // default: favour the fighter being hit
                  : focusA.current;
        const name: CameraCueName = cue.cueName ?? heuristicCue(cue);
        director.setCue(name, focusVec);
      }
    }

    director.update(dt, nowMs, midpoint.current);

    camera.position.set(
      director.position.x + director.shake.x,
      director.position.y + director.shake.y,
      director.position.z + director.shake.z
    );
    camera.lookAt(director.lookAt.x, director.lookAt.y, director.lookAt.z);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - director.fov) > 0.01) {
      cam.fov = director.fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

function heuristicCue(cue: CameraCue): CameraCueName {
  if (cue.isMiss) return "attack";
  if (cue.isCrit) return "critical";
  if (cue.stagger === "knockdown") return "knockdown";
  if (cue.stagger === "heavy") return "impact_heavy";
  return "impact_light";
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
  vfxRef,
  hitStopScaleRef,
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
  /** Latest camera cue, consumed by the DirectedCamera / CameraDirector. */
  cameraCue?: RefObject<CameraCue | null>;
  /** Impact VFX handle — BattleCanvas calls `.spawn()` at contact. */
  vfxRef?: Ref<ImpactVFXHandle>;
  /** 0 during a hit-stop freeze so camera + VFX advancement freezes too. */
  hitStopScaleRef?: RefObject<number>;
}) {
  const worldFighterX = FIGHTER_X * STAGE_SCALE;
  // Fixed opponent world positions for the head-tracking layer (fighters sit at fixed X).
  const oppoPosForA = useRef(new THREE.Vector3(worldFighterX, STAGE_Y_OFFSET, 0));
  const oppoPosForB = useRef(new THREE.Vector3(-worldFighterX, STAGE_Y_OFFSET, 0));

  return (
    <Canvas
      camera={{ position: [IDLE_POS.x, IDLE_POS.y, IDLE_POS.z], fov: FOV }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <DirectedCamera cueRef={cameraCue} hitStopScaleRef={hitStopScaleRef} />
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
        <ImpactVFX ref={vfxRef} timeScaleRef={hitStopScaleRef} />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
