import { add, addPair, type AnimIntent, type PoseMap } from '../types';

/** Full-body flight pose driven by simulation phases, with additive localized recoil. */
export function aerialAttack(a: NonNullable<AnimIntent['aerial']>, out: PoseMap): void {
  const p = Math.max(0, Math.min(1, a.phaseProgress));
  const load = a.phase === 'PRELOAD' ? p : 0;
  const land = a.phase === 'LAND' ? Math.sin(p * Math.PI) : 0;
  const airborne = a.phase !== 'PRELOAD' && a.phase !== 'LAND';
  const flap = Math.sin((a.tick - a.launchedTick) / 60 * Math.PI * 16 + a.wingOffset);
  const open = airborne ? 1 : a.phase === 'LAND' ? 1 - p : p * .45;
  const strike = a.strikeProgress !== undefined ? Math.min(1, a.strikeProgress * 4 + .25)
    : a.phase === 'STRIKE_ACTIVE' ? Math.min(1, p * 4 + .25) : 0;
  const recoil = a.recoil ? Math.max(0, 1 - (a.tick - a.recoil.tick) / 13) * a.recoil.strength : 0;
  add(out, 'Hips', { py: -.055 * load - .07 * land, rx: airborne ? -.24 - strike * .15 : .12 * load,
    ry: (a.variant === 'left' ? -.12 : .12) * strike, rz: recoil * (a.recoil?.side ?? 1) * .16 });
  add(out, 'Spine', { rx: airborne ? -.18 : .1 * load });
  add(out, 'Chest', { rx: airborne ? -.12 + recoil * .22 : 0 });
  add(out, 'Neck', { rx: airborne ? .28 : -.06 * load });
  add(out, 'Head', { rx: airborne ? .15 : 0 });
  add(out, 'Tail', { rx: -.25 * open, ry: -recoil * .2 });
  add(out, 'WingL', { rz: -(1.1 + flap * .55) * open - recoil * .2, rx: (.3 - flap * .4) * open });
  add(out, 'WingR', { rz: (1.1 + Math.sin(Math.asin(flap) + .18) * .55) * open + recoil * .35, rx: (.3 - flap * .4) * open });
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
