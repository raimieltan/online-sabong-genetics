"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";

import type { Chicken } from "@/lib/types";

import { ChickenModel } from "./ChickenModel";

const SEX_EMOJI: Record<Chicken["sex"], string> = {
  rooster: "🐓",
  hen: "🐔",
};

// Browsers cap the number of simultaneous WebGL contexts (~16 in Chrome). A
// roster grid mounts one <Canvas> per card, so a full coop (20+ chickens) blows
// past that limit and the surplus canvases silently fail to acquire a context —
// Chrome then paints them as a "broken image" glyph. Keep the number of live
// canvases within a safe budget and let cards that are off-screen or over budget
// fall back to a cheap placeholder until a slot frees up.
const MAX_LIVE_CANVASES = 10;
let liveCanvases = 0;
const waiters = new Set<() => void>();

function acquireCanvasSlot(): boolean {
  if (liveCanvases >= MAX_LIVE_CANVASES) return false;
  liveCanvases += 1;
  return true;
}

function releaseCanvasSlot() {
  liveCanvases = Math.max(0, liveCanvases - 1);
  const next = waiters.values().next().value;
  if (next) next();
}

export function ChickenViewer({
  chicken,
  interactive = true,
  animate = true,
  className,
  cameraDistance = 4,
}: {
  chicken: Pick<Chicken, "colorScheme" | "sex" | "physical" | "mutations" | "growthStage">;
  interactive?: boolean;
  animate?: boolean;
  className?: string;
  /** Distance of the framing camera from the model; smaller = tighter crop (e.g. for compact cards). */
  cameraDistance?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const slotHeld = useRef(false);
  const [inView, setInView] = useState(false);
  const [hasSlot, setHasSlot] = useState(false);

  // Only cards near the viewport compete for a WebGL context.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "150px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Grab a slot while visible; release it (and hand it to a waiting card) when not.
  useEffect(() => {
    if (!inView) return;
    let active = true;

    const tryAcquire = () => {
      if (!active) return;
      if (acquireCanvasSlot()) {
        slotHeld.current = true;
        setHasSlot(true);
        waiters.delete(tryAcquire);
      } else {
        waiters.add(tryAcquire);
      }
    };
    tryAcquire();

    return () => {
      active = false;
      waiters.delete(tryAcquire);
      if (slotHeld.current) {
        slotHeld.current = false;
        setHasSlot(false);
        releaseCanvasSlot();
      }
    };
  }, [inView]);

  return (
    <div ref={wrapRef} className={className}>
      {inView && hasSlot ? (
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
              <ChickenModel
                colorScheme={chicken.colorScheme}
                sex={chicken.sex}
                growthStage={chicken.growthStage}
                physical={chicken.physical}
                mutations={chicken.mutations}
                animate={animate}
              />
            </Bounds>
          </Suspense>
          {interactive && <OrbitControls makeDefault enablePan={false} minDistance={1} maxDistance={8} />}
        </Canvas>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">
          {SEX_EMOJI[chicken.sex]}
        </div>
      )}
    </div>
  );
}
