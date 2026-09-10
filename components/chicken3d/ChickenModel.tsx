"use client";

import { useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

import { resolveVisualTraits } from "@/lib/physicalProfile";
import { deriveAnimationGains } from "@/lib/animation/physicalGenetics";
import { ProceduralAnimationController } from "@/lib/animation/ProceduralAnimationController";
import type { AnimIntent } from "@/lib/animation/types";
import type { Chicken, ChickenColorScheme, PhysicalBlock } from "@/lib/types";

// Both sexes share the single rigged mesh — there is no separate hen
// geometry, so a hen is rendered as the same rig with a sex-specific pose
// override (see applyHenOverride) rather than a different model.
/** Canonical symmetric T-pose rig; all procedural poses are additive to its bind pose. */
const MODEL_PATH = "/3d-chicken/rooster_rigged_corrected_symmetry.glb";

/** Bone scaled by "Giant" when the mutation is expressed. */
const GIANT_SCALE = 1.4;

/** All-1 baseline across the 18-trait genome, for callers that don't pass `physical`. */
const DEFAULT_PHYSICAL_BLOCK: PhysicalBlock = {
  scale: 1,
  bodyGirth: 1,
  bodyLength: 1,
  chest: 1,
  neckLength: 1,
  neckThick: 1,
  headSize: 1,
  combSize: 1,
  wattleSize: 1,
  beakLength: 1,
  wingSpan: 1,
  wingSize: 1,
  legLength: 1,
  legThick: 1,
  footSize: 1,
  tailLength: 1,
  tailSpread: 1,
  tailArc: 1,
};

/** Converts the pixel-space offsets the 2D battle timeline produces into world units. */
export const PX_TO_WORLD = 0.016;

// --- Feather color-pattern shader ------------------------------------------
// Patches M_Feathers' fragment shader to blend a primary/secondary color per
// the genome's resolved pattern gene, instead of a baked-texture pipeline.
// Ported from public/3d-chicken/chicken_viewer.html's installPatternShader.
const PATTERN_TYPES: Record<ChickenColorScheme["pattern"], number> = {
  SOLID: 0,
  BARRED: 1,
  LACED: 2,
  MOTTLED: 3,
  SPANGLED: 4,
};

function installPatternShader(material: THREE.MeshStandardMaterial) {
  if (material.userData.patternInstalled) return;
  material.userData.patternInstalled = true;
  material.userData.patternUniforms = {
    uPatternType: { value: PATTERN_TYPES.SOLID },
    uSecondaryColor: { value: new THREE.Color(0x2a1c10) },
    uPatternScale: { value: 8.0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.userData.patternUniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <uv_pars_vertex>",
        `#include <uv_pars_vertex>
        varying vec2 vPatternUv;`
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
        vPatternUv = uv;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <uv_pars_fragment>",
        `#include <uv_pars_fragment>
        varying vec2 vPatternUv;`
      )
      .replace(
        "#include <common>",
        `#include <common>
        uniform int uPatternType;
        uniform vec3 uSecondaryColor;
        uniform float uPatternScale;

        float patternHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float patternNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          float a = patternHash(i);
          float b = patternHash(i + vec2(1.0, 0.0));
          float c = patternHash(i + vec2(0.0, 1.0));
          float d = patternHash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        float patternMix(vec2 uv, int type, float scale) {
          if (type == 1) {
            float bands = sin(uv.y * scale * 3.14159);
            return smoothstep(0.15, 0.5, bands);
          } else if (type == 2) {
            vec2 cell = fract(uv * scale) - 0.5;
            float edge = max(abs(cell.x), abs(cell.y));
            return smoothstep(0.36, 0.44, edge);
          } else if (type == 3) {
            float n = patternNoise(uv * scale);
            return smoothstep(0.55, 0.7, n);
          } else if (type == 4) {
            vec2 cell = fract(uv * scale) - 0.5;
            float d = length(cell);
            float jitter = patternHash(floor(uv * scale));
            return 1.0 - smoothstep(0.16, 0.22, d - jitter * 0.08);
          }
          return 0.0;
        }`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          float pm = patternMix(vPatternUv, uPatternType, uPatternScale);
          diffuseColor.rgb = mix(diffuseColor.rgb, uSecondaryColor, pm);
        }`
      );
  };
  material.needsUpdate = true;
}

function setPattern(material: THREE.MeshStandardMaterial | undefined, typeName: ChickenColorScheme["pattern"], secondaryHex: string) {
  if (!material?.userData.patternUniforms) return;
  material.userData.patternUniforms.uPatternType.value = PATTERN_TYPES[typeName] ?? 0;
  material.userData.patternUniforms.uSecondaryColor.value.set(secondaryHex);
}

/**
 * The authored GLB shares a compact set of materials.  Keep that economical
 * setup, but make each surface answer light like the thing it represents.
 * This is deliberately material response, not a replacement texture stack:
 * genetic colour/patterns remain the source of identity.
 */
function tuneBattleMaterial(name: string, material: THREE.MeshStandardMaterial) {
  material.metalness = 0;
  material.envMapIntensity = 0.55;

  if (name === "M_Feathers" || name === "M_Hackle" || name === "M_Wing" || name === "M_Tail") {
    material.roughness = 0.7;
    material.envMapIntensity = 0.38;
  } else if (name === "M_Comb") {
    // Softer, slightly waxy tissue response; inexpensive alternative to SSS.
    material.roughness = 0.52;
    material.envMapIntensity = 0.22;
  } else if (name === "M_Beak" || name === "M_Legs") {
    material.roughness = 0.4;
    material.envMapIntensity = 0.7;
  }
}

/**
 * Genome traits -> per-bone WORLD scale. Ported from roosterGenome.ts's
 * worldScales/applyGenome: local scale = worldScale / parentWorldScale, so
 * each part is independent — fattening the body does not inflate the head,
 * a bigger Chest doesn't stretch the Neck/Wings hanging off it, etc.
 */
const BONE_PARENT: Record<string, string | null> = {
  Root: null,
  Hips: "Root",
  Spine: "Hips",
  Chest: "Spine",
  Neck: "Chest",
  Head: "Neck",
  Hackle: "Neck",
  Comb: "Head",
  Wattle: "Head",
  Beak: "Head",
  WingL: "Chest",
  WingL_Mid: "WingL",
  WingL_Tip: "WingL_Mid",
  WingR: "Chest",
  WingR_Mid: "WingR",
  WingR_Tip: "WingR_Mid",
  Tail: "Hips",
  Tail_Tip: "Tail",
  ThighL: "Hips",
  ShankL: "ThighL",
  FootL: "ShankL",
  ThighR: "Hips",
  ShankR: "ThighR",
  FootR: "ShankR",
};

function worldScales(t: PhysicalBlock): Record<string, [number, number, number]> {
  const S: Record<string, [number, number, number]> = {
    Root: [t.scale, t.scale, t.scale],
    Hips: [t.bodyGirth, t.bodyGirth * 0.85 + 0.15, t.bodyLength],
    Spine: [t.bodyGirth, t.bodyGirth * 0.85 + 0.15, t.bodyLength],
    Chest: [t.chest, t.chest, t.chest],
    Neck: [t.neckThick, t.neckLength, t.neckThick],
    Head: [t.headSize, t.headSize, t.headSize],
    // Fixed world scale — cancels out Neck's genetic scale (Hackle is a
    // child bone of Neck in the rig) so hackle size never varies with
    // breeding, regardless of how thick/long/small the neck or head are.
    Hackle: [1, 1, 1],
    Comb: [t.combSize * 0.6 + 0.4, t.combSize, t.combSize * 0.6 + 0.4],
    Wattle: [t.wattleSize, t.wattleSize, t.wattleSize],
    Beak: [1, 1, t.beakLength],
    Tail: [t.tailSpread, t.tailArc, t.tailLength],
    Tail_Tip: [t.tailSpread, t.tailArc, t.tailLength],
  };
  for (const s of ["L", "R"]) {
    S[`Wing${s}`] = [t.wingSpan, t.wingSize, t.wingSize];
    S[`Wing${s}_Mid`] = [t.wingSpan, t.wingSize, t.wingSize];
    S[`Wing${s}_Tip`] = [t.wingSpan, t.wingSize, t.wingSize];
    S[`Thigh${s}`] = [t.legThick, t.legLength, t.legThick];
    S[`Shank${s}`] = [t.legThick, t.legLength, t.legThick];
    S[`Foot${s}`] = [t.footSize, t.footSize, t.footSize];
  }
  return S;
}

function applyProportions(bones: Record<string, THREE.Object3D>, physical: PhysicalBlock) {
  const W = worldScales(physical);
  for (const name in BONE_PARENT) {
    const bone = bones[name];
    if (!bone) continue;
    const w = W[name] ?? [1, 1, 1];
    const parent = BONE_PARENT[name];
    const pw = (parent && W[parent]) || [1, 1, 1];
    bone.scale.set(w[0] / pw[0], w[1] / pw[1], w[2] / pw[2]);
  }
}

/**
 * Hens share the rooster's mesh — there is no separate hen geometry — so sex
 * is expressed as a pose override applied after the genome scale: no crown
 * (Comb/Wattle scaled toward 0) and a shorter, flatter tail than a rooster's
 * genome would otherwise render. A hen's underlying trait *values* still
 * breed/inherit normally; only this render-layer clamp differs by sex.
 */
const HEN_COMB_SCALE = 0.15;
const HEN_TAIL_LENGTH_MULT = 0.55;
const HEN_TAIL_ARC_MULT = 0.6;

function applyHenOverride(bones: Record<string, THREE.Object3D>, physical: PhysicalBlock) {
  bones["Comb"]?.scale.multiplyScalar(HEN_COMB_SCALE);
  bones["Wattle"]?.scale.multiplyScalar(HEN_COMB_SCALE);
  bones["Hackle"]?.scale.setScalar(0);
  const tailScale: [number, number, number] = [
    physical.tailSpread,
    physical.tailArc * HEN_TAIL_ARC_MULT,
    physical.tailLength * HEN_TAIL_LENGTH_MULT,
  ];
  bones["Tail"]?.scale.set(...tailScale);
  bones["Tail_Tip"]?.scale.set(...tailScale);
}

/**
 * The corrected source GLB is intentionally authored in a symmetric T-pose.
 * Its former counterpart stored the folded-wing silhouette in the bind-local
 * shoulder rotations, which is what the procedural clips were designed to
 * start from. Keep the source bind pose untouched, but give every runtime
 * clone that same folded neutral pose before additive animation is captured.
 */
function applyRuntimeNeutralPose(bones: Record<string, THREE.Object3D>) {
  bones["WingL"]?.quaternion.identity();
  bones["WingR"]?.quaternion.identity();
}

/**
 * Genome → expressed mutation tags drives the mutation-slot bone nodes and material overrides.
 * `mats` maps a rig material name to every cloned instance that shares it — several meshes (e.g.
 * WingL/WingL_Tip/WingR/WingR_Tip) reuse the same named material in the source GLB, and each gets
 * its own clone, so every override here must loop over the full array or the un-touched clones
 * keep the GLB's baked-in default color.
 */
function applyVisualTraits(
  bones: Record<string, THREE.Object3D>,
  mats: Record<string, THREE.MeshStandardMaterial[]>,
  visualTraits: string[]
) {
  const has = (tag: string) => visualTraits.includes(tag);

  if (has("ALBINO")) {
    for (const m of ["M_Feathers", "M_Hackle", "M_Wing", "M_Tail"]) {
      mats[m]?.forEach((mat) => mat.color.set("#f5f2ea"));
    }
  }

  for (const m of ["M_Feathers", "M_Hackle", "M_Wing"]) {
    for (const mat of mats[m] ?? []) {
      mat.emissive = new THREE.Color(has("LUMINESCENT") ? 0x4fffb0 : 0x000000);
      mat.emissiveIntensity = has("LUMINESCENT") ? 0.55 : 0;
    }
  }

  // rooster_rigged.glb ships its mutation slot meshes visible at scale 1, so
  // every slot must be set each render — expressed slots to 1, the rest to 0.
  const setSlot = (name: string, on: boolean) => bones[name]?.scale.setScalar(on ? 1 : 0);
  setSlot("Mut_SecondHead", has("TWO_HEADED"));
  setSlot("Mut_Spur_L", has("IRON_SPURS"));
  setSlot("Mut_Spur_R", has("IRON_SPURS"));
  setSlot("Mut_ExtraWing_L", has("EXTRA_WINGS"));
  setSlot("Mut_ExtraWing_R", has("EXTRA_WINGS"));

  // multiplyScalar (not set) — Root's scale was already set from the `scale`
  // trait in applyProportions; Giant multiplies on top of that instead of
  // clobbering it.
  if (has("GIANT")) bones["Root"]?.scale.multiplyScalar(GIANT_SCALE);
}

/**
 * Per-frame fighter animation state driven by the battle timeline (turn lunges,
 * hit flashes, idle bob/breathing, limb phases). Shape mirrors the values the
 * canvas-based battle replay already computes each frame.
 */
export interface FighterAnim {
  offsetX: number;
  offsetY: number;
  /** Depth-axis (world Z) offset — sidestepping/circling and aerial-move loops. */
  offsetZ: number;
  rot: number;
  /** Extra yaw (world Y rotation) on top of the fighter's base facing — circling turns and spin attacks. */
  yaw: number;
  /** Barrel-roll (world Z rotation) for aerial flips; 0 when grounded. */
  roll: number;
  scaleX: number;
  scaleY: number;
  flash: number; // 0..1 flash white on hit
  wingPhase: number;
  legPhase: number;
}

export function ChickenModel({
  colorScheme,
  sex,
  physical,
  mutations,
  animate = true,
  combatAnim,
  animIntent,
  opponentPos,
  facing,
  basePosition = [0, 0, 0],
}: {
  colorScheme: Chicken["colorScheme"];
  sex: Chicken["sex"];
  physical?: Chicken["physical"];
  mutations?: Chicken["mutations"];
  animate?: boolean;
  /** When provided, the model is driven by this ref every frame instead of the idle showcase spin. */
  combatAnim?: RefObject<FighterAnim | null>;
  /** Procedural-animation intent (state to play), written by BattleCanvas per turn / at impact. */
  animIntent?: RefObject<AnimIntent | null>;
  /** Opponent world position, for the head-tracking additive layer. */
  opponentPos?: RefObject<THREE.Vector3 | null>;
  /** Which way the fighter should face when `combatAnim` drives it (head points toward the opponent). */
  facing?: "left" | "right";
  basePosition?: [number, number, number];
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const group = useRef<THREE.Group>(null);

  const clonedScene = useMemo(() => {
    // Plain Object3D#clone(true) deep-clones the bone hierarchy but leaves
    // SkinnedMesh.skeleton pointing at the ORIGINAL (shared, never-rendered)
    // skeleton — every fighter instance then skins against those frozen bones
    // and the mesh's own matrixWorld cancels back out (AttachedBindMode
    // recomputes bindMatrixInverse from it each frame), so all instances
    // collapse onto the same rest-pose transform regardless of this group's
    // position/rotation. SkeletonUtils.clone rebinds skeletons to the cloned
    // bones so each fighter is independently posable and positionable.
    const clone = SkeletonUtils.clone(scene) as typeof scene;
    // Several meshes share one named material in the source GLB (e.g. WingL,
    // WingL_Tip, WingR, and WingR_Tip all use "M_Wing") — each gets its own
    // clone below, so every name maps to ALL of its clones, not just one.
    // Recoloring must loop over the whole array or the un-visited clones
    // keep the GLB's original baked-in color.
    const mats: Record<string, THREE.MeshStandardMaterial[]> = {};
    const bones: Record<string, THREE.Object3D> = {};

    clone.traverse((node) => {
      if (node instanceof THREE.Bone || node.name) {
        bones[node.name] = bones[node.name] ?? node;
      }
      if (!(node instanceof THREE.Mesh)) return;

      const source = Array.isArray(node.material) ? node.material[0] : node.material;
      const material = source.clone();
      node.material = material;
      if (material instanceof THREE.MeshStandardMaterial && material.name) {
        tuneBattleMaterial(material.name, material);
        (mats[material.name] ??= []).push(material);
      }
      // The two active fighters are the visual priority. Their shadows give
      // the arena volume without adding any dynamic lights.
      node.castShadow = true;
      node.receiveShadow = true;
    });

    // 1:1 onto the rig's 7 materials.
    mats["M_Feathers"]?.forEach((m) => m.color.set(colorScheme.body));
    mats["M_Hackle"]?.forEach((m) => m.color.set(colorScheme.hackle));
    mats["M_Wing"]?.forEach((m) => m.color.set(colorScheme.wings));
    mats["M_Tail"]?.forEach((m) => m.color.set(colorScheme.tail));
    mats["M_Comb"]?.forEach((m) => m.color.set(colorScheme.comb));
    mats["M_Beak"]?.forEach((m) => m.color.set(colorScheme.beak));
    mats["M_Legs"]?.forEach((m) => m.color.set(colorScheme.shanks));
    for (const feathers of mats["M_Feathers"] ?? []) {
      installPatternShader(feathers);
      setPattern(feathers, colorScheme.pattern, colorScheme.patternColor);
    }

    applyProportions(bones, physical ?? DEFAULT_PHYSICAL_BLOCK);
    if (sex === "hen") applyHenOverride(bones, physical ?? DEFAULT_PHYSICAL_BLOCK);
    applyVisualTraits(bones, mats, mutations ? resolveVisualTraits({ mutations }) : []);
    applyRuntimeNeutralPose(bones);

    return { scene: clone, bones };
  }, [scene, colorScheme, physical, mutations, sex]);

  // Procedural animation controller — rebuilt whenever the scene is re-cloned
  // (physical/mutation change) so it re-captures rest pose against the new bones.
  const controller = useMemo(() => {
    return new ProceduralAnimationController(clonedScene.bones, {
      gains: deriveAnimationGains(physical),
      facing: facing ?? "right",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedScene]);

  // Per-frame scratch, mutated in useFrame — never React state.
  const lastIntentKey = useRef<string>("");
  const prevOffset = useRef({ x: 0, y: 0, z: 0, valid: false });
  const scratchVec = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!group.current) return;
    const modelScene = clonedScene.scene;

    if (combatAnim) {
      const yaw = facing === "right" ? Math.PI / 2 : facing === "left" ? -Math.PI / 2 : 0;
      group.current.rotation.y = yaw;

      const a = combatAnim.current;
      if (!a) return;

      group.current.rotation.y = yaw + a.yaw;
      group.current.rotation.z = a.roll;
      group.current.rotation.x = -a.rot;
      group.current.position.set(
        basePosition[0] + a.offsetX * PX_TO_WORLD,
        basePosition[1] - a.offsetY * PX_TO_WORLD,
        basePosition[2] + a.offsetZ * PX_TO_WORLD
      );

      group.current.scale.set(a.scaleX - 0.02, a.scaleY - 0.02, a.scaleX - 0.02);

      // --- procedural bone animation --------------------------------------
      // The group transform above owns world placement / facing / squash-
      // stretch / flash (root motion, still driven by BattleCanvas). The
      // controller owns every bone pose: state machine + curve/spring
      // animation functions + additive layers, rebuilt from rest each frame.
      const dt = delta;
      controller.setFacing(facing ?? "right");

      const intent = animIntent?.current ?? null;
      if (intent) {
        const key = `${intent.state}@${intent.startedAt}`;
        if (key !== lastIntentKey.current) {
          lastIntentKey.current = key;
          controller.play(intent);
        }
      }

      // Planar / vertical speed from the FighterAnim offset deltas (world units/sec).
      const safeDt = dt > 1e-4 ? dt : 1 / 60;
      const wx = a.offsetX * PX_TO_WORLD;
      const wy = -a.offsetY * PX_TO_WORLD;
      const wz = a.offsetZ * PX_TO_WORLD;
      const p = prevOffset.current;
      let velX = 0;
      let velZ = 0;
      let velY = 0;
      if (p.valid) {
        velX = (wx - p.x) / safeDt;
        velY = (wy - p.y) / safeDt;
        velZ = (wz - p.z) / safeDt;
      }
      p.x = wx;
      p.y = wy;
      p.z = wz;
      p.valid = true;
      const speed = Math.hypot(velX, velZ);

      // Head-tracking aim: yaw toward the opponent in the model's local frame.
      let aimYaw = 0;
      const oppo = opponentPos?.current;
      if (oppo) {
        const here = group.current.getWorldPosition(scratchVec.current);
        const worldAngle = Math.atan2(oppo.x - here.x, oppo.z - here.z);
        aimYaw = worldAngle - group.current.rotation.y - a.yaw;
        aimYaw = Math.atan2(Math.sin(aimYaw), Math.cos(aimYaw)); // wrap to [-π,π]
      }

      controller.update({ dt: safeDt, now: state.clock.elapsedTime * 1000, speed, velX, velZ, velY, aimYaw, simulationIntent: intent?.simulationProgress !== undefined ? intent : undefined });

      modelScene.traverse((node) => {
        if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
          node.material.emissive.setScalar(a.flash);
          node.material.emissiveIntensity = a.flash;
        }
      });
      return;
    }

    // Profile/coop views use the same neutral controller as combat, so the
    // corrected GLB never exposes its source T-pose between animation states.
    if (!animate) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.4) * 0.35;
    controller.setFacing("right");
    controller.update({
      dt: delta,
      now: t * 1000,
      speed: 0,
      velX: 0,
      velZ: 0,
      velY: 0,
      aimYaw: 0,
    });
  });

  return (
    <group ref={group} position={basePosition} dispose={null}>
      <primitive object={clonedScene.scene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
