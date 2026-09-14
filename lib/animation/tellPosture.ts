import type { ReadTellType } from '../combat-v2/types';
import { add, addPair, type PoseMap } from './types';

export type TellPostureCue = { rot: number; scaleY: number; yawOffset: number };
export type ActiveTellPosture = { type: ReadTellType; strength: number };

type TellPoseDefinition = {
  root?: { rot?: number; scaleY?: number; yaw?: number };
  apply: (pose: PoseMap, amount: number, facingSign: number) => void;
};

const TELL_POSES: Record<ReadTellType, TellPoseDefinition> = {
  weight_forward: {
    root: { rot: .05 },
    apply: (pose, k) => {
      add(pose, 'Hips', { px: .055 * k, rx: -.035 * k });
      add(pose, 'Chest', { px: .075 * k, rx: -.08 * k });
      add(pose, 'Neck', { px: .06 * k, rx: -.09 * k });
      add(pose, 'Head', { px: .035 * k, rx: .04 * k });
      add(pose, 'Tail', { px: -.045 * k, rx: .08 * k });
      addPair(pose, 'Foot', { rx: -.035 * k });
    },
  },
  closing_distance: {
    root: { rot: .035 },
    apply: (pose, k) => {
      add(pose, 'Hips', { px: .075 * k, py: -.025 * k });
      add(pose, 'Spine', { rx: -.06 * k });
      add(pose, 'Chest', { px: .065 * k, rx: -.08 * k });
      add(pose, 'Neck', { px: .07 * k, rx: -.07 * k });
      add(pose, 'Tail', { rx: .1 * k });
      addPair(pose, 'Thigh', { rx: -.045 * k });
    },
  },
  wing_adjust: {
    apply: (pose, k) => {
      add(pose, 'WingL', { rz: -.22 * k, rx: .05 * k });
      add(pose, 'WingR', { rz: .22 * k, rx: .05 * k });
      add(pose, 'WingL_Mid', { rz: -.12 * k });
      add(pose, 'WingR_Mid', { rz: .12 * k });
      add(pose, 'Chest', { py: .025 * k });
    },
  },
  head_low: {
    root: { rot: .06 },
    apply: (pose, k) => {
      add(pose, 'Spine', { rx: .055 * k });
      add(pose, 'Chest', { rx: .08 * k });
      add(pose, 'Neck', { rx: .17 * k, py: -.035 * k });
      add(pose, 'Head', { rx: .2 * k, py: -.045 * k });
      add(pose, 'Tail', { rx: -.08 * k });
    },
  },
  guard_open: {
    root: { scaleY: -.015 },
    apply: (pose, k) => {
      add(pose, 'WingL', { rz: -.28 * k });
      add(pose, 'WingR', { rz: .28 * k });
      add(pose, 'Chest', { rx: .07 * k });
      add(pose, 'Hips', { py: -.045 * k });
      addPair(pose, 'Foot', { rz: .06 * k });
    },
  },
  rear_leg_loaded: {
    root: { scaleY: -.03, rot: -.02 },
    apply: (pose, k, sign) => {
      add(pose, 'Hips', { py: -.07 * k, rx: .06 * k });
      add(pose, sign > 0 ? 'ThighR' : 'ThighL', { rx: -.2 * k, py: -.025 * k });
      add(pose, sign > 0 ? 'ShankR' : 'ShankL', { rx: .22 * k });
      add(pose, sign > 0 ? 'FootR' : 'FootL', { rx: -.12 * k });
      add(pose, sign > 0 ? 'ThighL' : 'ThighR', { rx: .07 * k });
      add(pose, 'Tail', { rx: -.12 * k });
    },
  },
  hesitating: {
    apply: (pose, k) => {
      add(pose, 'Chest', { py: .045 * k, rx: -.035 * k });
      add(pose, 'Neck', { py: .025 * k, rx: .055 * k });
      add(pose, 'Head', { ry: .055 * k });
      add(pose, 'WingL', { rz: -.07 * k });
      add(pose, 'WingR', { rz: .07 * k });
    },
  },
  recovering: {
    root: { rot: -.03, scaleY: .015 },
    apply: (pose, k) => {
      add(pose, 'Hips', { px: -.055 * k, py: -.035 * k });
      add(pose, 'Spine', { rx: .08 * k });
      add(pose, 'Chest', { py: .055 * k, rx: .12 * k });
      add(pose, 'Neck', { rx: .11 * k });
      add(pose, 'Head', { rx: .13 * k });
      add(pose, 'Tail', { rx: -.12 * k });
      add(pose, 'WingL', { rz: .08 * k });
      add(pose, 'WingR', { rz: -.08 * k });
    },
  },
  angle_shift: {
    root: { yaw: .12 },
    apply: (pose, k, sign) => {
      add(pose, 'Hips', { ry: .18 * k * sign, pz: .035 * k * sign });
      add(pose, 'Spine', { ry: -.08 * k * sign });
      add(pose, 'Chest', { ry: -.12 * k * sign });
      add(pose, 'Neck', { ry: .14 * k * sign });
      add(pose, 'Head', { ry: .2 * k * sign });
    },
  },
  side_on_stance: {
    root: { yaw: .18 },
    apply: (pose, k, sign) => {
      add(pose, 'Hips', { ry: .26 * k * sign, px: -.035 * k });
      add(pose, 'Spine', { ry: .1 * k * sign });
      add(pose, 'Chest', { ry: .14 * k * sign });
      add(pose, 'Neck', { ry: -.18 * k * sign });
      add(pose, 'Head', { ry: -.24 * k * sign });
      add(pose, 'Tail', { ry: -.16 * k * sign });
    },
  },
  overextended: {
    root: { rot: .08, scaleY: -.02 },
    apply: (pose, k) => {
      add(pose, 'Hips', { px: .1 * k, py: -.04 * k, rx: -.08 * k });
      add(pose, 'Spine', { rx: -.12 * k });
      add(pose, 'Chest', { px: .09 * k, rx: -.14 * k });
      add(pose, 'Neck', { px: .11 * k, rx: -.12 * k });
      add(pose, 'Head', { px: .08 * k });
      add(pose, 'Tail', { px: -.08 * k, rx: .14 * k });
    },
  },
  resetting: {
    root: { rot: -.02 },
    apply: (pose, k, sign) => {
      add(pose, 'Hips', { px: -.035 * k, py: -.025 * k, ry: .05 * k * sign });
      add(pose, 'Chest', { rx: .045 * k, ry: -.04 * k * sign });
      add(pose, 'Head', { ry: .08 * k * sign });
      add(pose, 'Tail', { rx: -.07 * k });
      add(pose, 'FootL', { px: .025 * k, rz: .035 * k });
      add(pose, 'FootR', { px: -.025 * k, rz: -.035 * k });
    },
  },
};

