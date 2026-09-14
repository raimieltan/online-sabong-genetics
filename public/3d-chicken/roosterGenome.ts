/**
 * Rooster Arena — genome runtime.
 * Pairs with rooster_rigged_rebuilt_skinned_wingfans.glb (23 joints, 7 materials).
 *
 *   const gltf = await new GLTFLoader().loadAsync('/3d-chicken/rooster_rigged_rebuilt_skinned_wingfans.glb')
 *   const rig  = bindRig(gltf.scene)
 *   applyGenome(rig, genome)
 */
import * as THREE from 'three';

/* ---------------- genome ---------------- */

export const TRAIT_RANGE = {
  scale:      [0.70, 1.40], bodyGirth:  [0.70, 1.60], bodyLength: [0.75, 1.45],
  chest:      [0.75, 1.50], neckLength: [0.60, 2.00], neckThick:  [0.60, 1.70],
  headSize:   [0.65, 1.70], combSize:   [0.20, 2.60], wattleSize: [0.20, 2.20],
  beakLength: [0.70, 1.90], wingSpan:   [0.70, 2.00], wingSize:   [0.70, 1.60],
  legLength:  [0.55, 1.90], legThick:   [0.60, 1.80], footSize:   [0.70, 1.60],
  tailLength: [0.50, 1.80], tailSpread: [0.60, 1.80], tailArc:    [0.60, 1.80],
} as const;

export type TraitKey = keyof typeof TRAIT_RANGE;

export const MUTATIONS = {
  twoHeaded:  { label: 'Polycephaly', rarity: 0.02, nodes: ['Mut_SecondHead'] },
  extraWings: { label: 'Quad-wing',   rarity: 0.03, nodes: ['Mut_ExtraWing_L', 'Mut_ExtraWing_R'] },
  ironSpurs:  { label: 'Iron spurs',  rarity: 0.12, nodes: ['Mut_Spur_L', 'Mut_Spur_R'] },
} as const;

export type MutationKey = keyof typeof MUTATIONS;

export const MATERIALS = ['M_Feathers', 'M_Hackle', 'M_Wing', 'M_Tail', 'M_Comb', 'M_Beak', 'M_Legs'] as const;
export type MaterialKey = typeof MATERIALS[number];

export interface Genome {
  traits: Record<TraitKey, number>;
  mutations: Record<MutationKey, boolean>;
  colors: Record<MaterialKey, string>;
}

const DEFAULT_COLORS: Record<MaterialKey, string> = {
  M_Feathers: '#6b2111', M_Hackle: '#c75c0f', M_Wing: '#4c1708',
  M_Tail: '#0d1714', M_Comb: '#b8100f', M_Beak: '#d9a83a', M_Legs: '#cc9e33',
};

export const defaultGenome = (): Genome => ({
  traits: Object.fromEntries(Object.keys(TRAIT_RANGE).map(k => [k, 1])) as Record<TraitKey, number>,
  mutations: { twoHeaded: false, extraWings: false, ironSpurs: false },
  colors: { ...DEFAULT_COLORS },
});

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const gauss = () => {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export function randomGenome(spread = 0.22): Genome {
  const g = defaultGenome();
  for (const k of Object.keys(TRAIT_RANGE) as TraitKey[]) {
    const [lo, hi] = TRAIT_RANGE[k];
    g.traits[k] = clamp((lo + hi) / 2 + gauss() * (hi - lo) * spread, lo, hi);
  }
  for (const k of Object.keys(MUTATIONS) as MutationKey[]) {
    g.mutations[k] = Math.random() < MUTATIONS[k].rarity * 4;
  }
  return g;
}

/** Blend both parents per trait, add drift. Mutations are dominant-ish + rare de-novo. */
export function breed(a: Genome, b: Genome, drift = 0.09): Genome {
  const g = defaultGenome();
  for (const k of Object.keys(TRAIT_RANGE) as TraitKey[]) {
    const [lo, hi] = TRAIT_RANGE[k];
    const mix = Math.random() * 0.5 + 0.25;
    g.traits[k] = clamp(a.traits[k] * mix + b.traits[k] * (1 - mix) + gauss() * (hi - lo) * drift, lo, hi);
  }
  for (const k of Object.keys(MUTATIONS) as MutationKey[]) {
    const inherited = (a.mutations[k] || b.mutations[k]) && Math.random() < 0.6;
    g.mutations[k] = inherited || Math.random() < MUTATIONS[k].rarity;
  }
  for (const m of MATERIALS) {
    const c = new THREE.Color(a.colors[m]).lerp(new THREE.Color(b.colors[m]), Math.random());
    c.offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.06);
    g.colors[m] = '#' + c.getHexString();
  }
  return g;
}

