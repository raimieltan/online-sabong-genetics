// Application adapter lives outside the standalone engine. No persistent entity is mutated.
import { effectiveCombatStat, maxHealth } from './combat/stats';
import { deriveBehaviorProfile } from './combat/behavior';
import { resolvePhysicalProfile } from './physicalProfile';
import { clamp } from './combat-v2/constants';
import { combatEvolutionSnapshot } from './combat/evolution';
import type { FighterCombatSnapshot } from './combat-v2/types';
import type { Chicken } from './types';

export function toCombatV2Snapshot(chicken: Chicken, playerId: string, opponentId = ''): FighterCombatSnapshot {
  const physical = resolvePhysicalProfile(chicken);
  const condition = clamp((chicken.condition ?? 100) / 100);
  const trainingFatigue = clamp((chicken.trainingState?.trainingFatigue ?? 0) / 100);
  const stress = clamp((chicken.stress ?? 0) / 100);
  const morale = clamp((chicken.morale ?? 75) / 100);
  const confidence = clamp((chicken.confidence ?? 50) / 100);
  const combatMaxHealth = maxHealth(chicken) * (.6 + condition * .4);
  const legInjury = (chicken.injuries ?? []).some(i => i.location === 'leg' || i.location === 'foot' || i.location === 'joint');
  return {
    fighterId: chicken.id, playerId, name: chicken.name,
    stats: { power: effectiveCombatStat(chicken, 'power'), speed: effectiveCombatStat(chicken, 'speed'), agility: effectiveCombatStat(chicken, 'agility'), accuracy: effectiveCombatStat(chicken, 'accuracy'), defense: effectiveCombatStat(chicken, 'defense'), stamina: effectiveCombatStat(chicken, 'stamina') },
    physical: { ...physical, mobility: physical.mobility * (legInjury ? .85 : 1), neck: clamp(chicken.physical.neckLength, .85, 1.15) },
    behavior: { ...(chicken.behavior ?? deriveBehaviorProfile(chicken.fightingStyle, chicken.traits)) },
    experience: clamp(Object.values(chicken.experience ?? {}).reduce((sum, n) => sum + n, 0) / 700),
    condition,
    maxHealth: combatMaxHealth,
    startingHealth: clamp(((chicken.health ?? 100) / 100) * combatMaxHealth, 1, combatMaxHealth),
    startingStamina: clamp((chicken.energy ?? 100) * (1 - trainingFatigue * .35) * (1 - stress * .2), 15, 100),
    trainingFatigue, stress, morale, confidence,
    activeInjuries: (chicken.injuries ?? []).map(injury => ({ id: injury.id, location: injury.location, severity: injury.severity, permanent: injury.permanent })),
    evolution: combatEvolutionSnapshot(chicken, opponentId),
  };
}
