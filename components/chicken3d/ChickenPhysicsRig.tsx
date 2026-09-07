"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { RigidBody, CapsuleCollider, BallCollider, type RapierRigidBody } from "@react-three/rapier";

import { resolvePhysicalProfile } from "@/lib/physicalProfile";
import type { Chicken, HitZone, StaggerLevel } from "@/lib/types";
import { HIT_ZONES } from "@/lib/types";
import { ChickenModel, type FighterAnim } from "./ChickenModel";
import type { AnimIntent } from "@/lib/animation/types";
import { getBodyCapsule, getZoneColliders } from "./colliderGeometry";

/** Baseline collider mass (kg-ish, arbitrary units) at physicalProfile.mass === 1.0. */
const BASE_MASS = 1.4;

/** Real-physics knockback impulse magnitude per stagger tier — "none"/"light" stay purely cosmetic (spec §36). */
const KNOCKBACK_IMPULSE: Record<StaggerLevel, number> = {
  none: 0,
  light: 0,
  stumble: 1.1,
  medium: 0.9,
  heavy: 1.8,
  knockdown: 3.2,
};

const KNOCKDOWN_TORQUE = 1.4;
/** How long a non-fatal knockdown keeps the body toppled before the physics rig rights it — exported so BattleCanvas can time the matching "getup" animation intent (spec: a knocked-down-but-not-KO'd bird gets back up). */
export const KNOCKDOWN_RECOVER_MS = 700;
/** A trip wobbles the body (partial topple, smaller torque) then catches itself much faster than a full knockdown. */
const STUMBLE_TORQUE = 0.55;
const STUMBLE_RECOVER_MS = 450;
/** Recovery timers scale by defenderRecoveryRatio (speed/stamina + style), clamped so genetics tune it, never break it. */
const RECOVERY_RATIO_MIN = 0.7;
const RECOVERY_RATIO_MAX = 1.5;

/** Same clamped scaling `scheduleUprightRecovery` applies internally — exported so callers can line up a cosmetic beat (e.g. the "getup" animation intent) with the physics recovery. */
export function scaledRecoveryMs(baseMs: number, recoveryRatio: number): number {
  return Math.min(baseMs * RECOVERY_RATIO_MAX, Math.max(baseMs * RECOVERY_RATIO_MIN, baseMs / recoveryRatio));
}

export interface ChickenPhysicsHandle {
  /**
   * Applies a real physics impulse in the XZ plane; direction need not be normalized.
   * `attackerPowerRatio` (attacker power vs a baseline, ~0.6-1.8) scales impulse magnitude
   * on top of the stagger tier, so a powerful hit on a light bird sends them flying while
   * the same tier barely moves a heavy tank. `defenderRecoveryRatio` (~0.7-1.5, from the
   * defender's own speed/stamina/style) scales how fast they get back on their feet after
   * a stumble or knockdown. Knockdown also topples the body; stumble only wobbles it.
   */
  applyKnockback: (
    dirX: number,
    dirZ: number,
    stagger: StaggerLevel,
    attackerPowerRatio?: number,
    defenderRecoveryRatio?: number,
    opts?: { suppressRecovery?: boolean }
  ) => void;
  /** Current world-space position of one hit-zone collider, for impact VFX placement. */
  getZonePosition: (zone: HitZone) => THREE.Vector3 | null;
}

interface ChickenPhysicsRigProps {
  colorScheme: Chicken["colorScheme"];
  sex: Chicken["sex"];
  physical: Chicken["physical"];
  mutations: Chicken["mutations"];
  combatAnim: RefObject<FighterAnim | null>;
  animIntent?: RefObject<AnimIntent | null>;
  opponentPos?: RefObject<THREE.Vector3 | null>;
  facing: "left" | "right";
  /** Final world-space position (already includes any stage offset/scale — this rig is not nested in a scaled ancestor). */
  position: [number, number, number];
  /** Uniform visual scale applied to the model + colliders (matches the stage's world scale). */
  worldScale: number;
}

function scaleSpec<T extends { position: [number, number, number] }>(spec: T, scale: number): T {
  const scaled = { ...spec, position: spec.position.map((v) => v * scale) as [number, number, number] };
  if ("radius" in scaled) (scaled as { radius: number }).radius *= scale;
  if ("halfHeight" in scaled) (scaled as { halfHeight: number }).halfHeight *= scale;
  return scaled;
}

