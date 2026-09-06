"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import { IMPACT_VFX, type ImpactVfxKind } from "@/lib/animation/impactVfx";

/**
 * Pooled procedural impact VFX (spec §19). One InstancedMesh of tiny quads for
 * shard sprays + a small ring-mesh pool for flash pops. Everything is
 * preallocated; `spawn()` only rewrites slots in the pool, and the per-frame
 * update touches scratch objects created once. No particle framework.
 *
 * Not authoritative for anything — it just draws where `spawn()` is told the
 * contact happened (a presentation collider / bone world position).
 */

const SHARD_POOL = 160;
const FLASH_POOL = 6;

export interface ImpactVFXHandle {
  /** Spawn a burst of `kind` at `pos`. `normal` biases the spray direction (optional). */
  spawn: (kind: ImpactVfxKind, pos: THREE.Vector3, normal?: THREE.Vector3) => void;
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

export const ImpactVFX = forwardRef<
  ImpactVFXHandle,
  {
    /** Optional 0..1 time scale (BattleCanvas sets 0 during hit-stop so VFX freeze too). */
    timeScaleRef?: RefObject<number>;
  }
>(function ImpactVFX({ timeScaleRef }, ref) {
  const shardMesh = useRef<THREE.InstancedMesh>(null);
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

  const nextShard = useRef(0);
  const nextFlash = useRef(0);

  // scratch
  const _m = useMemo(() => new THREE.Matrix4(), []);
  const _q = useMemo(() => new THREE.Quaternion(), []);
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
      clear() {
        for (const s of shards) s.active = false;
        for (const f of flashes) f.active = false;
      },
    }),
    [shards, flashes, shardPos, shardVel, shardColor, flashPos, flashColorArr, _c, _c2]
  );

  useFrame((_state, rawDelta) => {
    const scale = timeScaleRef?.current ?? 1;
    const dt = Math.min(rawDelta, 1 / 30) * scale;

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
