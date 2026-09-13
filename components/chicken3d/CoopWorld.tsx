"use client";

import {
  Suspense,
  useCallback,
  useMemo,
  useRef,
} from "react";

import * as THREE from "three";

import { Canvas } from "@react-three/fiber";

import type { Chicken } from "@/lib/types";

import {
  getVillageSlot,
  habitatStyle,
  type VillageZone,
} from "@/lib/coopVillage";

import { CoopCamera } from "./CoopCamera";
import { CoopEnvironment } from "./CoopEnvironment";
import { CoopHabitat } from "./CoopHabitat";
import { CoopChicken } from "./CoopChicken";

export function CoopWorld({
  chickens,
  eggCount,
  selectedId,
  onSelect,
  onIncubatorClick,
  onReady,
}: {
  chickens: Chicken[];
  eggCount: number;
  selectedId: string | null;

  onSelect: (
    chicken: Chicken | null,
    worldPosition?: THREE.Vector3
  ) => void;

  onIncubatorClick: () => void;
  onReady?: () => void;
}) {
  const focusTarget = useRef(
    new THREE.Vector3(0, 0, 0)
  );

  /**
   * IMPORTANT:
   *
   * Do not rebuild slots when selectedId changes.
   *
   * These objects should only change when the actual
   * chickens array changes.
   */
  const residents = useMemo(() => {
    const zoneCounts: Record<
      VillageZone,
      number
    > = {
      fighter: 0,
      young: 0,
      recovery: 0,
    };

    return chickens.map((chicken) => {
      const zone: VillageZone =
        chicken.injured ||
        chicken.status === "injured"
          ? "recovery"
          : chicken.growthStage === "chick" ||
              chicken.growthStage === "juvenile"
            ? "young"
            : "fighter";

      const slot = getVillageSlot(
        zoneCounts[zone]++,
        zone
      );

      return {
        chicken,
        zone,
        slot,

        /**
         * Calculate this once too.
         */
        style: habitatStyle(chicken),
      };
    });
  }, [chickens]);

  /**
   * Stable callback.
   *
   * Previously every chicken received a brand-new
   * callback whenever selectedId changed.
   */
  const handleChickenSelect = useCallback(
    (
      chicken: Chicken,
      worldPosition: THREE.Vector3
    ) => {
      focusTarget.current.copy(
        worldPosition
      );

      onSelect(
        chicken,
        worldPosition
      );
    },
    [onSelect]
  );

  const handleMiss = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  const handleIncubatorClick =
    useCallback(() => {
      focusTarget.current.set(
        4.8,
        0,
        -3.4
      );

      window.setTimeout(() => {
        onIncubatorClick();
      }, 260);
    }, [onIncubatorClick]);

  return (
    <Canvas
      shadows={false}

      camera={{
        fov: 42,
        near: 0.1,
        far: 60,
      }}

      dpr={1}

      gl={{
        antialias: false,
        alpha: true,
        powerPreference:
          "high-performance",
        stencil: false,
      }}

      onPointerMissed={
        handleMiss
      }

      onCreated={() => {
        onReady?.();
      }}
    >
      <ambientLight
        intensity={0.78}
        color="#ffd9a1"
      />

      <directionalLight
        position={[
          6,
          9,
          4,
        ]}
        intensity={1.75}
        color="#ffc77d"
        castShadow
        shadow-mapSize={[
          512,
          512,
        ]}
        shadow-camera-left={
          -12
        }
        shadow-camera-right={
          12
        }
        shadow-camera-top={
          12
        }
        shadow-camera-bottom={
          -12
        }
      />

      <directionalLight
        position={[
          -5,
          4,
          -3,
        ]}
        intensity={0.24}
        color="#a8c4da"
      />

      <hemisphereLight
        args={[
          "#e9ba78",
          "#51351f",
          0.45,
        ]}
      />

      <CoopCamera
        focusTarget={
          focusTarget
        }
      />

      <Suspense fallback={null}>
        <CoopEnvironment
          eggCount={
            eggCount
          }
          onIncubatorClick={
            handleIncubatorClick
          }
        />

        {residents.map(
          ({
            chicken,
            slot,
            zone,
            style,
          }) => (
            <group
              key={
                chicken.id
              }
            >
              <CoopHabitat
                position={
                  slot.home
                }
                facingY={
                  slot.facingY
                }
                style={style}
                zone={zone}
                name={
                  chicken.name
                }
              />

              <CoopChicken
                chicken={
                  chicken
                }
                slot={slot}

                /**
                 * Ideally only:
                 *
                 * previous selected chicken
                 * new selected chicken
                 *
                 * need to rerender.
                 */
                selected={
                  selectedId ===
                  chicken.id
                }

                onSelect={
                  handleChickenSelect
                }
              />
            </group>
          )
        )}
      </Suspense>
    </Canvas>
  );
}