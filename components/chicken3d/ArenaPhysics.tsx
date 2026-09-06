"use client";

import type { ReactNode } from "react";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";

const FLOOR_HALF_EXTENT = 4.5;
const FLOOR_THICKNESS = 0.05;
const WALL_HALF_EXTENT_X = 3.2;
const WALL_HEIGHT = 1.4;

/**
 * Fixed floor + invisible side boundaries so a knocked-back or knocked-down
 * rooster can't fall through the stage or get shoved out of frame (V2 battle
 * spec §40). Purely geometric — the server already decided the fight, this
 * just keeps the presentation layer physically contained.
 */
export function ArenaPhysics({ floorY, children }: { floorY: number; children: ReactNode }) {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <RigidBody type="fixed" position={[0, floorY - FLOOR_THICKNESS, 0]} colliders={false} friction={0.9}>
        <CuboidCollider args={[FLOOR_HALF_EXTENT, FLOOR_THICKNESS, FLOOR_HALF_EXTENT]} />
      </RigidBody>
      <RigidBody type="fixed" position={[-WALL_HALF_EXTENT_X, floorY + WALL_HEIGHT / 2, 0]} colliders={false}>
        <CuboidCollider args={[0.05, WALL_HEIGHT / 2, FLOOR_HALF_EXTENT]} />
      </RigidBody>
      <RigidBody type="fixed" position={[WALL_HALF_EXTENT_X, floorY + WALL_HEIGHT / 2, 0]} colliders={false}>
        <CuboidCollider args={[0.05, WALL_HEIGHT / 2, FLOOR_HALF_EXTENT]} />
      </RigidBody>
      {children}
    </Physics>
  );
}
