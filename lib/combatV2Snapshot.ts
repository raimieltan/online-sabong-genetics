// Application adapter lives outside the standalone engine. No persistent entity is mutated.
import { effectiveStat, maxHealth } from './combat/stats';
import { deriveBehaviorProfile } from './combat/behavior';
import { resolvePhysicalProfile } from './physicalProfile';
import { clamp } from './combat-v2/constants';
import type { FighterCombatSnapshot } from './combat-v2/types';
import type { Chicken } from './types';

export function toCombatV2Snapshot(chicken: Chicken, playerId: string): FighterCombatSnapshot {
  const physical = resolvePhysicalProfile(chicken);
  const condition = clamp((chicken.condition ?? 100) / 100);
  const legInjury = (chicken.injuries ?? []).some(i => i.location === 'leg' || i.location === 'foot' || i.location === 'joint');
  return {
    fighterId: chicken.id, playerId, name: chicken.name,
    stats: { power: effectiveStat(chicken, 'power'), speed: effectiveStat(chicken, 'speed'), agility: effectiveStat(chicken, 'agility'), accuracy: effectiveStat(chicken, 'accuracy'), defense: effectiveStat(chicken, 'defense'), stamina: effectiveStat(chicken, 'stamina') },
    physical: { ...physical, mobility: physical.mobility * (legInjury ? .85 : 1), neck: clamp(chicken.physical.neckLength, .85, 1.15) },
    behavior: { ...(chicken.behavior ?? deriveBehaviorProfile(chicken.fightingStyle, chicken.traits)) },
    experience: clamp(Object.values(chicken.experience ?? {}).reduce((sum, n) => sum + n, 0) / 700),
    condition, maxHealth: maxHealth(chicken) * (.6 + condition * .4),
  };
}