const clampStrength = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function tellPostureCue(type: ReadTellType | null | undefined, strength: number, side: 'left' | 'right'): TellPostureCue {
  const definition = type ? TELL_POSES[type]?.root : undefined;
  const amount = clampStrength(strength);
  return {
    rot: (definition?.rot ?? 0) * amount,
    scaleY: 1 + (definition?.scaleY ?? 0) * amount,
    yawOffset: (definition?.yaw ?? 0) * amount * (side === 'left' ? 1 : -1),
  };
}

export function applyTellPosture(pose: PoseMap, type: ReadTellType, strength: number, facing: 'left' | 'right'): void {
  const amount = clampStrength(strength);
  if (amount <= 0) return;
  TELL_POSES[type].apply(pose, amount, facing === 'right' ? 1 : -1);
}

export class TellPostureBlender {
  private readonly weights = new Map<ReadTellType, number>();

  update(target: ActiveTellPosture | null | undefined, dt: number): ActiveTellPosture[] {
    const safeDt = Math.max(0, Math.min(1 / 15, Number.isFinite(dt) ? dt : 0));
    const targetStrength = target ? clampStrength(target.strength) : 0;
    const types = new Set<ReadTellType>(this.weights.keys());
    if (target) types.add(target.type);

    for (const type of types) {
      const current = this.weights.get(type) ?? 0;
      const desired = target?.type === type ? targetStrength : 0;
      const rate = desired > current ? 10 : 7;
      const next = current + (desired - current) * (1 - Math.exp(-rate * safeDt));
      if (next < .001 && desired === 0) this.weights.delete(type);
      else this.weights.set(type, next);
    }

    return [...this.weights]
      .map(([type, strength]) => ({ type, strength }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }
}
