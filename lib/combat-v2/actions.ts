import type { ActionDefinition } from './types';
const define = (id: string, category: ActionDefinition['category'], startupTicks: number, activeTicks: number, recoveryTicks: number, staminaCost: number, range: number, damage: number, interruptPower: number, interruptResistance: number, tracking: number): ActionDefinition => Object.freeze({ id, category, startupTicks, activeTicks, recoveryTicks, staminaCost, range, damage, interruptPower, interruptResistance, tracking });
export const ACTIONS: Readonly<Record<string, ActionDefinition>> = Object.freeze({
  peck_strike: define('peck_strike', 'attack', 4, 7, 6, 7, .85, 8, 12, 4, .7),
  spur_lunge: define('spur_lunge', 'attack', 8, 10, 9, 16, 1.3, 17, 24, 9, .35),
  jump_kick: Object.freeze({ ...define('jump_kick', 'attack', 19, 6, 6, 18, 1.2, 16, 22, 14, .65), aerial: Object.freeze({ height: .85, takeoffTick: 6, flightTicks: 40, speed: 3.8 }) }),
  flying_spur: Object.freeze({ ...define('flying_spur', 'attack', 22, 7, 6, 25, 1.35, 23, 30, 18, .4), aerial: Object.freeze({ height: 1.05, takeoffTick: 8, flightTicks: 44, speed: 4.6 }) }),
  air_left: define('air_left', 'attack', 5, 5, 5, 7, 1.25, 10, 15, 12, .65),
  air_right: define('air_right', 'attack', 5, 5, 5, 7, 1.25, 10, 15, 12, .65),
  air_peck: define('air_peck', 'counter', 3, 5, 5, 5, .9, 7, 12, 10, .8),
  air_push: define('air_push', 'attack', 4, 5, 5, 6, 1.3, 5, 26, 18, .5),
  wing_counter: define('wing_counter', 'counter', 4, 8, 7, 11, 1.05, 12, 19, 5, .8),
  guard: define('guard', 'defense', 3, 10, 5, 3, 0, 0, 0, 25, 1),
  sidestep: define('sidestep', 'evade', 3, 7, 6, 8, 0, 0, 0, 0, 1),
  feint: define('feint', 'feint', 5, 2, 5, 4, 0, 0, 0, 0, 1),
});
