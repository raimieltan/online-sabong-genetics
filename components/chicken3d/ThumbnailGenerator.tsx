"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Environment } from "@react-three/drei";

import { ChickenModel } from "./ChickenModel";
import { nextQueued, resolveThumbnail, subscribeQueue, type ThumbnailJob } from "./thumbnailCache";

const THUMB_SIZE = 160;
// Frames to let the GLTF materials (incl. the pattern shader's onBeforeCompile
// pass) finish compiling before the snapshot is taken — cheap since this runs
// offscreen, once per distinct-looking chicken, then never again.
const CAPTURE_AFTER_FRAMES = 8;

function CaptureFrame({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === CAPTURE_AFTER_FRAMES) onReady();
  });
  return null;
}

/**
 * Mounted once at the app root. Processes the thumbnail queue one chicken at a
 * time on a single hidden, offscreen canvas — see thumbnailCache.ts for why.
 */
export function ThumbnailGenerator() {
  const [job, setJob] = useState<ThumbnailJob | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const processing = useRef(false);

  useEffect(() => {
    const pump = () => {
      if (processing.current) return;
      const next = nextQueued();
      if (!next) return;
      processing.current = true;
      setJob(next);
    };
    pump();
    return subscribeQueue(pump);
  }, []);

  const handleReady = () => {
    if (job && canvasElRef.current) {
      resolveThumbnail(job.key, canvasElRef.current.toDataURL("image/png"));
    }
    processing.current = false;
    setJob(null);
    // Give the DOM a tick to unmount the finished job's Canvas before starting the next.
    queueMicrotask(() => {
      const next = nextQueued();
      if (next) {
        processing.current = true;
        setJob(next);
      }
    });
  };

  if (!job) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: -9999,
        top: 0,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        pointerEvents: "none",
      }}
    >
      <Canvas
        key={job.key}
        onCreated={({ gl }) => {
          canvasElRef.current = gl.domElement;
        }}
        camera={{ position: [0, 1, 4.5], fov: 40 }}
        dpr={1}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 2]} intensity={1.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} />
        <Suspense fallback={null}>
          <Bounds fit clip observe={false} maxDuration={0.01} margin={1.3}>
            <ChickenModel
              colorScheme={job.subject.colorScheme}
              sex={job.subject.sex}
              physical={job.subject.physical}
              mutations={job.subject.mutations}
              animate={false}
            />
          </Bounds>
          <Environment preset="city" />
        </Suspense>
        <CaptureFrame onReady={handleReady} />
      </Canvas>
    </div>
  );
}
