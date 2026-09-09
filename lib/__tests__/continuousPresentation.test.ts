import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProceduralAnimationController } from '../animation/ProceduralAnimationController';
import { NEUTRAL_GAINS } from '../animation/types';

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
