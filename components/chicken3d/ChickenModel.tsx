"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

import { resolveVisualTraits } from "@/lib/physicalProfile";
import { growthVisualScale } from "@/lib/growth";
import { deriveAnimationGains } from "@/lib/animation/physicalGenetics";
import { ProceduralAnimationController } from "@/lib/animation/ProceduralAnimationController";
import type { AnimIntent } from "@/lib/animation/types";
import { AWAKENING_VISUALS } from "@/lib/animation/awakeningVisuals";
import type { AwakeningType } from "@/lib/combat-v2/types";
import type { Chicken, ChickenColorScheme, GrowthStage, PhysicalBlock } from "@/lib/types";

// Both sexes share the single rigged mesh — there is no separate hen
// geometry, so a hen is rendered as the same rig with a sex-specific pose
// override (see applyHenOverride) rather than a different model.
/** Canonical symmetric T-pose rig; all procedural poses are additive to its bind pose. */
const MODEL_PATH = "/3d-chicken/rooster_rigged_rebuilt_skinned_wingfans.glb";

/** Bone scaled by "Giant" when the mutation is expressed. */
const GIANT_SCALE = 1.4;

export type ChickenRenderMode = "combat" | "profile" | "village";

const VILLAGE_ANIMATION_FPS = 12;

const WING_TRAIL_POINTS = 64;

