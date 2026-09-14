import { add, addPair, type AnimIntent, type PoseMap } from '../types';
import { wingOpen } from './helpers';
import { sampleWingFlapCycle } from '../wingFlap';

/** Full-body flight pose driven by simulation phases, with additive localized recoil. */
export function aerialAttack(a: NonNullable<AnimIntent['aerial']>, out: PoseMap): void {
  const p = Math.max(0, Math.min(1, a.phaseProgress));
  const load = a.phase === 'PRELOAD' ? p : 0;
  const land = a.phase === 'LAND' ? Math.sin(p * Math.PI) : 0;
  const airborne = a.phase !== 'PRELOAD' && a.phase !== 'LAND';
  const flapTime = (a.tick - a.launchedTick) / 60 + a.wingOffset * .02;
  const open = airborne ? 1 : a.phase === 'LAND' ? 1 - p : p * .45;
  const strike = a.strikeProgress !== undefined ? Math.min(1, a.strikeProgress * 4 + .25)
    : a.phase === 'STRIKE_ACTIVE' ? Math.min(1, p * 4 + .25) : 0;
  const recoil = a.recoil ? Math.max(0, 1 - (a.tick - a.recoil.tick) / 13) * a.recoil.strength : 0;
  const flapCycle = ((flapTime * 2.15) % 1 + 1) % 1;
  const wingBeat = sampleWingFlapCycle(flapCycle);
  add(out, 'Hips', { py: -.055 * load - .07 * land + (airborne ? wingBeat.downstroke * .012 - wingBeat.settle * .004 : 0), rx: airborne ? -.24 - strike * .15 : .12 * load,
    ry: (a.variant === 'left' ? -.12 : .12) * strike, rz: recoil * (a.recoil?.side ?? 1) * .16 });
  add(out, 'Spine', { rx: airborne ? -.18 : .1 * load });
  add(out, 'Chest', { rx: airborne ? -.12 + recoil * .22 - wingBeat.downstroke * .035 : 0, rz: airborne ? wingBeat.sweep * .045 : 0 });
  add(out, 'Neck', { rx: airborne ? .28 : -.06 * load });
  add(out, 'Head', { rx: airborne ? .15 : 0 });
  add(out, 'Tail', { rx: -.25 * open, ry: -recoil * .2 });
  // Start from the corrected rig's explicitly extended pose. A small sample
  // of the same asymmetric shoulder arc keeps standalone pose sampling alive;
  // the LayerRig spring chain owns the visible fold, lag and feather whip.
  wingOpen(out, open);
  add(out, 'WingL', { rx: wingBeat.flap * .12 * open, ry: wingBeat.sweep * .08 * open, rz: -wingBeat.twist * .07 * open });
  add(out, 'WingR', { rx: wingBeat.flap * .11 * open, ry: -wingBeat.sweep * .075 * open, rz: wingBeat.twist * .065 * open });
  add(out, 'WingL', { rz: -recoil * .2 });
  add(out, 'WingR', { rz: recoil * .35 });
  addPair(out, 'Thigh', { rx: airborne ? .85 : .4 * load + .5 * land });
  addPair(out, 'Shank', { rx: airborne ? 1.05 : .8 * load + .8 * land });
  for (const side of ['L', 'R'] as const) {
    const kicks = a.variant === 'bilateral' || a.variant === (side === 'L' ? 'left' : 'right');
    const extension = kicks && a.actionId !== 'air_peck' ? strike : 0;
    add(out, `Thigh${side}`, { rx: .55 * extension });
    add(out, `Shank${side}`, { rx: -1.2 * extension });
    add(out, `Foot${side}`, { rx: airborne ? -.4 + .65 * extension : -.3 * load, ry: (side === 'L' ? -.12 : .12) * open });
  }
  if (a.actionId === 'air_peck') {
    add(out, 'Neck', { rx: .65 * strike }); add(out, 'Head', { rx: .3 * strike });
  }
  if (a.recoil?.zone === 'head' || a.recoil?.zone === 'neck') {
    add(out, 'Neck', { rx: -.6 * recoil, ry: .3 * recoil * a.recoil.side });
    add(out, 'Head', { rx: -.35 * recoil });
  } else if (a.recoil?.zone.includes('leg')) {
    add(out, a.recoil.zone === 'left_leg' ? 'ThighL' : 'ThighR', { rz: .5 * recoil * a.recoil.side });
  }
}
