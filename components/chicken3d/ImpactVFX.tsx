"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import { IMPACT_VFX, type ImpactVfxKind } from "@/lib/animation/impactVfx";

/**
 * Pooled procedural impact VFX (spec §19). Instanced meshes cover impact
 * shards, blood droplets, and persistent ground stains; a small mesh pool
 * handles flash pops. Everything is preallocated and capped, so a long fight
 * cannot grow the scene graph or retain an unbounded particle history.
 *
 * Not authoritative for anything — it just draws where `spawn()` is told the
 * contact happened (a presentation collider / bone world position).
 */

const SHARD_POOL = 160;
const FLASH_POOL = 6;
const BLOOD_DROP_POOL = 48;
const BLOOD_STAIN_POOL = 40;

export interface ImpactVFXHandle {
  /** Spawn a burst of `kind` at `pos`. `normal` biases the spray direction (optional). */
  spawn: (kind: ImpactVfxKind, pos: THREE.Vector3, normal?: THREE.Vector3) => void;
  /** Spray a small pooled blood burst whose droplets leave capped, fight-long ground stains. */
  spawnBlood: (pos: THREE.Vector3, normal?: THREE.Vector3, intensity?: number) => void;
  /** Drop every live particle immediately (battle reset / unmount). */
  clear: () => void;
}

interface Shard {
  active: boolean;
  age: number;
  life: number;
  gravity: number;
  size: number;
}

interface Flash {
  active: boolean;
  age: number;
  life: number;
  radius: number;
}

interface BloodDrop {
  active: boolean;
  size: number;
}

export const ImpactVFX = forwardRef<
  ImpactVFXHandle,
  {
    /** Optional 0..1 time scale (BattleCanvas sets 0 during hit-stop so VFX freeze too). */
    timeScaleRef?: RefObject<number>;
    /** Arena floor height, used to turn falling blood droplets into stains. */
    floorY: number;
  }
