"use client";

import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { MOUSE, TOUCH, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const DEFAULT_TARGET = new Vector3(0, 0, 0);

export function TrainingCameraController({
  focusPosition,
}: {
  focusPosition?: [number, number, number];
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const desiredTarget = useRef(new Vector3());
  const desiredCameraPosition = useRef(new Vector3());

  const animating = useRef(false);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !focusPosition) return;

    const target = new Vector3(
      focusPosition[0],
      focusPosition[1],
      focusPosition[2]
    );

    desiredTarget.current.copy(target);

    // Preserve current camera angle/distance relative to the current target.
    const offset = camera.position
      .clone()
      .sub(controls.target);

    desiredCameraPosition.current.copy(target).add(offset);

    animating.current = true;
  }, [focusPosition, camera]);

  useFrame((_, delta) => {
    if (!animating.current) return;

    const controls = controlsRef.current;
    if (!controls) return;

    const speed = 5;
    const alpha = 1 - Math.exp(-speed * delta);

    controls.target.lerp(desiredTarget.current, alpha);
    camera.position.lerp(desiredCameraPosition.current, alpha);

    controls.update();

    const targetDone =
      controls.target.distanceToSquared(desiredTarget.current) < 0.0005;

    const cameraDone =
      camera.position.distanceToSquared(
        desiredCameraPosition.current
      ) < 0.0005;

    if (targetDone && cameraDone) {
      controls.target.copy(desiredTarget.current);
      camera.position.copy(desiredCameraPosition.current);
      controls.update();

      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={DEFAULT_TARGET}
      enableRotate={false}
      enablePan
      enableZoom
      screenSpacePanning

      panSpeed={0.8}
      zoomSpeed={0.7}

      minDistance={10}
      maxDistance={24}

      mouseButtons={{
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}

      touches={{
        ONE: TOUCH.PAN,
        TWO: TOUCH.DOLLY_PAN,
      }}

      enableDamping
      dampingFactor={0.08}
    />
  );
}