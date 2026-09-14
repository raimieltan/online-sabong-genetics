import assert from 'node:assert/strict';
import test from 'node:test';

import { applyTellPosture, tellPostureCue, TellPostureBlender } from '../animation/tellPosture';
import { BONE_NAMES, makePose } from '../animation/types';
import { READ_TELL_TYPES } from '../combat-v2/tells';

const poseMagnitude = (pose: ReturnType<typeof makePose>) => BONE_NAMES.reduce((sum, bone) => {
  const delta = pose[bone];
  return sum + Math.abs(delta.rx) + Math.abs(delta.ry) + Math.abs(delta.rz)
    + Math.abs(delta.px) + Math.abs(delta.py) + Math.abs(delta.pz);
}, 0);

test('every canonical tell has an embodied anatomical pose', () => {
  assert.equal(READ_TELL_TYPES.length, 12);
  for (const type of READ_TELL_TYPES) {
    const pose = makePose();
    applyTellPosture(pose, type, 1, 'right');
    assert.ok(poseMagnitude(pose) > .04, `${type} must visibly alter the rig`);
  }
});

test('launch-critical tells produce their intended silhouette families', () => {
  const forward = makePose();
  const loaded = makePose();
  const low = makePose();
  const breath = makePose();
  const recovery = makePose();
  const overextended = makePose();
  applyTellPosture(forward, 'weight_forward', 1, 'right');
  applyTellPosture(loaded, 'rear_leg_loaded', 1, 'right');
  applyTellPosture(low, 'head_low', 1, 'right');
  applyTellPosture(breath, 'hesitating', 1, 'right');
  applyTellPosture(recovery, 'recovering', 1, 'right');
  applyTellPosture(overextended, 'overextended', 1, 'right');

  assert.ok(forward.Chest.px > 0 && forward.Neck.px > 0);
  assert.ok(loaded.ThighR.rx < loaded.ThighL.rx);
  assert.ok(low.Head.py < 0 && low.Head.rx > 0);
  assert.ok(breath.Chest.py > 0);
  assert.ok(recovery.Hips.px < 0 && recovery.Chest.rx > 0);
  assert.ok(overextended.Chest.px > forward.Chest.px);
});

test('strength scales anatomical and root cues without exceeding bounds', () => {
  const half = makePose();
  const full = makePose();
  applyTellPosture(half, 'side_on_stance', .5, 'right');
  applyTellPosture(full, 'side_on_stance', 2, 'right');
  assert.ok(Math.abs(poseMagnitude(half) * 2 - poseMagnitude(full)) < 1e-12);
  assert.deepEqual(tellPostureCue('weight_forward', -1, 'left'), { rot: 0, scaleY: 1, yawOffset: 0 });
  assert.equal(tellPostureCue('side_on_stance', 2, 'left').yawOffset, .18);
});

test('facing mirrors lateral cues and selects the anatomically rear leg', () => {
  const right = makePose();
  const left = makePose();
  applyTellPosture(right, 'angle_shift', 1, 'right');
  applyTellPosture(left, 'angle_shift', 1, 'left');
  assert.equal(right.Hips.ry, -left.Hips.ry);
  assert.equal(right.Head.ry, -left.Head.ry);
  assert.equal(tellPostureCue('angle_shift', 1, 'left').yawOffset, -tellPostureCue('angle_shift', 1, 'right').yawOffset);

  const rearRight = makePose();
  const rearLeft = makePose();
  applyTellPosture(rearRight, 'rear_leg_loaded', 1, 'right');
  applyTellPosture(rearLeft, 'rear_leg_loaded', 1, 'left');
  assert.equal(rearRight.ThighR.rx, rearLeft.ThighL.rx);
  assert.equal(rearRight.ThighL.rx, rearLeft.ThighR.rx);
});

test('tell posture ramps and clears smoothly instead of snapping', () => {
  const blender = new TellPostureBlender();
  const first = blender.update({ type: 'weight_forward', strength: 1 }, 1 / 60);
  assert.ok(first[0].strength > 0 && first[0].strength < 1);
  let active = first;
  for (let frame = 0; frame < 60; frame++) active = blender.update({ type: 'weight_forward', strength: 1 }, 1 / 60);
  assert.ok(active[0].strength > .99);

  const firstClear = blender.update(null, 1 / 60);
  assert.ok(firstClear[0].strength > 0 && firstClear[0].strength < active[0].strength);
  let cleared = firstClear;
  for (let frame = 0; frame < 90; frame++) cleared = blender.update(null, 1 / 60);
  assert.deepEqual(cleared, []);
});

test('tell transitions crossfade and are frame-rate independent', () => {
  const transition = new TellPostureBlender();
  for (let frame = 0; frame < 30; frame++) transition.update({ type: 'weight_forward', strength: .8 }, 1 / 60);
  const crossed = transition.update({ type: 'angle_shift', strength: .9 }, 1 / 60);
  assert.deepEqual(crossed.map(item => item.type), ['angle_shift', 'weight_forward']);
  assert.ok(crossed.find(item => item.type === 'angle_shift')!.strength > 0);
  assert.ok(crossed.find(item => item.type === 'weight_forward')!.strength > 0);

  const sixtyFps = new TellPostureBlender();
  const thirtyFps = new TellPostureBlender();
  let sixty = sixtyFps.update({ type: 'head_low', strength: .75 }, 0);
  let thirty = thirtyFps.update({ type: 'head_low', strength: .75 }, 0);
  for (let frame = 0; frame < 60; frame++) sixty = sixtyFps.update({ type: 'head_low', strength: .75 }, 1 / 60);
  for (let frame = 0; frame < 30; frame++) thirty = thirtyFps.update({ type: 'head_low', strength: .75 }, 1 / 30);
  assert.ok(Math.abs(sixty[0].strength - thirty[0].strength) < 1e-12);
});
