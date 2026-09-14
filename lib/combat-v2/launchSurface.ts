import type { CombatMode } from './canonical';

const FOUR_COMMAND_ONLY_MODES = new Set<CombatMode>(['PVE', 'BOSS', 'SIDE_ENCOUNTER']);

/** Launch campaign policy: coaching remains exactly PRESS/WAIT/COUNTER/RECOVER.
 * Awakening data and controls remain available in non-campaign modes. */
export function launchSurfaceAllowsAwakening(mode: CombatMode): boolean {
  return !FOUR_COMMAND_ONLY_MODES.has(mode);
}
