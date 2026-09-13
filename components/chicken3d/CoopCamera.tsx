"use client";

import { useEffect, useRef } from "react";

import * as THREE from "three";

import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import type {
  OrbitControls as OrbitControlsImpl,
} from "three-stdlib";

const CAMERA_POSITION =
  new THREE.Vector3(
    0.4,
    8.2,
    12.8
  );

const CAMERA_TARGET: [
  number,
  number,
  number
] = [0, 0, -0.6];

export function CoopCamera() {
  const controlsRef =
    useRef<
      OrbitControlsImpl | null
    >(null);

  const { camera } =
    useThree();

  useEffect(() => {
    camera.position.copy(
      CAMERA_POSITION
    );

    camera.lookAt(
      CAMERA_TARGET[0],
      CAMERA_TARGET[1],
      CAMERA_TARGET[2]
    );

    if (controlsRef.current) {
      controlsRef.current.target.set(
        ...CAMERA_TARGET
      );

      controlsRef.current.update();
    }
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={CAMERA_TARGET}

      enablePan={false}

      minDistance={8}
      maxDistance={16}

      minPolarAngle={0.72}
      maxPolarAngle={1.08}

      minAzimuthAngle={-0.48}
      maxAzimuthAngle={0.48}

      enableDamping
      dampingFactor={0.06}
    />
  );
}