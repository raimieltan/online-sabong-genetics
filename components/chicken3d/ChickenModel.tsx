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

const MODEL_PATHS: Record<Chicken["sex"], string> = {
  rooster: "/3d-chicken/chicken_rooster.glb",
  hen: "/3d-chicken/chicken_hen.glb",
};

/** Bone scaled by "Giant" when the mutation is expressed. */
const GIANT_SCALE = 1.4;

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
 * Body size drives the Chest bone directly. Neck and WingL/WingR are children
 * of Chest, so they'd inherit that scale (inflating their OWN geometry along
 * with the torso) unless compensated — dividing by body cancels that out, so
 * they just reposition further from a bigger/smaller body instead of
 * stretching with it. Ported from chicken_viewer.html's applyProportions.
 */
function applyProportions(bones: Record<string, THREE.Object3D>, physical: PhysicalBlock) {
  const { body, neck, legs, tail, wings } = physical;
  bones["Chest"]?.scale.set(body, body, body);
  const inv = 1 / body;
  bones["Neck"]?.scale.set(inv, inv * neck, inv);
  bones["WingL"]?.scale.set(inv * wings, inv * wings, inv * wings);
  bones["WingR"]?.scale.set(inv * wings, inv * wings, inv * wings);
  // Legs: scale only the thigh bone. Shank/foot are its children and stay at
  // scale 1, so they simply reposition further down with a longer thigh.
  bones["ThighL"]?.scale.set(1, legs, 1);
  bones["ThighR"]?.scale.set(1, legs, 1);
  // Tail has no child bones, so it's safe to scale on its own.
  bones["Tail"]?.scale.set(1, tail, 1);
}

/** Genome → expressed mutation tags drives the mutation-slot bone nodes and material overrides. */
function applyVisualTraits(
  bones: Record<string, THREE.Object3D>,
  mats: Record<string, THREE.MeshStandardMaterial>,
  visualTraits: string[]
) {
  const has = (tag: string) => visualTraits.includes(tag);

  if (has("ALBINO")) {
    mats["M_Feathers"]?.color.set("#f5f2ea");
    mats["M_Eyes"]?.color.set("#d94b3a");
  }

  const feathers = mats["M_Feathers"];
  if (feathers) {
    feathers.emissive = new THREE.Color(has("LUMINESCENT") ? 0x4fffb0 : 0x000000);
    feathers.emissiveIntensity = has("LUMINESCENT") ? 0.55 : 0;
  }

  const twoHeadedScale = has("TWO_HEADED") ? 1 : 0;
  bones["Mut_TwoHeaded"]?.scale.set(twoHeadedScale, twoHeadedScale, twoHeadedScale);
  const extraToeScale = has("EXTRA_TOED") ? 1 : 0;
  bones["Mut_ExtraToe_L"]?.scale.set(extraToeScale, extraToeScale, extraToeScale);
  bones["Mut_ExtraToe_R"]?.scale.set(extraToeScale, extraToeScale, extraToeScale);

  const giantScale = has("GIANT") ? GIANT_SCALE : 1;
  bones["ChickenRoot"]?.scale.set(giantScale, giantScale, giantScale);
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
  const { scene } = useGLTF(MODEL_PATHS[sex]);
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
    const mats: Record<string, THREE.MeshStandardMaterial> = {};
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
        mats[material.name] = material;
      }
    });

    mats["M_Feathers"]?.color.set(colorScheme.feathers);
    mats["M_Details"]?.color.set(colorScheme.details);
    mats["M_Eyes"]?.color.set(colorScheme.eyes);
    mats["M_Tail"]?.color.set(colorScheme.tail);
    if (mats["M_Feathers"]) {
      installPatternShader(mats["M_Feathers"]);
      setPattern(mats["M_Feathers"], colorScheme.pattern, colorScheme.patternColor);
    }

    applyProportions(bones, physical ?? { body: 1, neck: 1, legs: 1, tail: 1, wings: 1 });
    applyVisualTraits(bones, mats, mutations ? resolveVisualTraits({ mutations }) : []);

    return { scene: clone, bones };
  }, [scene, colorScheme, physical, mutations]);

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

      group.current.scale.set(a.scaleX, a.scaleY, a.scaleX);

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

      controller.update({ dt: safeDt, now: state.clock.elapsedTime * 1000, speed, velX, velZ, velY, aimYaw });

      modelScene.traverse((node) => {
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

    const neck = modelScene.getObjectByName("Neck");
    if (neck) neck.rotation.x = Math.sin(t * 1.6) * 0.06;

    const tail = modelScene.getObjectByName("Tail");
    if (tail) tail.rotation.x = Math.sin(t * 1.2) * 0.05;

    const wingR = modelScene.getObjectByName("WingR");
    const wingL = modelScene.getObjectByName("WingL");
    if (wingR) wingR.rotation.z = Math.sin(t * 5) * 0.15;
    if (wingL) wingL.rotation.z = -Math.sin(t * 5) * 0.15;

    const head = modelScene.getObjectByName("Head");
    if (head) head.rotation.x = Math.sin(t * 2) * 0.15;
  });

  return (
    <group ref={group} position={basePosition} dispose={null}>
      <primitive object={clonedScene.scene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATHS.rooster);
useGLTF.preload(MODEL_PATHS.hen);
