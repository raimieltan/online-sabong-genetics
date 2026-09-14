import type { PveBossId, PveCircuit } from './types';

/**
 * Frozen three-month launch ladder. The larger authored registry remains
 * intact as post-launch content, but is not part of normal launch progression.
 */
export const LAUNCH_PVE_BOSS_ORDER = [
  'charger',
  'wall',
  'grinder',
  'feint-master',
  'apex',
] as const satisfies readonly PveBossId[];

export type LaunchPveBossId = (typeof LAUNCH_PVE_BOSS_ORDER)[number];

export const LAUNCH_PVE_CIRCUITS: readonly PveCircuit[] = [
  {
    id: 'launch-road',
    order: 1,
    chapter: 'Launch Campaign',
    name: 'Observe · Predict · Coach',
    subtitle: 'Five opponents. Four commands. One readable fight.',
    description:
      'Read commitment, pressure patient defenders, manage attrition, resist feints, then combine every lesson against the champion.',
    environmentId: 'rural',
    bossIds: [...LAUNCH_PVE_BOSS_ORDER],
    championshipBossId: 'apex',
  },
];

export const LAUNCH_OPTIONAL_ENCOUNTER_IDS = [
  'backyard-brawl-challenge',
  'scouts-favorite-invitational',
] as const;

export function isLaunchPveBossId(value: string): value is LaunchPveBossId {
  return (LAUNCH_PVE_BOSS_ORDER as readonly string[]).includes(value);
}

export function previousLaunchBossId(value: PveBossId): LaunchPveBossId | null {
  const index = LAUNCH_PVE_BOSS_ORDER.indexOf(value as LaunchPveBossId);
  return index <= 0 ? null : LAUNCH_PVE_BOSS_ORDER[index - 1];
}

export function isLaunchOptionalEncounterId(value: string): boolean {
  return (LAUNCH_OPTIONAL_ENCOUNTER_IDS as readonly string[]).includes(value);
}
