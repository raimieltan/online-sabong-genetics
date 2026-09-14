import type { FighterState } from './types';
const mobile: FighterState[] = ['neutral', 'advancing', 'retreating', 'circling', 'winding_up', 'feinting'];
const exits: FighterState[] = ['staggered', 'down', 'finished'];
/** Legal physical transitions. An action must recover or be interrupted before another starts. */
export const TRANSITIONS: Readonly<Record<FighterState, readonly FighterState[]>> = {
  neutral: [...mobile, ...exits], advancing: [...mobile, ...exits], retreating: [...mobile, ...exits], circling: [...mobile, ...exits],
  winding_up: ['attacking', 'defending', 'evading', 'countering', 'recovering', ...exits],
  attacking: ['recovering', ...exits], countering: ['recovering', ...exits], defending: ['recovering', ...exits], evading: ['recovering', ...exits],
  feinting: ['recovering', ...exits], recovering: ['neutral', ...exits], staggered: ['neutral', ...exits],
  down: [], finished: [],
};
export function canTransition(from: FighterState, to: FighterState) { return from === to || TRANSITIONS[from].includes(to); }