>(function ImpactVFX({ timeScaleRef, floorY }, ref) {
  const shardMesh = useRef<THREE.InstancedMesh>(null);
  const bloodDropMesh = useRef<THREE.InstancedMesh>(null);
  const bloodStainMesh = useRef<THREE.InstancedMesh>(null);
  const flashRefs = useRef<(THREE.Mesh | null)[]>([]);

  // --- pooled state (plain arrays, never reallocated) ----------------------
  const shards = useMemo<Shard[]>(
    () => Array.from({ length: SHARD_POOL }, () => ({ active: false, age: 0, life: 0, gravity: 0, size: 0 })),
    []
  );
  const shardPos = useMemo(() => new Float32Array(SHARD_POOL * 3), []);
  const shardVel = useMemo(() => new Float32Array(SHARD_POOL * 3), []);
  const shardColor = useMemo(() => new Float32Array(SHARD_POOL * 3), []);
  const flashes = useMemo<Flash[]>(
    () => Array.from({ length: FLASH_POOL }, () => ({ active: false, age: 0, life: 0, radius: 0 })),
    []
  );
  const flashPos = useMemo(() => new Float32Array(FLASH_POOL * 3), []);
  const flashColorArr = useMemo(() => new Float32Array(FLASH_POOL * 3), []);
  const bloodDrops = useMemo<BloodDrop[]>(
    () => Array.from({ length: BLOOD_DROP_POOL }, () => ({ active: false, size: 0 })),
    []
  );
  const bloodDropPos = useMemo(() => new Float32Array(BLOOD_DROP_POOL * 3), []);
  const bloodDropVel = useMemo(() => new Float32Array(BLOOD_DROP_POOL * 3), []);

  const nextShard = useRef(0);
  const nextFlash = useRef(0);
  const nextBloodDrop = useRef(0);
  const nextBloodStain = useRef(0);
  const bloodPoolsInitialized = useRef(false);

  // scratch
  const _m = useMemo(() => new THREE.Matrix4(), []);
  const _q = useMemo(() => new THREE.Quaternion(), []);
  const _groundQ = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
    []
  );
  const _s = useMemo(() => new THREE.Vector3(), []);
  const _p = useMemo(() => new THREE.Vector3(), []);
  const _c = useMemo(() => new THREE.Color(), []);
  const _c2 = useMemo(() => new THREE.Color(), []);

  const quadGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const shardMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    []
  );
  const bloodDropGeo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const bloodDropMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#8f1119" }),
    []
  );
  const bloodStainGeo = useMemo(() => new THREE.CircleGeometry(1, 8), []);
  const bloodStainMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#56070b",
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    []
  );

  const hideInstance = useCallback((mesh: THREE.InstancedMesh, index: number) => {
    _m.compose(_p.set(0, -9999, 0), _q.identity(), _s.setScalar(0));
    mesh.setMatrixAt(index, _m);
  }, [_m, _p, _q, _s]);

  const leaveBloodStain = useCallback((x: number, z: number, size: number) => {
    const mesh = bloodStainMesh.current;
    if (!mesh) return;
    const idx = nextBloodStain.current;
    nextBloodStain.current = (idx + 1) % BLOOD_STAIN_POOL;
    const width = size * (1.5 + Math.random() * 1.4);
    const depth = size * (0.7 + Math.random() * 0.8);
    _m.compose(
      _p.set(x, floorY + 0.035 + Math.random() * 0.004, z),
      _groundQ,
      _s.set(width, depth, 1)
    );
    mesh.setMatrixAt(idx, _m);
    mesh.instanceMatrix.needsUpdate = true;
  }, [floorY, _groundQ, _m, _p, _s]);

  useImperativeHandle(
    ref,
    () => ({
      spawn(kind, pos, normal) {
        const def = IMPACT_VFX[kind];
        _c.set(def.color);
        _c2.set(def.color2);
        const nx = normal?.x ?? 0;
        const ny = normal?.y ?? 1;
        const nz = normal?.z ?? 0;
        const nlen = Math.hypot(nx, ny, nz) || 1;
        const bx = nx / nlen;
        const by = ny / nlen;
        const bz = nz / nlen;

        for (let i = 0; i < def.count; i++) {
          const idx = nextShard.current;
          nextShard.current = (nextShard.current + 1) % SHARD_POOL;
          const s = shards[idx];
          s.active = true;
          s.age = 0;
          s.life = def.life * (0.7 + Math.random() * 0.6);
          s.gravity = def.gravity;
          s.size = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);

          // random direction, optionally biased into a cone around the normal
          let dx = Math.random() * 2 - 1;
          let dy = Math.random() * 2 - 1;
          let dz = Math.random() * 2 - 1;
          const dl = Math.hypot(dx, dy, dz) || 1;
          dx /= dl;
          dy /= dl;
          dz /= dl;
          if (def.cone > 0) {
            const blend = 1 - def.cone / Math.PI; // cone→0 => fully along normal
            dx = dx * (1 - blend) + bx * blend;
            dy = dy * (1 - blend) + by * blend;
            dz = dz * (1 - blend) + bz * blend;
            const rl = Math.hypot(dx, dy, dz) || 1;
            dx /= rl;
            dy /= rl;
            dz /= rl;
          }
          const spd = def.speedMin + Math.random() * (def.speedMax - def.speedMin);
          shardPos[idx * 3] = pos.x;
          shardPos[idx * 3 + 1] = pos.y;
          shardPos[idx * 3 + 2] = pos.z;
          shardVel[idx * 3] = dx * spd;
          shardVel[idx * 3 + 1] = dy * spd + spd * 0.25;
          shardVel[idx * 3 + 2] = dz * spd;
          const mix = Math.random();
          shardColor[idx * 3] = _c.r * (1 - mix) + _c2.r * mix;
          shardColor[idx * 3 + 1] = _c.g * (1 - mix) + _c2.g * mix;
          shardColor[idx * 3 + 2] = _c.b * (1 - mix) + _c2.b * mix;
        }

        if (def.flashRadius > 0) {
          const fi = nextFlash.current;
          nextFlash.current = (nextFlash.current + 1) % FLASH_POOL;
          const fl = flashes[fi];
          fl.active = true;
          fl.age = 0;
          fl.life = def.flashLife;
          fl.radius = def.flashRadius;
          flashPos[fi * 3] = pos.x;
          flashPos[fi * 3 + 1] = pos.y;
          flashPos[fi * 3 + 2] = pos.z;
          _c.set(def.flashColor);
          flashColorArr[fi * 3] = _c.r;
          flashColorArr[fi * 3 + 1] = _c.g;
          flashColorArr[fi * 3 + 2] = _c.b;
        }
      },
      spawnBlood(pos, normal, intensity = 1) {
        const amount = Math.max(3, Math.min(12, Math.round(5 * intensity)));
        const nx = normal?.x ?? 0;
        const nz = normal?.z ?? 0;
        const nlen = Math.hypot(nx, nz) || 1;
        const bx = nx / nlen;
        const bz = nz / nlen;

        for (let i = 0; i < amount; i++) {
          const idx = nextBloodDrop.current;
          nextBloodDrop.current = (idx + 1) % BLOOD_DROP_POOL;
          const drop = bloodDrops[idx];
          const spread = (Math.random() - 0.5) * 1.8;
          const speed = (0.85 + Math.random() * 1.5) * Math.min(intensity, 1.8);
          drop.active = true;
          drop.size = 0.025 + Math.random() * 0.035;
          bloodDropPos[idx * 3] = pos.x;
          bloodDropPos[idx * 3 + 1] = Math.max(pos.y, floorY + 0.24);
          bloodDropPos[idx * 3 + 2] = pos.z;
          bloodDropVel[idx * 3] = bx * speed + -bz * spread;
          bloodDropVel[idx * 3 + 1] = 0.65 + Math.random() * 1.35;
          bloodDropVel[idx * 3 + 2] = bz * speed + bx * spread;
        }
      },
      clear() {
        for (const s of shards) s.active = false;
        for (const f of flashes) f.active = false;
        for (const drop of bloodDrops) drop.active = false;
        const dropMesh = bloodDropMesh.current;
        const stainMesh = bloodStainMesh.current;
        if (dropMesh) {
          for (let i = 0; i < BLOOD_DROP_POOL; i++) hideInstance(dropMesh, i);
          dropMesh.instanceMatrix.needsUpdate = true;
        }
        if (stainMesh) {
          for (let i = 0; i < BLOOD_STAIN_POOL; i++) hideInstance(stainMesh, i);
          stainMesh.instanceMatrix.needsUpdate = true;
        }
        nextBloodStain.current = 0;
      },
    }),
    [shards, flashes, bloodDrops, shardPos, shardVel, shardColor, flashPos, flashColorArr, bloodDropPos, bloodDropVel, floorY, hideInstance, _c, _c2]
  );

  useFrame((_state, rawDelta) => {
    const scale = timeScaleRef?.current ?? 1;
    const dt = Math.min(rawDelta, 1 / 30) * scale;

    // InstancedMesh slots begin as identity transforms. Hide the static stain
    // pool once before any impacts so unused slots never render at the origin.
    if (!bloodPoolsInitialized.current && bloodStainMesh.current) {
      for (let i = 0; i < BLOOD_STAIN_POOL; i++) hideInstance(bloodStainMesh.current, i);
      bloodStainMesh.current.instanceMatrix.needsUpdate = true;
      bloodPoolsInitialized.current = true;
    }

    // --- shards --------------------------------------------------------------
    const mesh = shardMesh.current;
    if (mesh) {
      for (let i = 0; i < SHARD_POOL; i++) {
        const s = shards[i];
        if (!s.active) {
          _s.setScalar(0);
          _m.compose(_p.set(0, -9999, 0), _q.identity(), _s);
          mesh.setMatrixAt(i, _m);
          continue;
        }
        s.age += dt;
        if (s.age >= s.life) {
          s.active = false;
          _s.setScalar(0);
          _m.compose(_p.set(0, -9999, 0), _q.identity(), _s);
          mesh.setMatrixAt(i, _m);
          continue;
        }
        shardVel[i * 3 + 1] -= s.gravity * dt;
        shardPos[i * 3] += shardVel[i * 3] * dt;
        shardPos[i * 3 + 1] += shardVel[i * 3 + 1] * dt;
        shardPos[i * 3 + 2] += shardVel[i * 3 + 2] * dt;

        const k = 1 - s.age / s.life;
        const sz = s.size * (0.4 + 0.6 * k);
        _p.set(shardPos[i * 3], shardPos[i * 3 + 1], shardPos[i * 3 + 2]);
        _s.set(sz, sz, sz);
        _m.compose(_p, _q.identity(), _s);
        mesh.setMatrixAt(i, _m);

        _c.setRGB(shardColor[i * 3] * k, shardColor[i * 3 + 1] * k, shardColor[i * 3 + 2] * k);
        mesh.setColorAt(i, _c);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // --- blood ---------------------------------------------------------------
    // Only the small airborne pool is touched each frame. Ground stains are
    // static instance matrices and cost a single draw call no matter how many
    // have accumulated (the oldest slot is recycled after the fixed cap).
    const dropMesh = bloodDropMesh.current;
    if (dropMesh) {
      for (let i = 0; i < BLOOD_DROP_POOL; i++) {
        const drop = bloodDrops[i];
        if (!drop.active) {
          hideInstance(dropMesh, i);
          continue;
        }
        bloodDropVel[i * 3 + 1] -= 5.8 * dt;
        bloodDropPos[i * 3] += bloodDropVel[i * 3] * dt;
        bloodDropPos[i * 3 + 1] += bloodDropVel[i * 3 + 1] * dt;
        bloodDropPos[i * 3 + 2] += bloodDropVel[i * 3 + 2] * dt;
        if (bloodDropPos[i * 3 + 1] <= floorY + 0.04) {
          drop.active = false;
          leaveBloodStain(bloodDropPos[i * 3], bloodDropPos[i * 3 + 2], drop.size);
          hideInstance(dropMesh, i);
          continue;
        }
        _m.compose(
          _p.set(bloodDropPos[i * 3], bloodDropPos[i * 3 + 1], bloodDropPos[i * 3 + 2]),
          _q.identity(),
          _s.setScalar(drop.size)
        );
        dropMesh.setMatrixAt(i, _m);
      }
      dropMesh.instanceMatrix.needsUpdate = true;
    }

    // --- flash rings ------------------------------------------------------
    for (let i = 0; i < FLASH_POOL; i++) {
      const fl = flashes[i];
      const node = flashRefs.current[i];
      if (!node) continue;
      if (!fl.active) {
        node.visible = false;
        continue;
      }
      fl.age += dt;
      if (fl.age >= fl.life) {
        fl.active = false;
        node.visible = false;
        continue;
      }
      const k = fl.age / fl.life;
      node.visible = true;
      node.position.set(flashPos[i * 3], flashPos[i * 3 + 1], flashPos[i * 3 + 2]);
      const r = fl.radius * (0.3 + 0.9 * k);
      node.scale.setScalar(r);
      const mat = node.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - k) * 0.8;
      mat.color.setRGB(flashColorArr[i * 3], flashColorArr[i * 3 + 1], flashColorArr[i * 3 + 2]);
    }
  });

  return (
    <group>
      <instancedMesh
        ref={shardMesh}
        args={[quadGeo, shardMat, SHARD_POOL]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bloodDropMesh}
        args={[bloodDropGeo, bloodDropMat, BLOOD_DROP_POOL]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bloodStainMesh}
        args={[bloodStainGeo, bloodStainMat, BLOOD_STAIN_POOL]}
        frustumCulled={false}
        renderOrder={-1}
      />
      {Array.from({ length: FLASH_POOL }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            flashRefs.current[i] = el;
          }}
          visible={false}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
});
