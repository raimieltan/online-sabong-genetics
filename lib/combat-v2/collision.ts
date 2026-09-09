import { quantize as q } from './constants';
import type { ActionDefinition, FighterRuntimeState, Vec3 } from './types';

export type HitZone = 'head' | 'neck' | 'body' | 'left_wing' | 'right_wing' | 'left_leg' | 'right_leg';
export interface HurtSphere { zone: HitZone; center: Vec3; radius: number }
export interface HurtboxOffset { zone: HitZone; center: Vec3; radius: number }

/**
 * Hurtbox centers in fighter-local space. Kept public so the presentation
 * debug view can render the very same volumes the simulation tests against.
 */
export function hurtboxOffsets(physical: FighterRuntimeState['snapshot']['physical']): HurtboxOffset[] {
  const { mass, neck, wingControl } = physical;
  const anchors: [HitZone, number, number, number, number][] = [
    ['head', .22, 1.4 * neck, 0, .17], ['neck', .12, 1.17 * neck, 0, .16],
    ['body', 0, .88, 0, .30 * mass],
    ['left_wing', 0, .88, -.26 * wingControl, .16], ['right_wing', 0, .88, .26 * wingControl, .16],
    ['left_leg', 0, .30, -.14, .12], ['right_leg', 0, .30, .14, .12],
  ];
  return anchors.map(([zone, x, y, z, radius]) => ({ zone, radius, center: { x, y, z } }));
}

/** Model-independent rig anchors, in arena units. Rendered bones never feed collision back into combat. */
export function hurtboxes(f: FighterRuntimeState): HurtSphere[] {
  return hurtboxOffsets(f.snapshot.physical).map(({ zone, radius, center }) => {
    if (f.aerial && f.position.y > 0) {
      if (zone.includes('leg')) center = { ...center, x: f.aerial.phase === 'STRIKE_ACTIVE' ? .7 : .3, y: .65 };
      if (zone.includes('wing')) center = { ...center, z: center.z * 2.4 };
    }
    return { zone, radius, center: {
    x: f.position.x + center.x * Math.cos(f.facing) - center.z * Math.sin(f.facing),
    y: f.position.y + center.y, z: f.position.z + center.x * Math.sin(f.facing) + center.z * Math.cos(f.facing),
  } }; });
}
/** Capsule along the strike's reach against simple hurt spheres. Caller enforces active ticks. */
export function strikeCollision(attacker: FighterRuntimeState, target: FighterRuntimeState, action: ActionDefinition): HitZone | undefined {
  if (attacker.aerial && attacker.position.y > 0 && action.id !== 'air_peck') {
    const reach = action.range * attacker.snapshot.physical.reach;
    const ux = Math.cos(attacker.facing), uz = Math.sin(attacker.facing);
    const sides = attacker.aerial.variant === 'bilateral' ? [-1, 1] : [attacker.aerial.variant === 'left' ? -1 : 1];
    for (const side of sides) for (const sphere of hurtboxes(target)) {
      const dx = sphere.center.x - attacker.position.x + uz * side * .14;
      const dz = sphere.center.z - attacker.position.z - ux * side * .14;
      const along = dx * ux + dz * uz;
      if (along < .25 || along > reach + sphere.radius) continue;
      const end = Math.min(reach, along);
      const dy = sphere.center.y - attacker.position.y - .78;
      if ((dx - ux * end) ** 2 + (dz - uz * end) ** 2 + dy * dy <= (.13 + sphere.radius) ** 2) return sphere.zone;
    }
    return;
  }
  const reach = action.range * attacker.snapshot.physical.reach;
  const ux = Math.cos(attacker.facing), uz = Math.sin(attacker.facing);
  const height = attacker.position.y + (action.aerial ? .35 : action.id === 'peck_strike' || action.id === 'air_peck' ? 1.4 * attacker.snapshot.physical.neck : .88);
  const strikeRadius = .08 + action.tracking * .08;
  for (const sphere of hurtboxes(target)) {
    const dx = sphere.center.x - attacker.position.x, dz = sphere.center.z - attacker.position.z;
    if (dx * ux + dz * uz <= 0) continue;
    const along = Math.max(.15, Math.min(reach, dx * ux + dz * uz));
    const separation = (dx - ux * along) ** 2 + (dz - uz * along) ** 2 + (sphere.center.y - height) ** 2;
    if (separation <= (strikeRadius + sphere.radius) ** 2) return sphere.zone;
  }
}

/** Body clearance includes the rendered chest and folded wings, independent of attack reach. */
export const bodyClearanceRadius = (physical: FighterRuntimeState['snapshot']['physical']) => .5 * Math.max(physical.mass, physical.wingControl);
export const bodyRadius = (f: FighterRuntimeState) => bodyClearanceRadius(f.snapshot.physical);

/** Symmetric position projection, including arena walls. Multiple passes handle pairs pinned at the wall. */
export function separateFighters(fighters: readonly FighterRuntimeState[], arenaRadius: number): void {
  const [a, b] = fighters;
  const minimum = bodyRadius(a) + bodyRadius(b);
  for (let iteration = 0; iteration < 48; iteration++) {
    for (const f of fighters) {
      const radius = Math.hypot(f.position.x, f.position.z), limit = Math.max(.1, arenaRadius - bodyRadius(f));
      if (radius > limit) { f.position.x *= limit / radius; f.position.z *= limit / radius; }
    }
    const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
    const d = Math.hypot(dx, dz);
    if (d >= minimum - .000001) break;
    // Coincident centers at the wall separate tangentially so neither is pushed outside again.
    const radius = Math.hypot(a.position.x, a.position.z);
    const ux = d > .000001 ? dx / d : radius > .000001 ? -a.position.z / radius : 1;
    const uz = d > .000001 ? dz / d : radius > .000001 ? a.position.x / radius : 0;
    const push = (minimum - d) / 2;
    a.position.x -= ux * push; a.position.z -= uz * push;
    b.position.x += ux * push; b.position.z += uz * push;
  }
  for (const f of fighters) { f.position.x = q(f.position.x); f.position.z = q(f.position.z); }
}