export const ChickenPhysicsRig = forwardRef<ChickenPhysicsHandle, ChickenPhysicsRigProps>(
  function ChickenPhysicsRig(
    { colorScheme, sex, physical, mutations, combatAnim, animIntent, opponentPos, facing, position, worldScale },
    ref
  ) {
    const bodyRef = useRef<RapierRigidBody>(null);
    const zoneMarkers = useRef<Partial<Record<HitZone, THREE.Object3D>>>({});
    const uprightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // react-three-rapier never nulls bodyRef.current when the underlying
    // rigid body is removed (unmount or prop-driven recreation) — it stays a
    // dangling handle into freed Rust/wasm memory, so `!bodyRef.current` alone
    // can't detect that. Track liveness ourselves for the deferred recovery below.
    const mounted = useRef(true);
    useEffect(() => {
      return () => {
        mounted.current = false;
        if (uprightTimer.current) clearTimeout(uprightTimer.current);
      };
    }, []);

    const profile = resolvePhysicalProfile({ physical });
    const bodyCapsule = scaleSpec(getBodyCapsule(physical), worldScale);
    const zoneColliders = getZoneColliders(physical);
    const bodyMass = BASE_MASS * profile.mass;

    useImperativeHandle(
      ref,
      () => {
        /** Unlocks XZ rotation for a topple/wobble, then re-locks upright after `ms` (scaled by recovery ratio). */
        const scheduleUprightRecovery = (ms: number, recoveryRatio: number) => {
          const recoverMs = scaledRecoveryMs(ms, recoveryRatio);
          if (uprightTimer.current) clearTimeout(uprightTimer.current);
          uprightTimer.current = setTimeout(() => {
            if (!mounted.current) return;
            const b = bodyRef.current;
            if (!b) return;
            const rot = b.rotation();
            const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w));
            const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler.y, 0));
            b.setRotation({ x: upright.x, y: upright.y, z: upright.z, w: upright.w }, true);
            b.setEnabledRotations(false, true, false, true);
          }, recoverMs);
        };

        return {
          applyKnockback: (dirX, dirZ, stagger, attackerPowerRatio = 1, defenderRecoveryRatio = 1, opts) => {
            const body = bodyRef.current;
            if (!body) return;
            const baseMagnitude = KNOCKBACK_IMPULSE[stagger];
            if (baseMagnitude <= 0) return;

            // Attacker power throws the defender further; defender mass anchors them —
            // a light bird flies from a hit a heavy tank would barely notice.
            const magnitude = (baseMagnitude * attackerPowerRatio) / profile.mass;

            const len = Math.hypot(dirX, dirZ) || 1;
            const nx = dirX / len;
            const nz = dirZ / len;
            // Zero out any residual velocity from a prior hit first — otherwise
            // repeated knockbacks stack on top of each other (linearDamping alone
            // can't dissipate them fast enough across a long fight) and the rig
            // drifts upward/outward without bound over many rounds.
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.applyImpulse({ x: nx * magnitude, y: magnitude * 0.15, z: nz * magnitude }, true);

            if (stagger === "stumble") {
              body.setEnabledRotations(true, true, false, true);
              body.applyTorqueImpulse({ x: nz * STUMBLE_TORQUE, y: 0, z: -nx * STUMBLE_TORQUE }, true);
              scheduleUprightRecovery(STUMBLE_RECOVER_MS, defenderRecoveryRatio);
              return;
            }

            if (stagger !== "knockdown") return;

            body.setEnabledRotations(true, true, false, true);
            body.applyTorqueImpulse({ x: nz * KNOCKDOWN_TORQUE, y: 0, z: -nx * KNOCKDOWN_TORQUE }, true);
            // On a KO the bird stays down — no upright recovery (design decision 4).
            if (opts?.suppressRecovery) {
              if (uprightTimer.current) clearTimeout(uprightTimer.current);
              return;
            }
            scheduleUprightRecovery(KNOCKDOWN_RECOVER_MS, defenderRecoveryRatio);
          },
          getZonePosition: (zone) => {
            const marker = zoneMarkers.current[zone];
            if (!marker) return null;
            return marker.getWorldPosition(new THREE.Vector3());
          },
        };
      },
      [profile.mass]
    );

    return (
      <RigidBody
        ref={bodyRef}
        position={position}
        colliders={false}
        enabledRotations={[false, true, false]}
        linearDamping={3}
        angularDamping={4}
        friction={0.9}
        restitution={0}
      >
        {/* <CapsuleCollider
          args={[bodyCapsule.halfHeight, bodyCapsule.radius]}
          position={bodyCapsule.position}
          mass={bodyMass}
        /> */}
        {HIT_ZONES.map((zone) => {
          const spec = scaleSpec(zoneColliders[zone], worldScale);
          return (
            <group
              key={zone}
              position={spec.position}
              ref={(el) => {
                if (el) zoneMarkers.current[zone] = el;
              }}
            >
              {spec.kind === "sphere" ? (
                <BallCollider args={[spec.radius]} sensor density={0} />
              ) : (
                <CapsuleCollider args={[spec.halfHeight, spec.radius]} sensor density={0} />
              )}
            </group>
          );
        })}
        <group scale={worldScale}>
          <ChickenModel
            colorScheme={colorScheme}
            sex={sex}
            physical={physical}
            mutations={mutations}
            combatAnim={combatAnim}
            animIntent={animIntent}
            opponentPos={opponentPos}
            facing={facing}
            basePosition={[0, 0, 0]}
          />
        </group>
      </RigidBody>
    );
  }
);
