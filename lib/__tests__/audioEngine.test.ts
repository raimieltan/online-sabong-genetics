import test from "node:test";
import assert from "node:assert/strict";

import { AudioEngine } from "../audioEngine";

test("constructor sets enabled state and getEnabled/setEnabled work", () => {
  const engine = new AudioEngine(false);
  assert.equal(engine.getEnabled(), false);
  engine.setEnabled(true);
  assert.equal(engine.getEnabled(), true);
});

test("all play* methods are no-ops (never throw) when no AudioContext exists (SSR/Node)", () => {
  assert.equal(typeof (globalThis as Record<string, unknown>).window, "undefined");

  const engine = new AudioEngine(true);
  assert.doesNotThrow(() => engine.playHit());
  assert.doesNotThrow(() => engine.playCrit());
  assert.doesNotThrow(() => engine.playMiss());
  assert.doesNotThrow(() => engine.playFatigue());
  assert.doesNotThrow(() => engine.playVictory());
});

test("play* methods no-op when disabled, even if an AudioContext is available", () => {
  let createOscillatorCalls = 0;

  class FakeAudioContext {
    currentTime = 0;
    sampleRate = 44100;
    destination = {};
    createOscillator() {
      createOscillatorCalls += 1;
      return makeFakeAudioNode();
    }
    createGain() {
      return makeFakeGainNode();
    }
    createBufferSource() {
      return makeFakeAudioNode();
    }
    createBuffer(_channels: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBiquadFilter() {
      return makeFakeFilterNode();
    }
  }

  (globalThis as Record<string, unknown>).window = { AudioContext: FakeAudioContext };

  try {
    const engine = new AudioEngine(false);
    engine.playHit();
    assert.equal(createOscillatorCalls, 0);
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
});

test("play* methods synthesize sound via a fake AudioContext without throwing", () => {
  const events: string[] = [];

  class FakeAudioContext {
    currentTime = 0;
    sampleRate = 44100;
    destination = {};
    createOscillator() {
      events.push("createOscillator");
      return makeFakeAudioNode();
    }
    createGain() {
      events.push("createGain");
      return makeFakeGainNode();
    }
    createBufferSource() {
      events.push("createBufferSource");
      return makeFakeAudioNode();
    }
    createBuffer(_channels: number, length: number) {
      events.push("createBuffer");
      return { getChannelData: () => new Float32Array(length) };
    }
    createBiquadFilter() {
      events.push("createBiquadFilter");
      return makeFakeFilterNode();
    }
  }

  (globalThis as Record<string, unknown>).window = { AudioContext: FakeAudioContext };

  try {
    const engine = new AudioEngine(true);
    assert.doesNotThrow(() => engine.playHit());
    assert.doesNotThrow(() => engine.playCrit());
    assert.doesNotThrow(() => engine.playMiss());
    assert.doesNotThrow(() => engine.playFatigue());
    assert.doesNotThrow(() => engine.playVictory());

    assert.ok(events.includes("createOscillator"));
    assert.ok(events.includes("createGain"));
    assert.ok(events.includes("createBufferSource"));
    assert.ok(events.includes("createBiquadFilter"));
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
});

test("a throwing AudioContext constructor is caught and future calls stay no-ops", () => {
  class ThrowingAudioContext {
    constructor() {
      throw new Error("no audio hardware");
    }
  }

  (globalThis as Record<string, unknown>).window = { AudioContext: ThrowingAudioContext };

  try {
    const engine = new AudioEngine(true);
    assert.doesNotThrow(() => engine.playHit());
    assert.doesNotThrow(() => engine.playVictory());
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
});

// --- fake Web Audio node helpers ---------------------------------------

function makeFakeAudioParam() {
  return {
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
  };
}

function makeFakeAudioNode() {
  const node: Record<string, unknown> = {
    frequency: makeFakeAudioParam(),
    buffer: null,
    onended: null,
    connect: () => node,
    disconnect: () => {},
    start: () => {},
    stop: () => {},
  };
  return node;
}

function makeFakeGainNode() {
  const node: Record<string, unknown> = {
    gain: makeFakeAudioParam(),
    connect: () => node,
    disconnect: () => {},
  };
  return node;
}

function makeFakeFilterNode() {
  const node: Record<string, unknown> = {
    frequency: makeFakeAudioParam(),
    Q: makeFakeAudioParam(),
    type: "bandpass",
    connect: () => node,
    disconnect: () => {},
  };
  return node;
}
