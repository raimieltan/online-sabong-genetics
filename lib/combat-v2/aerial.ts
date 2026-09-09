import type { AerialPhase, CombatMatchState, FighterRuntimeState } from './types';
import { clamp } from './constants';

export function aerialPhase(s: CombatMatchState, f: FighterRuntimeState, phase: AerialPhase) {
  if (!f.aerial || f.aerial.phase === phase) return;
  f.aerial.phase = phase; f.aerial.phaseTick = s.tick;
  s.eventBuffer.push({ type: 'STATE_CHANGED', tick: s.tick, fighterId: f.snapshot.fighterId, detail: phase });
}

/** Add an impact to the current flight; never replace the flight with a hit clip. */
export function aerialImpact(s: CombatMatchState, f: FighterRuntimeState, source: FighterRuntimeState, zone: string, damage: number) {
  // Contact state, rather than a render/animation phase or exact root height,
  // owns whether an impact can alter a flight.
  if (!f.aerial || f.grounded) return;
  const dx = f.position.x - source.position.x, dz = f.position.z - source.position.z;
  const length = Math.hypot(dx, dz) || 1;
  const strength = clamp(damage / 12, .2, 1.2) / f.snapshot.physical.mass;
  f.velocity.x += dx / length * strength * 1.4;
  f.velocity.z += dz / length * strength * 1.4;
  f.velocity.y -= strength * .25;
  f.aerial.recoil = { tick: s.tick, zone, strength, side: f.engagement.orbitDirection };
  aerialPhase(s, f, 'IMPACT');
}