/** Derived battle stats. Tune the coefficients against your existing balance pass. */
export function deriveStats(g: Genome) {
  const t = g.traits;
  return {
    damage:    Math.round(28 * (t.legThick * 0.5 + t.footSize * 0.3 + t.chest * 0.4) * (g.mutations.ironSpurs ? 1.25 : 1)),
    speed:     Math.round(34 * (1.6 - t.bodyGirth * 0.35) * (t.legLength * 0.55 + 0.5)),
    stamina:   Math.round(30 * (t.chest * 0.7 + t.bodyGirth * 0.4)),
    defense:   Math.round(26 * (t.bodyGirth * 0.6 + t.wingSpan * 0.35 + t.neckThick * 0.25)),
    aggression:Math.round(24 * (t.combSize * 0.45 + t.wattleSize * 0.25 + t.headSize * 0.5) * (g.mutations.twoHeaded ? 1.4 : 1)),
    luck:      Math.round(18 * (0.6 + (g.mutations.twoHeaded ? 0.9 : 0) + (g.mutations.extraWings ? 0.6 : 0))),
  };
}

/* ---------------- rig binding ---------------- */

export interface Rig {
  root: THREE.Object3D;
  bones: Record<string, THREE.Bone>;
  mutations: Record<string, THREE.Object3D>;
  materials: Record<string, THREE.MeshStandardMaterial>;
  parentOf: Record<string, string | null>;
}

/** Call once per loaded GLTF scene. Clone the scene per rooster instance (SkeletonUtils.clone). */
export function bindRig(scene: THREE.Object3D): Rig {
  const bones: Record<string, THREE.Bone> = {};
  const mutations: Record<string, THREE.Object3D> = {};
  const materials: Record<string, THREE.MeshStandardMaterial> = {};
  const parentOf: Record<string, string | null> = {};

  scene.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      const b = o as THREE.Bone;
      bones[b.name] = b;
      parentOf[b.name] = b.parent && (b.parent as THREE.Bone).isBone ? b.parent.name : null;
    }
    if (o.name.startsWith('Mut_')) mutations[o.name] = o;
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && m.name) materials[m.name] = m;
  });

  return { root: scene, bones, mutations, materials, parentOf };
}

/** Genome traits -> per-bone WORLD scale. */
function worldScales(t: Record<TraitKey, number>): Record<string, [number, number, number]> {
  const S: Record<string, [number, number, number]> = {
    Root:  [t.scale, t.scale, t.scale],
    Hips:  [t.bodyGirth, t.bodyGirth * 0.85 + 0.15, t.bodyLength],
    Spine: [t.bodyGirth, t.bodyGirth * 0.85 + 0.15, t.bodyLength],
    Chest: [t.chest, t.chest, t.chest],
    Neck:  [t.neckThick, t.neckLength, t.neckThick],
    Head:  [t.headSize, t.headSize, t.headSize],
    Comb:  [t.combSize * 0.6 + 0.4, t.combSize, t.combSize * 0.6 + 0.4],
    Wattle:[t.wattleSize, t.wattleSize, t.wattleSize],
    Beak:  [1, 1, t.beakLength],
    Tail:     [t.tailSpread, t.tailArc, t.tailLength],
    Tail_Tip: [t.tailSpread, t.tailArc, t.tailLength],
  };
  for (const s of ['L', 'R']) {
    S[`Wing${s}`]     = [t.wingSpan, t.wingSize, t.wingSize];
    S[`Wing${s}_Mid`] = [t.wingSpan, t.wingSize, t.wingSize];
    S[`Wing${s}_Tip`] = [t.wingSpan, t.wingSize, t.wingSize];
    S[`Thigh${s}`]    = [t.legThick, t.legLength, t.legThick];
    S[`Shank${s}`]    = [t.legThick, t.legLength, t.legThick];
    S[`Foot${s}`]     = [t.footSize, t.footSize, t.footSize];
  }
  return S;
}

/**
 * Push a genome onto a bound rig. Cheap enough to call every frame if you want
 * to animate growth/training, but once on spawn is normally enough.
 *
 * Local scale = worldScale / parentWorldScale, so each part is independent —
 * fattening the body does not inflate the head.
 */
export function applyGenome(rig: Rig, g: Genome) {
  const W = worldScales(g.traits);
  for (const name in rig.bones) {
    const w = W[name] ?? [1, 1, 1];
    const p = rig.parentOf[name];
    const pw = (p && W[p]) || [1, 1, 1];
    rig.bones[name].scale.set(w[0] / pw[0], w[1] / pw[1], w[2] / pw[2]);
  }
  for (const k of Object.keys(MUTATIONS) as MutationKey[]) {
    for (const n of MUTATIONS[k].nodes) rig.mutations[n]?.scale.setScalar(g.mutations[k] ? 1 : 0);
  }
  for (const m of MATERIALS) rig.materials[m]?.color.set(g.colors[m]);
}