function makeWingTrail(color: number) {
  const positions = new Float32Array(WING_TRAIL_POINTS * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  line.renderOrder = 1000;
  return {
    positions,
    geometry,
    material,
    line,
    samples: Array.from({ length: WING_TRAIL_POINTS }, () => new THREE.Vector3()),
  };
}

class WingTrajectoryRecorder {
  readonly left = makeWingTrail(0x45d8ff);
  readonly right = makeWingTrail(0xffb13b);
  private cursor = 0;
  private count = 0;
  private accumulator = 0;

  record(leftTip: THREE.Object3D, rightTip: THREE.Object3D, dt: number) {
    this.accumulator += dt;
    if (this.accumulator < 1 / 60) return;
    this.accumulator %= 1 / 60;

    leftTip.getWorldPosition(this.left.samples[this.cursor]);
    rightTip.getWorldPosition(this.right.samples[this.cursor]);
    this.cursor = (this.cursor + 1) % WING_TRAIL_POINTS;
    this.count = Math.min(WING_TRAIL_POINTS, this.count + 1);

    for (const trail of [this.left, this.right]) {
      for (let i = 0; i < this.count; i++) {
        const sampleIndex = (this.cursor - this.count + i + WING_TRAIL_POINTS) % WING_TRAIL_POINTS;
        const point = trail.samples[sampleIndex];
        const p = i * 3;
        trail.positions[p] = point.x;
        trail.positions[p + 1] = point.y;
        trail.positions[p + 2] = point.z;
      }
      trail.geometry.setDrawRange(0, this.count);
      (trail.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      trail.geometry.computeBoundingSphere();
    }
  }

  dispose() {
    this.left.geometry.dispose();
    this.left.material.dispose();
    this.right.geometry.dispose();
    this.right.material.dispose();
  }
}

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

/** Materials an awakening's tint/glow overlay is allowed to touch — plumage only, never beak/legs/comb. */
const FEATHER_MATERIAL_NAMES = ["M_Feathers", "M_Hackle", "M_Wing", "M_Tail"] as const;

const MAX_AURA_PARTICLES = 64;
const MAX_AURA_RINGS = 3;

/** Ambient particle aura orbiting/rising off an awakened fighter. Idle (invisible) until `awakening.current` is set, and eases out again once it clears. */
function AwakeningAura({ awakening }: { awakening: RefObject<AwakeningType | null> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const strength = useRef(0);
  // Deterministic per-particle variety (golden-angle spread + coprime moduli
  // for the other fields) instead of Math.random — keeps this a pure render.
  const particles = useMemo(
    () =>
      Array.from({ length: MAX_AURA_PARTICLES }, (_, i) => ({
        angle: i * 2.39996,
        radius: 0.55 + 0.45 * (((i * 7) % MAX_AURA_PARTICLES) / MAX_AURA_PARTICLES),
        speed: 0.72 + 0.55 * (((i * 3) % MAX_AURA_PARTICLES) / MAX_AURA_PARTICLES),
        spin: 0.65 + 0.8 * (((i * 5) % MAX_AURA_PARTICLES) / MAX_AURA_PARTICLES),
        size: 0.022 + 0.026 * (((i * 11) % MAX_AURA_PARTICLES) / MAX_AURA_PARTICLES),
        phase: i / MAX_AURA_PARTICLES,
      })),
    []
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    []
  );
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const _m = useMemo(() => new THREE.Matrix4(), []);
  const _q = useMemo(() => new THREE.Quaternion(), []);
  const _s = useMemo(() => new THREE.Vector3(), []);
  const _p = useMemo(() => new THREE.Vector3(), []);
  const _c = useMemo(() => new THREE.Color(), []);
  const _c2 = useMemo(() => new THREE.Color(), []);
  const _mixed = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const type = awakening.current;
    strength.current += ((type ? 1 : 0) - strength.current) * Math.min(1, delta * 3.5);
    if (strength.current < 0.01) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const visual = type ? AWAKENING_VISUALS[type] : null;
    if (visual) {
      _c.set(visual.particleColor);
      _c2.set(visual.particleColor2);
    }
    const t = state.clock.elapsedTime;
    const pulse = visual ? 0.88 + Math.sin(t * visual.pulseSpeed) * 0.12 : 1;
    for (let i = 0; i < MAX_AURA_PARTICLES; i++) {
      const p = particles[i];
      if (!visual || i >= visual.particleCount) {
        _m.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, _m);
        continue;
      }
      const cycle = (t * p.speed * visual.particleSpeed + p.phase) % 1;
      let angle = p.angle + t * p.spin;
      let height = cycle * visual.auraHeight;
      let radius = p.radius * visual.auraRadius * (1 - cycle * 0.3);
      if (visual.particleMotion === "mirage") {
        angle += Math.sin(t * 5.5 + p.phase * 19) * 0.55;
        radius *= 0.8 + Math.sin(t * 7 + i) * 0.35;
        height = 0.2 + cycle * visual.auraHeight;
      } else if (visual.particleMotion === "flame") {
        radius *= (1 - cycle * 0.72) * pulse;
        height = cycle * visual.auraHeight + Math.sin(t * 9 + i) * 0.05;
      } else if (visual.particleMotion === "embers") {
        radius *= 0.45 + cycle * 1.25;
        angle += Math.sin(i * 4.7) * cycle;
        height = 0.25 + cycle * visual.auraHeight * 0.8;
      } else if (visual.particleMotion === "grounded") {
        radius *= 0.75 + cycle * 0.45;
        height = 0.03 + Math.sin(cycle * Math.PI) * visual.auraHeight * 0.48;
      } else {
        angle += cycle * Math.PI * 2.5;
        radius *= 0.55 + Math.sin(cycle * Math.PI) * 0.5;
      }
      _p.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      const fade = Math.sin(cycle * Math.PI) * strength.current;
      const sz = p.size * visual.particleSize * (0.6 + fade * 0.9);
      const stretch = visual.particleMotion === "flame" || visual.particleMotion === "updraft" ? 2.4 : 1;
      _s.set(sz, sz * stretch, sz);
      _m.compose(_p, _q.identity(), _s);
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, _mixed.copy(_c).lerp(_c2, p.phase).multiplyScalar(fade * pulse));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (lightRef.current) {
      lightRef.current.visible = Boolean(visual);
      lightRef.current.color.copy(_c2);
      lightRef.current.intensity = (visual?.lightIntensity ?? 0) * strength.current * pulse;
    }
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      ring.visible = Boolean(visual && i < visual.ringCount);
      if (!ring.visible || !visual) return;
      const ringPulse = 1 + Math.sin(t * visual.pulseSpeed + i * 1.8) * 0.12;
      ring.scale.setScalar(ringPulse * (0.78 + i * 0.22) * visual.auraRadius / 0.5);
      ring.rotation.z = t * (i % 2 ? -0.8 : 0.65) * visual.particleSpeed;
      ring.position.y = visual.particleMotion === "grounded" ? 0.035 + i * 0.035 : 0.25 + i * 0.3;
      const ringMaterial = ring.material as THREE.MeshBasicMaterial;
      ringMaterial.color.copy(i % 2 ? _c2 : _c);
      ringMaterial.opacity = strength.current * (visual.particleMotion === "grounded" ? 0.48 : 0.26);
    });
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[geometry, material, MAX_AURA_PARTICLES]} frustumCulled={false} />
      <pointLight ref={lightRef} position={[0, 0.72, 0]} intensity={0} distance={2.8} decay={2} />
      {Array.from({ length: MAX_AURA_RINGS }, (_, i) => (
        <mesh key={`aura-ring-${i}`} ref={(node) => { ringRefs.current[i] = node; }} rotation-x={-Math.PI / 2} visible={false}>
          <torusGeometry args={[0.5, 0.012 + i * 0.004, 8, 42]} />
          <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

type DodgeAfterimage = {
  root: THREE.Group;
  material: THREE.MeshBasicMaterial;
  posePairs: { source: THREE.Object3D; ghost: THREE.Object3D }[];
  baseScale: THREE.Vector3;
  age: number;
  duration: number;
  maxOpacity: number;
  active: boolean;
};

function disposeAfterimage(afterimage: DodgeAfterimage) {
  afterimage.root.removeFromParent();
  afterimage.material.dispose();
}

/** Builds one reusable ghost once per model. Dodge events only copy bone
 * transforms into it; they never clone a rig, geometry, or materials in the
 * render loop. Keeping a single explicit silhouette also bounds skinning and
 * draw-call cost while preserving the readable "old position" illusion. */
function createDodgeAfterimage(sourceScene: THREE.Object3D): DodgeAfterimage {
  const ghostScene = SkeletonUtils.clone(sourceScene);
  const material = new THREE.MeshBasicMaterial({
    color: "#d9fbff",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const sourcePoseNodes: THREE.Object3D[] = [];
  const ghostPoseNodes: THREE.Object3D[] = [];
  sourceScene.traverse((node) => { if (node instanceof THREE.Bone) sourcePoseNodes.push(node); });
  ghostScene.traverse((node) => {
    if (node instanceof THREE.Bone) ghostPoseNodes.push(node);
    if (node instanceof THREE.Mesh) {
      node.material = material;
      node.frustumCulled = false;
      node.renderOrder = 980;
    }
  });
  const root = new THREE.Group();
  root.visible = false;
  root.add(ghostScene);
  return {
    root,
    material,
    posePairs: sourcePoseNodes.map((source, index) => ({ source, ghost: ghostPoseNodes[index] })).filter(pair => pair.ghost),
    baseScale: new THREE.Vector3(1, 1, 1),
    age: 0,
    duration: 0.42,
    maxOpacity: 0.68,
    active: false,
  };
}

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
 * Juvenile sexual characteristics develop independently from overall body
 * size. Roosters start with a small comb, reveal the hackle at young adult,
 * and reach their final plumage/comb proportions at adult.
 */
function applyGrowthStageOverride(bones: Record<string, THREE.Object3D>, stage: GrowthStage) {
  const maturity: Record<GrowthStage, { comb: number; hackle: number }> = {
    chick: { comb: 0.22, hackle: 0 },
    juvenile: { comb: 0.42, hackle: 0 },
    young_adult: { comb: 0.7, hackle: 0.7 },
    adult: { comb: 1, hackle: 1 },
    prime: { comb: 1, hackle: 1 },
    senior: { comb: 1, hackle: 1 },
    retired: { comb: 1, hackle: 1 },
  };
  const visual = maturity[stage];
  bones["Comb"]?.scale.multiplyScalar(visual.comb);
  bones["Wattle"]?.scale.multiplyScalar(visual.comb);
  bones["Hackle"]?.scale.multiplyScalar(visual.hackle);
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
  growthStage = "adult",
  physical,
  mutations,
  animate = true,
  renderMode = "profile",
  combatAnim,
  animIntent,
  opponentPos,
  facing,
  basePosition = [0, 0, 0],
  debugWingTrajectory,
  awakening,
}: {
  colorScheme: Chicken["colorScheme"];
  sex: Chicken["sex"];
  growthStage?: Chicken["growthStage"];
  physical?: Chicken["physical"];
  mutations?: Chicken["mutations"];
  animate?: boolean;
  /** Rendering context. Village mode disables expensive dynamic shadows and throttles idle rig updates. */
  renderMode?: ChickenRenderMode;
  /** When provided, the model is driven by this ref every frame instead of the idle showcase spin. */
  combatAnim?: RefObject<FighterAnim | null>;
  /** Procedural-animation intent (state to play), written by BattleCanvas per turn / at impact. */
  animIntent?: RefObject<AnimIntent | null>;
  /** Opponent world position, for the head-tracking additive layer. */
  opponentPos?: RefObject<THREE.Vector3 | null>;
  /** Which way the fighter should face when `combatAnim` drives it (head points toward the opponent). */
  facing?: "left" | "right";
  basePosition?: [number, number, number];
  /** Draw ~1 second of each wing tip's world-space path. Also enabled by ?debugWingTrail. */
  debugWingTrajectory?: boolean;
  /** Current awakening type (or null/undefined), read every frame to drive the plumage tint + particle aura. */
  awakening?: RefObject<AwakeningType | null>;
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const group = useRef<THREE.Group>(null);
  const villageAnimAccumulator = useRef(0);
  const isVillage = renderMode === "village";

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
      node.castShadow = !isVillage;
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
    applyGrowthStageOverride(bones, growthStage);
    if (sex === "hen") applyHenOverride(bones, physical ?? DEFAULT_PHYSICAL_BLOCK);
    applyVisualTraits(bones, mats, mutations ? resolveVisualTraits({ mutations }) : []);
    applyRuntimeNeutralPose(bones);

    // Snapshot the genetic feather colors before any awakening overlay runs,
    // so the tint can ease back to the bird's real plumage once it fades.
    const featherBaseline: Record<string, THREE.Color> = {};
    for (const name of FEATHER_MATERIAL_NAMES) {
      const first = mats[name]?.[0];
      if (first) featherBaseline[name] = first.color.clone();
    }

    return { scene: clone, bones, mats, featherBaseline };
  }, [scene, colorScheme, physical, mutations, sex, growthStage, isVillage]);

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
  const showWingTrajectory = debugWingTrajectory ?? (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debugWingTrail")
  );
  const wingTrails = useMemo(() => new WingTrajectoryRecorder(), []);
  const auraStrength = useRef(0);
  const auraScratchColor = useRef(new THREE.Color());
  const auraScratchGlow = useRef(new THREE.Color());
  const afterimage = useMemo(() => createDodgeAfterimage(clonedScene.scene), [clonedScene]);
  const afterimageRef = useRef<DodgeAfterimage | null>(null);
  const lastAfterimageKey = useRef<number | null>(null);

  useEffect(() => {
    afterimageRef.current = afterimage;
    return () => {
      afterimageRef.current = null;
      disposeAfterimage(afterimage);
    };
  }, [afterimage]);
  useEffect(() => () => wingTrails.dispose(), [wingTrails]);

  const recordWingTrails = (dt: number) => {
    if (!showWingTrajectory) return;
    const leftTip = clonedScene.bones.WingL_Tip;
    const rightTip = clonedScene.bones.WingR_Tip;
    if (!leftTip || !rightTip) return;
    wingTrails.record(leftTip, rightTip, dt);
  };

  const spawnDodgeAfterimage = (velocityX: number, velocityZ: number) => {
    const ghost = afterimageRef.current;
    if (!group.current || !ghost) return;
    // Copy the exact current pose into the prebuilt independent skeleton. The
    // ghost lives outside the moving fighter group and therefore stays behind.
    clonedScene.scene.updateMatrixWorld(true);
    const velocityLength = Math.hypot(velocityX, velocityZ);
    const trailX = velocityLength > 0.01 ? velocityX / velocityLength : 0;
    const trailZ = velocityLength > 0.01 ? velocityZ / velocityLength : (facing === "right" ? -1 : 1);
    ghost.posePairs.forEach(({ source, ghost: poseNode }) => {
      poseNode.position.copy(source.position);
      poseNode.quaternion.copy(source.quaternion);
      poseNode.scale.copy(source.scale);
    });
    ghost.root.position.copy(group.current.position);
    ghost.root.position.x -= trailX * 0.035;
    ghost.root.position.z -= trailZ * 0.035;
    ghost.root.quaternion.copy(group.current.quaternion);
    ghost.root.scale.copy(group.current.scale).multiplyScalar(growthVisualScale(growthStage));
    ghost.baseScale.copy(ghost.root.scale);
    ghost.age = 0;
    ghost.material.opacity = ghost.maxOpacity;
    ghost.active = true;
    ghost.root.visible = true;
  };

  const updateDodgeAfterimages = (dt: number) => {
    const ghost = afterimageRef.current;
    if (!ghost?.active) return;
    ghost.age += dt;
    const progress = Math.max(0, Math.min(1, ghost.age / ghost.duration));
    ghost.material.opacity = ghost.maxOpacity * (1 - progress) * (1 - progress * 0.75);
    // A slight directional smear sells speed while the pose remains frozen.
    ghost.root.scale.set(
      ghost.baseScale.x * (1 + progress * 0.12),
      ghost.baseScale.y * (1 - progress * 0.04),
      ghost.baseScale.z * (1 + progress * 0.12)
    );
    if (progress < 1) return;
    ghost.active = false;
    ghost.root.visible = false;
  };

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
      recordWingTrails(safeDt);

      const awakeningType = awakening?.current ?? null;
      const afterimageKey = awakeningType === "flow-state" ? intent?.afterimageKey : undefined;
      if (afterimageKey !== undefined && afterimageKey !== lastAfterimageKey.current) {
        lastAfterimageKey.current = afterimageKey;
        spawnDodgeAfterimage(velX, velZ);
      }
      updateDodgeAfterimages(safeDt);
      const visual = awakeningType ? AWAKENING_VISUALS[awakeningType] : null;
      auraStrength.current += ((visual ? 1 : 0) - auraStrength.current) * Math.min(1, safeDt * 4);
      const strength = auraStrength.current;
      if (visual) {
        auraScratchColor.current.set(visual.tint);
        auraScratchGlow.current.set(visual.glow);
      }

      modelScene.traverse((node) => {
        if (!(node instanceof THREE.Mesh) || !(node.material instanceof THREE.MeshStandardMaterial)) return;
        const material = node.material;
        const baseline = clonedScene.featherBaseline[material.name];
        if (baseline && strength > 0.001) {
          material.color.copy(baseline).lerp(auraScratchColor.current, strength);
          material.emissive.copy(auraScratchGlow.current).multiplyScalar(strength);
          material.emissiveIntensity = Math.max(a.flash, (visual?.glowIntensity ?? 0) * strength);
        } else {
          if (baseline) material.color.copy(baseline);
          material.emissive.setScalar(a.flash);
          material.emissiveIntensity = a.flash;
        }
      });
      return;
    }

    // Profile/village views use the same neutral controller as combat, so the
    // corrected GLB never exposes its source T-pose between animation states.
    if (!animate) return;
    const t = state.clock.elapsedTime;

    // Village mode is viewed from much farther away and may contain many birds.
    // Keep rendering normally, but only recompute the expensive procedural bone
    // pose at a low fixed rate. CoopChicken owns world yaw, so do not run the
    // showcase spin in this mode.
    if (isVillage) {
      villageAnimAccumulator.current += delta;
      const interval = 1 / VILLAGE_ANIMATION_FPS;

      if (villageAnimAccumulator.current < interval) return;

      const elapsed = Math.min(villageAnimAccumulator.current, 0.15);
      villageAnimAccumulator.current = 0;

      controller.setFacing("right");
      controller.update({
        dt: elapsed,
        now: t * 1000,
        speed: 0,
        velX: 0,
        velZ: 0,
        velY: 0,
        aimYaw: 0,
      });
      return;
    }

    // Profile/showcase mode keeps the original full-rate animation and slow spin.
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
    recordWingTrails(delta);
  });

  return (
    <>
      <group ref={group} position={basePosition} dispose={null}>
        <group scale={growthVisualScale(growthStage)}>
          <primitive object={clonedScene.scene} />
        </group>
        {awakening && <AwakeningAura awakening={awakening} />}
      </group>
      {showWingTrajectory && <primitive object={wingTrails.left.line} />}
      {showWingTrajectory && <primitive object={wingTrails.right.line} />}
      <primitive object={afterimage.root} />
    </>
  );
}

useGLTF.preload(MODEL_PATH);
