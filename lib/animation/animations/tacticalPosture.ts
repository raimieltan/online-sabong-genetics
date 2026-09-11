import { TEMPORARY_COMBAT_EXAGGERATION } from '../../combat-v2/constants';
import type { TacticalMode } from '../../combat-v2/types';
import { add, type AnimContext, type AnimState, type PoseMap } from '../types';
import { inward, wingRaise } from './helpers';

const FULL_POSTURE_STATES: readonly AnimState[] = ['idle', 'idle_alert', 'ready', 'walk', 'run', 'backstep', 'recovery'];

/**
 * Temporary 2x tactical silhouettes layered over simulation-driven animation.
 * They intentionally favor readability over subtlety for this playtest pass.
 */
export function applyTacticalPosture(mode: TacticalMode, state: AnimState, ctx: AnimContext, out: PoseMap): void {
  if (mode === 'balanced' || state === 'death' || state === 'knockdown' || state === 'getup') return;
  const actionWeight = FULL_POSTURE_STATES.includes(state) ? 1 : .3;
  const k = TEMPORARY_COMBAT_EXAGGERATION * actionWeight;

  if (mode === 'pressure' || mode === 'all_in') {
    const force = mode === 'all_in' ? k * 1.2 : k;
    add(out, 'Hips', { px: .08 * force, py: -.025 * force, rx: .035 * force });
    add(out, 'Spine', { rx: -.08 * force });
    add(out, 'Chest', { rx: -.14 * force, px: .045 * force });
    add(out, 'Neck', { rx: .11 * force });
    add(out, 'Head', { rx: -.09 * force });
    add(out, 'Tail', { rx: .14 * force });
    wingRaise(out, .08 * force, .025 * force);
    return;
  }

  if (mode === 'counter') {
    add(out, 'Hips', { px: -.09 * k, py: .015 * k, ry: -inward(ctx) * .025 * k });
    add(out, 'Chest', { rx: .055 * k, ry: inward(ctx) * .045 * k });
    add(out, 'Neck', { rx: -.06 * k });
    add(out, 'Head', { rx: .035 * k, ry: inward(ctx) * .09 * k });
    add(out, 'Tail', { rx: -.04 * k, ry: -inward(ctx) * .06 * k });
    wingRaise(out, .025 * k);
    return;
  }

  if (mode === 'defensive') {
    add(out, 'Hips', { py: -.075 * k, px: -.035 * k, rx: .06 * k });
    add(out, 'Spine', { rx: .10 * k });
    add(out, 'Chest', { rx: .12 * k });
    add(out, 'Neck', { rx: .12 * k });
    add(out, 'Head', { rx: .15 * k });
    add(out, 'Tail', { rx: -.10 * k });
    wingRaise(out, .24 * k, -.04 * k);
    return;
  }

  if (mode === 'recover') {
    add(out, 'Hips', { px: -.12 * k, py: -.04 * k, rx: .05 * k });
    add(out, 'Spine', { rx: .13 * k });
    add(out, 'Chest', { rx: .15 * k });
    add(out, 'Neck', { rx: .13 * k });
    add(out, 'Head', { rx: .18 * k });
    add(out, 'Tail', { rx: -.14 * k });
    wingRaise(out, -.11 * k);
  }
}
