"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const IDLE_POS = new THREE.Vector3(0, 8.5, 10.5);
const IDLE_TARGET = new THREE.Vector3(0, 0, 0);

/**
 * Dragon-City-style elevated 3/4 camera: OrbitControls gives simple
 * pan/rotate/zoom, constrained so the player can't dip below the ground plane
 * or spin into a top-down view. Selecting a chicken smoothly re-targets the
 * controls at its position instead of snapping (spec §6).
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
      enablePan
      panSpeed={0.6}
      minDistance={5}
      maxDistance={18}
      minPolarAngle={0.35}
      maxPolarAngle={1.15}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
