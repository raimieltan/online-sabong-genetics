"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, OrbitControls } from "@react-three/drei";

import type { Chicken } from "@/lib/types";

import { ChickenModel } from "./ChickenModel";

export function ChickenViewer({
  chicken,
  interactive = true,
  animate = true,
  className,
  cameraDistance = 4,
}: {
  chicken: Pick<Chicken, "colorScheme" | "sex">;
  interactive?: boolean;
  animate?: boolean;
  className?: string;
  /** Distance of the framing camera from the model; smaller = tighter crop (e.g. for compact cards). */
  cameraDistance?: number;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1, cameraDistance], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 2]} intensity={1.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />
        <Suspense fallback={null}>
          <Bounds fit clip margin={1.3}>
            <ChickenModel colorScheme={chicken.colorScheme} sex={chicken.sex} animate={animate} />
          </Bounds>
          <Environment preset="city" />
        </Suspense>
        {interactive && <OrbitControls makeDefault enablePan={false} minDistance={1} maxDistance={8} />}
      </Canvas>
    </div>
  );
}
