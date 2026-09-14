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

test("playMusic starts a self-scheduling drone+drum loop; stopMusic halts further scheduling", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let oscillatorCount = 0;
  let bufferSourceCount = 0;

  class FakeAudioContext {
    currentTime = 0;
    sampleRate = 44100;
    destination = {};
    createOscillator() {
      oscillatorCount += 1;
      return makeFakeAudioNode();
    }
    createGain() {
      return makeFakeGainNode();
    }
    createBufferSource() {
      bufferSourceCount += 1;
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
    const engine = new AudioEngine(true);
    engine.playMusic();

    const oscAfterFirstLoop = oscillatorCount;
    const noiseAfterFirstLoop = bufferSourceCount;
    assert.ok(oscAfterFirstLoop > 0, "drone oscillators scheduled");
    assert.ok(noiseAfterFirstLoop > 0, "drum hits scheduled");

    // Calling again while already playing must not double-schedule.
    engine.playMusic();
    assert.equal(oscillatorCount, oscAfterFirstLoop);

    // Advance past one full loop — the recursive setTimeout should fire and
    // schedule another loop's worth of drone + drum nodes.
    t.mock.timers.tick(6000);
    assert.ok(oscillatorCount > oscAfterFirstLoop, "second loop's drone scheduled");
    assert.ok(bufferSourceCount > noiseAfterFirstLoop, "second loop's drums scheduled");

    const oscBeforeStop = oscillatorCount;
    engine.stopMusic();

    // After stopping, further time advancement must not schedule any more loops.
    t.mock.timers.tick(20000);
    assert.equal(oscillatorCount, oscBeforeStop, "no further loops scheduled after stopMusic");
  } finally {
    delete (globalThis as Record<string, unknown>).window;
    t.mock.timers.reset();
  }
});

test("playMusic/stopMusic are no-ops (never throw) when no AudioContext exists (SSR/Node)", () => {
  const engine = new AudioEngine(true);
  assert.doesNotThrow(() => engine.playMusic());
  assert.doesNotThrow(() => engine.stopMusic());
});

test("setEnabled(true) lazily resumes music that was requested while disabled", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let oscillatorCount = 0;

  class FakeAudioContext {
    currentTime = 0;
    sampleRate = 44100;
    destination = {};
    createOscillator() {
      oscillatorCount += 1;
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
    // Engine starts disabled; playMusic is requested but blocked until enabled.
    const engine = new AudioEngine(false);
    engine.playMusic();
    assert.equal(oscillatorCount, 0, "music does not start while disabled");

    engine.setEnabled(true);
    assert.ok(oscillatorCount > 0, "music starts once enabled after being requested");

    // Muting/unmuting an already-playing loop must never throw.
    assert.doesNotThrow(() => engine.setEnabled(false));
    assert.doesNotThrow(() => engine.setEnabled(true));
  } finally {
    delete (globalThis as Record<string, unknown>).window;
    t.mock.timers.reset();
  }
});

// --- fake Web Audio node helpers ---------------------------------------

function makeFakeAudioParam() {
  let value = 0;
  return {
    get value() {
      return value;
    },
    setValueAtTime: (v: number) => {
      value = v;
    },
    linearRampToValueAtTime: (v: number) => {
      value = v;
    },
    exponentialRampToValueAtTime: (v: number) => {
      value = v;
    },
    cancelScheduledValues: () => {},
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
