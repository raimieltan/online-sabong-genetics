"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const IDLE_POS = new THREE.Vector3(0.4, 8.2, 12.8);
const IDLE_TARGET = new THREE.Vector3(0, 0, -0.6);

/**
 * Elevated management-game camera with a narrow orbit and zoom range. Players
 * can inspect the compound without spinning below the ground or losing the
 * authored composition; selection still eases toward a resident or facility.
 */
export function CoopCamera({ focusTarget }: { focusTarget: RefObject<THREE.Vector3 | null> }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.copy(IDLE_POS);
  }, [camera]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const target = focusTarget.current ?? IDLE_TARGET;
    const damp = 1 - Math.pow(0.001, delta);
    controls.target.lerp(target, damp);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0, 0]}
      enablePan={false}
      minDistance={7}
      maxDistance={17}
      minPolarAngle={0.72}
      maxPolarAngle={1.08}
      minAzimuthAngle={-0.48}
      maxAzimuthAngle={0.48}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
