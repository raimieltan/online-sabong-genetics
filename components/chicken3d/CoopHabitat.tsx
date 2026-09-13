"use client";

import type {
  HabitatStyle,
  VillageZone,
} from "@/lib/coopVillage";

const WOOD = "#604329";
const BAMBOO = "#a77b43";

function Rail({
  position,
  rotation = [0, 0, Math.PI / 2],
  length = 1.7,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
    >
      <cylinderGeometry
        args={[
          0.025,
          0.035,
          length,
          6,
        ]}
      />

      <meshStandardMaterial
        color={BAMBOO}
        roughness={0.86}
      />
    </mesh>
  );
}

function LowFence() {
  return (
    <group>
      <mesh
        position={[
          -0.82,
          0.27,
          -0.52,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.035,
            0.045,
            0.55,
            6,
          ]}
        />

        <meshStandardMaterial
          color={WOOD}
          roughness={0.9}
        />
      </mesh>

      <mesh
        position={[
          0.82,
          0.27,
          -0.52,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.035,
            0.045,
            0.55,
            6,
          ]}
        />

        <meshStandardMaterial
          color={WOOD}
          roughness={0.9}
        />
      </mesh>

      <Rail
        position={[
          0,
          0.18,
          -0.52,
        ]}
      />

      <Rail
        position={[
          0,
          0.4,
          -0.52,
        ]}
      />

      <Rail
        position={[
          -0.82,
          0.2,
          0.05,
        ]}
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
        length={1.15}
      />
    </group>
  );
}

export function CoopHabitat({
  position,
  facingY,
  style,
  zone,
  name: _name,
}: {
  position: [
    number,
    number,
    number,
  ];

  facingY: number;

  style: HabitatStyle;

  zone: VillageZone;

  name: string;
}) {
  const champion =
    style === "champion";

  const recovering =
    zone === "recovery";

  const young =
    zone === "young";

  return (
    <group
      position={position}
      rotation={[
        0,
        facingY,
        0,
      ]}
    >
      {/* Ground patch */}
      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          -0.08,
        ]}
        position={[
          0,
          0.008,
          0,
        ]}
        receiveShadow
      >
        <planeGeometry
          args={[
            1.85,
            1.45,
          ]}
        />

        <meshStandardMaterial
          color={
            young
              ? "#6b5135"
              : "#5a3b24"
          }
          roughness={1}
          transparent
          opacity={0.38}
        />
      </mesh>

      <LowFence />

      {/* Shade structure */}
      <group
        position={[
          0.48,
          0,
          -0.37,
        ]}
      >
        <mesh
          position={[
            -0.45,
            0.55,
            0,
          ]}
          castShadow
        >
          <cylinderGeometry
            args={[
              0.025,
              0.035,
              1.1,
              6,
            ]}
          />

          <meshStandardMaterial
            color={WOOD}
            roughness={0.9}
          />
        </mesh>

        <mesh
          position={[
            0.45,
            0.55,
            0,
          ]}
          castShadow
        >
          <cylinderGeometry
            args={[
              0.025,
              0.035,
              1.1,
              6,
            ]}
          />

          <meshStandardMaterial
            color={WOOD}
            roughness={0.9}
          />
        </mesh>

        <mesh
          position={[
            0,
            1.05,
            0,
          ]}
          rotation={[
            0,
            0,
            0.08,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              1.12,
              0.06,
              0.82,
            ]}
          />

          <meshStandardMaterial
            color={
              recovering
                ? "#8b755b"
                : champion
                  ? "#9a6232"
                  : "#75502e"
            }
            roughness={0.96}
          />
        </mesh>

        <Rail
          position={[
            -0.45,
            1.08,
            0,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          length={0.9}
        />

        <Rail
          position={[
            -0.22,
            1.08,
            0,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          length={0.9}
        />

        <Rail
          position={[
            0,
            1.08,
            0,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          length={0.9}
        />

        <Rail
          position={[
            0.22,
            1.08,
            0,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          length={0.9}
        />

        <Rail
          position={[
            0.45,
            1.08,
            0,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
          length={0.9}
        />
      </group>

      {/* Feed/water bowl */}
      <mesh
        position={[
          -0.48,
          0.08,
          0.25,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.2,
            0.16,
            0.12,
            14,
          ]}
        />

        <meshStandardMaterial
          color="#6e5540"
          metalness={0.12}
          roughness={0.72}
        />
      </mesh>

      <mesh
        position={[
          -0.48,
          0.145,
          0.25,
        ]}
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
      >
        <circleGeometry
          args={[
            0.14,
            14,
          ]}
        />

        <meshStandardMaterial
          color={
            recovering
              ? "#648090"
              : "#b88b42"
          }
          roughness={0.55}
        />
      </mesh>

      {/*
       * Removed Drei <Text>.
       *
       * You already show the chicken's
       * name when selected/hovered in
       * CoopChicken.
       */}

      {/* Recovery medical marker */}
      {recovering ? (
        <group
          position={[
            0.62,
            0.78,
            -0.02,
          ]}
        >
          <mesh>
            <boxGeometry
              args={[
                0.34,
                0.34,
                0.025,
              ]}
            />

            <meshStandardMaterial
              color="#e1d6bb"
              roughness={0.9}
            />
          </mesh>

          <mesh
            position={[
              0,
              0,
              0.02,
            ]}
          >
            <boxGeometry
              args={[
                0.09,
                0.26,
                0.025,
              ]}
            />

            <meshStandardMaterial
              color="#a53f37"
            />
          </mesh>

          <mesh
            position={[
              0,
              0,
              0.021,
            ]}
          >
            <boxGeometry
              args={[
                0.26,
                0.09,
                0.025,
              ]}
            />

            <meshStandardMaterial
              color="#a53f37"
            />
          </mesh>
        </group>
      ) : null}

      {/* Champion marker */}
      {champion ? (
        <mesh
          position={[
            0,
            1.02,
            -0.58,
          ]}
          castShadow
        >
          <octahedronGeometry
            args={[
              0.11,
              0,
            ]}
          />

          <meshStandardMaterial
            color="#e2b758"
            metalness={0.58}
            roughness={0.28}
            emissive="#6b4510"
            emissiveIntensity={
              0.25
            }
          />
        </mesh>
      ) : null}
    </group>
  );
}