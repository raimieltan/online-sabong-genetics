"use client";

import { Suspense, useMemo, useRef } from "react";
import type { Ref, RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

import type { Chicken, StaggerLevel } from "@/lib/types";
import { CameraDirector, type CameraCueName } from "@/lib/animation/cameraDirector";
import { bodyClearanceRadius, hurtboxOffsets } from "@/lib/combat-v2/collision";
import type { AwakeningType, FighterCombatSnapshot, ReadTellType, TacticalMode } from "@/lib/combat-v2/types";

import { ArenaPhysics } from "./ArenaPhysics";
import { ChickenPhysicsRig, type ChickenPhysicsHandle } from "./ChickenPhysicsRig";
import { ImpactVFX, type ImpactVFXHandle } from "./ImpactVFX";
import { ChickenModel, PX_TO_WORLD, type FighterAnim } from "./ChickenModel";
import { ArenaEnvironment } from "./ArenaGround";
import type { AnimIntent } from "@/lib/animation/types";

// The GLB models are authored at ~0.7-1 world unit tall (see
// chicken_viewer.html's camera sitting ~0.75 units away). The old camera
// (z=9, fov 28) combined with a 0.55 downscale left them as barely-visible
// specks — these constants keep the models close to their native scale and
// bring the camera in to match, instead of shrinking the fighters further.
const FIGHTER_X = 0.75;
// Whole stage (ground disc + both fighters) sits low so it lands on the painted
// pit floor in the backdrop rather than floating up at crowd level.
const STAGE_Y_OFFSET = -3;
/** Uniform world scale of the fighter rigs. Exported so BattleCanvas can convert its px-space roam/lunge offsets into the same world units the models live in. */
export const STAGE_SCALE = 1.75;

/** World-space X each fighter's rig is anchored at. Their roam/lunge offsets ride on top of this, so it's the neutral centre of the engagement, not a hard position. */
export const WORLD_HALF_GAP = FIGHTER_X * STAGE_SCALE;

/** A FighterAnim px offset, converted to the world-space delta it actually produces on the model (inner group px → PX_TO_WORLD → outer STAGE_SCALE). */
export const ANIM_PX_TO_WORLD = PX_TO_WORLD * STAGE_SCALE;

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

// Elevated 3/4 angle that matches the painted sabong-pit backdrop: the camera
// sits roughly where a spectator on the arena rim stands, looking down across
// the pit at ~28°. A narrow FOV (instead of the old ~90° fish-eye) keeps the
// ground disc a flat ellipse that lands inside the painted ring, so the
// fighters read as standing *inside* that arena rather than on a bulging
// free-floating dome. The tight orbit arc (see cameraDirector defaults) keeps
// that alignment while the camera still breathes.
const IDLE_POS = new THREE.Vector3(0, 2.5, 13.5);
const IDLE_LOOKAT = new THREE.Vector3(0, -1.5, 0);
const ORBIT_RADIUS = Math.hypot(IDLE_POS.x, IDLE_POS.z);
// The wide arena backdrop needs enough FOV to keep both birds and the ring in
// view at long range. The director eases this wider only as separation grows.
const FOV = 38;

/**
 * Camera driven by the V2 `CameraDirector` (spec §20–22): a slow front-arc
 * orbit as the base motion, biased / pushed / shaken by discrete battle cues.
 * All easing lives in the director; this component only copies the result onto
 * the real camera each frame and adds the shake as a position offset.
 */
function DirectedCamera({
  cueRef,
  hitStopScaleRef,
  animA,
  animB,
  reducedMotion = false,
}: {
  cueRef?: RefObject<CameraCue | null>;
  hitStopScaleRef?: RefObject<number>;
  animA?: RefObject<FighterAnim | null>;
  animB?: RefObject<FighterAnim | null>;
  reducedMotion?: boolean;
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

    // Keep the framing targets on the actual (roaming) fighters, not the old
    // fixed ±WORLD_HALF_GAP spots — otherwise the camera bias/push cues drag the
    // frame to where a bird used to stand.
    const fy = STAGE_Y_OFFSET + 0.3;
    const a = animA?.current;
    const b = animB?.current;
    const ax = -WORLD_HALF_GAP + (a ? a.offsetX * ANIM_PX_TO_WORLD : 0);
    const az = a ? a.offsetZ * ANIM_PX_TO_WORLD : 0;
    const bx = WORLD_HALF_GAP + (b ? b.offsetX * ANIM_PX_TO_WORLD : 0);
    const bz = b ? b.offsetZ * ANIM_PX_TO_WORLD : 0;
    focusA.current.x = ax;
    focusA.current.z = az;
    focusB.current.x = bx;
    focusB.current.z = bz;
    midpoint.current.x = (ax + bx) / 2;
    midpoint.current.y = fy;
    midpoint.current.z = (az + bz) / 2;

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

    const separation = Math.hypot(ax - bx, az - bz);
    director.update(dt, nowMs, midpoint.current, separation);

    camera.position.set(
      director.position.x + (reducedMotion ? 0 : director.shake.x),
      director.position.y + (reducedMotion ? 0 : director.shake.y),
      director.position.z + (reducedMotion ? 0 : director.shake.z)
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

/**
 * Feeds each fighter's live (roaming) world position into the other's
 * `opponentPos` ref every frame, so ChickenModel's head-tracking aim keeps
 * pointing at where the opponent actually is now rather than a fixed ±X spot.
 */
function FighterTracker({
  animA,
  animB,
  oppoForA,
  oppoForB,
}: {
  animA: RefObject<FighterAnim | null>;
  animB: RefObject<FighterAnim | null>;
  oppoForA: RefObject<THREE.Vector3>;
  oppoForB: RefObject<THREE.Vector3>;
}) {
  useFrame(() => {
    const a = animA.current;
    const b = animB.current;
    const y = STAGE_Y_OFFSET + 0.3;
    if (b && oppoForA.current) {
      oppoForA.current.set(
        WORLD_HALF_GAP + b.offsetX * ANIM_PX_TO_WORLD,
        y,
        b.offsetZ * ANIM_PX_TO_WORLD
      );
    }
    if (a && oppoForB.current) {
      oppoForB.current.set(
        -WORLD_HALF_GAP + a.offsetX * ANIM_PX_TO_WORLD,
        y,
        a.offsetZ * ANIM_PX_TO_WORLD
      );
    }
  });
  return null;
}

/** Approximate world-space height of a standing rig's head above the stage
 * floor, at `STAGE_SCALE` — used only to aim the screen-space projection, not
 * for collision. */
const HEAD_HEIGHT_WORLD = 1.3;

/** Live screen-space position (viewport percent) a fighter's head projects
 * to, refreshed every frame so HUD elements can track the actual camera
 * instead of a fixed corner. `visible` is false once the head goes behind
 * the camera plane (e.g. a hard cinematic cut). */
export interface ScreenAnchor {
  xPct: number;
  yPct: number;
  visible: boolean;
}

/**
 * Projects each fighter's head position through the live (director-driven)
 * camera into viewport-percent coordinates, written into mutable refs rather
 * than React state so the 60fps camera orbit/shake doesn't force HUD
 * re-renders — consumers (e.g. the tell HUD) sample the ref on their own
 * slower tick.
 */
function ScreenAnchorTracker({
  animA,
  animB,
  anchorA,
  anchorB,
}: {
  animA: RefObject<FighterAnim | null>;
  animB: RefObject<FighterAnim | null>;
  anchorA?: RefObject<ScreenAnchor>;
  anchorB?: RefObject<ScreenAnchor>;
}) {
  const worldFighterX = FIGHTER_X * STAGE_SCALE;
  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const project = (pose: FighterAnim | null, baseX: number, out?: RefObject<ScreenAnchor>) => {
      if (!out?.current) return;
      const x = baseX + (pose?.offsetX ?? 0) * ANIM_PX_TO_WORLD;
      const z = (pose?.offsetZ ?? 0) * ANIM_PX_TO_WORLD;
      const y = STAGE_Y_OFFSET + HEAD_HEIGHT_WORLD - (pose?.offsetY ?? 0) * ANIM_PX_TO_WORLD;
      point.set(x, y, z).project(camera);
      out.current.xPct = Math.min(94, Math.max(6, (point.x * 0.5 + 0.5) * 100));
      out.current.yPct = Math.min(88, Math.max(6, (1 - (point.y * 0.5 + 0.5)) * 100));
      out.current.visible = point.z < 1;
    };
    project(animA.current, -worldFighterX, anchorA);
    project(animB.current, worldFighterX, anchorB);
  });

  return null;
}

/** Live per-fighter posture summary, written every HUD tick from the sim's
 * `tacticalMode` + primary read-tell — drives the ground intent ring's color
 * and pulse without threading full combat state into the 3D layer.
 *
 * `tacticalMode` only ever leaves `'balanced'` for a fighter that's actively
 * being coached (i.e. the player's own bird after issuing a command) — the
 * AI opponent runs at `'balanced'` for effectively the whole match. So the
 * ring can't gate solely on tacticalMode or it would only ever light up for
 * the player's fighter; `tellType` (present for both fighters any time a
 * read is forming) is the primary driver, with tacticalMode layered on top
 * as an accent once a tactic actually is active. */
export interface FighterPosture {
  mode: TacticalMode;
  hesitating: boolean;
  strength: number;
  tellType: ReadTellType | null;
}

const AGGRESSIVE_TELLS = new Set<ReadTellType>(["weight_forward", "closing_distance", "rear_leg_loaded", "overextended"]);
const DEFENSIVE_TELLS = new Set<ReadTellType>(["guard_open", "side_on_stance", "recovering", "resetting"]);

function postureColor(posture: FighterPosture | null): string {
  if (!posture) return "#b99b5f";
  if (posture.hesitating) return "#e8d34a";
  if (posture.mode === "pressure" || posture.mode === "all_in") return "#e2542d";
  if (posture.mode === "defensive" || posture.mode === "counter" || posture.mode === "recover") return "#6f9bd8";
  if (posture.tellType && AGGRESSIVE_TELLS.has(posture.tellType)) return "#e2542d";
  if (posture.tellType && DEFENSIVE_TELLS.has(posture.tellType)) return "#6f9bd8";
  return "#b99b5f";
}

/** Below this a forming tell is too faint to bother lighting the ring for — matches the read threshold the tell HUD itself uses (docs/combat/tell-revamped.md §22). */
const RING_TELL_THRESHOLD = 0.18;

/** Ground-level pulsing ring under a fighter — the "body language"
 * reinforcement layer alongside the floating tell label: orange/red for
 * pressure, blue/gray for a defensive read, a fast yellow flicker for
 * hesitation. Purely additive VFX; never gates gameplay. */
function IntentRing({
  anim,
  anchorX,
  postureRef,
}: {
  anim: RefObject<FighterAnim | null>;
  anchorX: number;
  postureRef?: RefObject<FighterPosture | null>;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    const pose = anim.current;
    if (!mesh.current || !material.current || !pose) return;
    mesh.current.position.set(
      anchorX + pose.offsetX * ANIM_PX_TO_WORLD,
      STAGE_Y_OFFSET + 0.022,
      pose.offsetZ * ANIM_PX_TO_WORLD
    );
    const posture = postureRef?.current ?? null;
    clock.current += delta;
    const pulseHz = posture?.hesitating ? 6.5 : 1.2;
    const pulse = Math.sin(clock.current * pulseHz * Math.PI * 2) * 0.5 + 0.5;
    const tacticActive = !!posture && posture.mode !== "balanced";
    const tellActive = !!posture && posture.strength >= RING_TELL_THRESHOLD;
    const active = tacticActive || tellActive || !!posture?.hesitating;
    const baseOpacity = active ? 0.1 + Math.max(posture?.strength ?? 0, tacticActive ? 0.4 : 0) * 0.24 : 0;
    material.current.color.set(postureColor(posture));
    material.current.opacity = baseOpacity * (0.5 + pulse * 0.5);
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <ringGeometry args={[0.52, 0.76, 40]} />
      <meshBasicMaterial ref={material} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function heuristicCue(cue: CameraCue): CameraCueName {
  if (cue.isMiss) return "attack";
  if (cue.isCrit) return "critical";
  if (cue.stagger === "knockdown") return "knockdown";
  if (cue.stagger === "heavy") return "impact_heavy";
  return "impact_light";
}

/** The rural image is scenery behind the arena, while every surface the
 * fighters interact with remains a perspective-correct Three.js object. */
function RuralSkybox() {
  const texture = useMemo(() => {
    const ruralTexture = new THREE.TextureLoader().load("/background/rural-skybox.png");
    ruralTexture.colorSpace = THREE.SRGBColorSpace;
    return ruralTexture;
  }, []);

  return <primitive attach="background" object={texture} />;
}

/** Renders V2's simulation hit spheres and body-clearance circle, not model/mesh bounds. */
function CollisionDebugVolumes({
  fighter,
  anim,
  anchorX,
  facingOffset,
  color,
}: {
  fighter: FighterCombatSnapshot;
  anim: RefObject<FighterAnim | null>;
  anchorX: number;
  facingOffset: number;
  color: string;
}) {
  const group = useRef<THREE.Group>(null);
  const offsets = useMemo(() => hurtboxOffsets(fighter.physical), [fighter]);
  const clearanceRadius = useMemo(() => bodyClearanceRadius(fighter.physical), [fighter]);

  useFrame(() => {
    const pose = anim.current;
    if (!group.current || !pose) return;
    group.current.position.set(
      anchorX + pose.offsetX * ANIM_PX_TO_WORLD,
      STAGE_Y_OFFSET - pose.offsetY * ANIM_PX_TO_WORLD,
      pose.offsetZ * ANIM_PX_TO_WORLD
    );
    group.current.rotation.y = -pose.yaw + facingOffset;
  });

  return (
    <group ref={group}>
      {offsets.map(({ zone, center, radius }) => (
        <mesh key={zone} position={[center.x, center.y, center.z]}>
          <sphereGeometry args={[radius, 16, 12]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.8} depthTest={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(0, clearanceRadius - 0.018), clearanceRadius + 0.018, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Contact shadow projected onto the 3D arena floor. */
function FighterContactShadow({ anim, anchorX }: { anim: RefObject<FighterAnim | null>; anchorX: number }) {
  const shadow = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const pose = anim.current;
    if (!shadow.current || !pose) return;
    shadow.current.position.set(anchorX + pose.offsetX * ANIM_PX_TO_WORLD, STAGE_Y_OFFSET + .012, pose.offsetZ * ANIM_PX_TO_WORLD);
    // Airborne clips lift offsetY; their shadow stays on the arena floor and
    // softens as the bird rises.
    const lift = Math.max(0, -pose.offsetY * ANIM_PX_TO_WORLD);
    const s = 1 + Math.min(.75, lift * .55);
    shadow.current.scale.set(s, s, s);
    (shadow.current.material as THREE.MeshBasicMaterial).opacity = Math.max(.06, .24 - lift * .09);
  });
  return (
    <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <circleGeometry args={[.42, 28]} />
      <meshBasicMaterial color="#160d08" transparent opacity={.24} depthWrite={false} />
    </mesh>
  );
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
  awakeningA,
  awakeningB,
  physicsA,
  physicsB,
  cameraCue,
  vfxRef,
  hitStopScaleRef,
  simulationDriven = false,
  showCollisionDebug = false,
  collisionDebugFighters,
  screenAnchorA,
  screenAnchorB,
  postureA,
  postureB,
}: {
  fighterA: Pick<Chicken, "colorScheme" | "sex" | "physical" | "mutations" | "growthStage">;
  fighterB: Pick<Chicken, "colorScheme" | "sex" | "physical" | "mutations" | "growthStage">;
  animA: RefObject<FighterAnim | null>;
  animB: RefObject<FighterAnim | null>;
  /** Procedural-animation intent per fighter, written by BattleCanvas per turn. */
  intentA?: RefObject<AnimIntent | null>;
  intentB?: RefObject<AnimIntent | null>;
  /** Current awakening type per fighter (or null), read every frame to drive the plumage tint + particle aura. */
  awakeningA?: RefObject<AwakeningType | null>;
  awakeningB?: RefObject<AwakeningType | null>;
  /** Imperative handles for real-physics knockback/stagger, called by BattleCanvas on impact. */
  physicsA?: Ref<ChickenPhysicsHandle>;
  physicsB?: Ref<ChickenPhysicsHandle>;
  /** Latest camera cue, consumed by the DirectedCamera / CameraDirector. */
  cameraCue?: RefObject<CameraCue | null>;
  /** Impact VFX handle — BattleCanvas calls `.spawn()` at contact. */
  vfxRef?: Ref<ImpactVFXHandle>;
  /** 0 during a hit-stop freeze so camera + VFX advancement freezes too. */
  hitStopScaleRef?: RefObject<number>;
  /** V2 owns all world motion and collisions; do not add independent Rapier displacement. */
  simulationDriven?: boolean;
  /** Draw V2 simulation hurtboxes and clearance radii for movement diagnosis. */
  showCollisionDebug?: boolean;
  collisionDebugFighters?: [FighterCombatSnapshot, FighterCombatSnapshot];
  /** Written every frame with each fighter's head projected into viewport-% — lets the HUD anchor the live tell label to the actual on-screen fighter. */
  screenAnchorA?: RefObject<ScreenAnchor>;
  screenAnchorB?: RefObject<ScreenAnchor>;
  /** Drives the ground intent ring's color/pulse; written by the HUD tick, read every render frame. */
  postureA?: RefObject<FighterPosture | null>;
  postureB?: RefObject<FighterPosture | null>;
}) {
  const worldFighterX = FIGHTER_X * STAGE_SCALE;
  // One-time capability selection avoids a runtime FPS monitor and React work
  // in the render loop. Gameplay and combat visibility remain identical.
  const graphics = useMemo(() => {
    if (typeof navigator === "undefined") return { dpr: [1, 1.25] as [number, number], shadow: 512, reducedMotion: false };
    const lowMemory = "deviceMemory" in navigator && (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined && (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return { dpr: lowMemory ? [1, 1] as [number, number] : [1, 1.5] as [number, number], shadow: lowMemory ? 512 : 1024, reducedMotion };
  }, []);
  // Fixed opponent world positions for the head-tracking layer (fighters sit at fixed X).
  const oppoPosForA = useRef(new THREE.Vector3(worldFighterX, STAGE_Y_OFFSET, 0));
  const oppoPosForB = useRef(new THREE.Vector3(-worldFighterX, STAGE_Y_OFFSET, 0));

  return (
    <Canvas
      camera={{ position: [IDLE_POS.x, IDLE_POS.y, IDLE_POS.z], fov: FOV }}
      dpr={graphics.dpr}
      gl={{ antialias: true, alpha: false }}
      shadows
      onCreated={({ gl, scene }) => {
        // ACES gives the warm sun / cool sky setup a filmic shoulder without
        // an extra post-processing pass. Keep shadows bounded for web GPUs.
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.04;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        scene.fog = new THREE.FogExp2("#8d9ba0", 0.018);
      }}
    >
      <RuralSkybox />
      <ArenaEnvironment floorY={STAGE_Y_OFFSET} />
      {/* Warm sun from the open left side of the rural setting, balanced by a
          soft blue sky fill so feather detail remains visible in shadow. */}
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[-7, 10, 5]}
        intensity={2.35}
        color="#ffe0ad"
        castShadow
        shadow-mapSize-width={graphics.shadow}
        shadow-mapSize-height={graphics.shadow}
        shadow-camera-near={1}
        shadow-camera-far={28}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-bias={-0.00018}
        shadow-normalBias={0.035}
      />
      <directionalLight position={[5, 4, -6]} intensity={0.45} color="#b7d8ff" />
      <DirectedCamera
        cueRef={cameraCue}
        hitStopScaleRef={hitStopScaleRef}
        animA={animA}
        animB={animB}
        reducedMotion={graphics.reducedMotion}
      />
      <FighterTracker
        animA={animA}
        animB={animB}
        oppoForA={oppoPosForA}
        oppoForB={oppoPosForB}
      />
      {(screenAnchorA || screenAnchorB) && (
        <ScreenAnchorTracker animA={animA} animB={animB} anchorA={screenAnchorA} anchorB={screenAnchorB} />
      )}
      <Suspense fallback={null}>
        <IntentRing anim={animA} anchorX={-worldFighterX} postureRef={postureA} />
        <IntentRing anim={animB} anchorX={worldFighterX} postureRef={postureB} />
        <FighterContactShadow anim={animA} anchorX={-worldFighterX} />
        <FighterContactShadow anim={animB} anchorX={worldFighterX} />
        {simulationDriven ? <>
          <group position={[-worldFighterX, STAGE_Y_OFFSET, 0]} scale={STAGE_SCALE}>
            <ChickenModel {...fighterA} combatAnim={animA} animIntent={intentA} awakening={awakeningA} opponentPos={oppoPosForA} facing="right" />
          </group>
          <group position={[worldFighterX, STAGE_Y_OFFSET, 0]} scale={STAGE_SCALE}>
            <ChickenModel {...fighterB} combatAnim={animB} animIntent={intentB} awakening={awakeningB} opponentPos={oppoPosForB} facing="left" />
          </group>
          {showCollisionDebug && collisionDebugFighters && <>
            <CollisionDebugVolumes fighter={collisionDebugFighters[0]} anim={animA} anchorX={-worldFighterX} facingOffset={0} color="#fb7185" />
            <CollisionDebugVolumes fighter={collisionDebugFighters[1]} anim={animB} anchorX={worldFighterX} facingOffset={Math.PI} color="#60a5fa" />
          </>}
        </> : <ArenaPhysics floorY={STAGE_Y_OFFSET}>
          <ChickenPhysicsRig
            ref={physicsA}
            colorScheme={fighterA.colorScheme}
            sex={fighterA.sex}
            growthStage={fighterA.growthStage}
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
            growthStage={fighterB.growthStage}
            physical={fighterB.physical}
            mutations={fighterB.mutations}
            combatAnim={animB}
            animIntent={intentB}
            opponentPos={oppoPosForB}
            facing="left"
            position={[worldFighterX, STAGE_Y_OFFSET, 0]}
            worldScale={STAGE_SCALE}
          />
        </ArenaPhysics>}
        <ImpactVFX ref={vfxRef} timeScaleRef={hitStopScaleRef} />
      </Suspense>
    </Canvas>
  );
}
