import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProceduralAnimationController } from '../animation/ProceduralAnimationController';
import { NEUTRAL_GAINS } from '../animation/types';
import { makePose } from '../animation/types';
import { applyTacticalPosture } from '../animation/animations/tacticalPosture';

test('V2 simulation poses override unfinished clip priorities and animation completion', () => {
  const c = new ProceduralAnimationController({}, { gains: NEUTRAL_GAINS, facing: 'right' });
  c.play({ state: 'heavy_kick', startedAt: 0, speed: 1, facing: 'right' });
  const frame = { dt: 1 / 60, now: 100, speed: 0, velX: 0, velZ: 0, velY: 0, aimYaw: 0 };
  c.update({ ...frame, simulationIntent: { state: 'stagger', startedAt: 1, speed: 1, facing: 'right', simulationProgress: .1 } });
  assert.equal(c.state, 'stagger');
  c.update({ ...frame, simulationIntent: { state: 'ready', startedAt: 2, speed: 1, facing: 'right', simulationProgress: 0 } });
  assert.equal(c.state, 'ready');
  for (let i = 0; i < 100; i++) c.update({ ...frame, simulationIntent: { state: 'peck_attack', startedAt: 3, speed: 1, facing: 'right', simulationProgress: .6 } });
  assert.equal(c.state, 'peck_attack');
});

test('V1 animation priority still rejects low-priority interruptions', () => {
  const c = new ProceduralAnimationController({}, { gains: NEUTRAL_GAINS, facing: 'right' });
  c.play({ state: 'heavy_kick', startedAt: 0, speed: 1, facing: 'right' });
  c.play({ state: 'ready', startedAt: 1, speed: 1, facing: 'right' });
  assert.equal(c.state, 'heavy_kick');
});

test('temporary tactical postures have unmistakably different silhouettes', () => {
  const ctx = { stateTime: 0, t: 0, dt: 1 / 60, now: 0, gains: NEUTRAL_GAINS, facing: 'right' as const, speed: 0, velX: 0, velZ: 0, velY: 0, wingFlapIntensity: 0, aimYaw: 0, alive: true };
  const pressure = makePose(), counter = makePose(), guard = makePose(), recover = makePose();
  applyTacticalPosture('pressure', 'ready', ctx, pressure);
  applyTacticalPosture('counter', 'ready', ctx, counter);
  applyTacticalPosture('defensive', 'ready', ctx, guard);
  applyTacticalPosture('recover', 'ready', ctx, recover);
  assert.ok(pressure.Hips.px > 0 && counter.Hips.px < 0);
  assert.ok(guard.Hips.py < pressure.Hips.py);
  assert.ok(guard.WingL.rz < pressure.WingL.rz);
  assert.ok(recover.Head.rx > counter.Head.rx);
});
