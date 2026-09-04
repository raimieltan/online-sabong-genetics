import test from "node:test";
import assert from "node:assert/strict";

// These run under plain Node (no `window`), which is exactly the SSR case
// storage.ts must degrade gracefully for. We also install a minimal fake
// `window.localStorage` to exercise the "browser" code paths in the same
// process, then tear it down.

test("loadCredits/saveCredits/loadAudioEnabled/saveAudioEnabled never throw without window (SSR)", async () => {
  assert.equal(typeof (globalThis as Record<string, unknown>).window, "undefined");

  const storage = await import("../storage");

  assert.doesNotThrow(() => storage.saveCredits(1234));
  assert.doesNotThrow(() => storage.saveAudioEnabled(true));
  assert.equal(storage.loadCredits(), 5000);
  assert.equal(storage.loadAudioEnabled(), false);
});

test("credits and audio preference round-trip through a fake localStorage", async () => {
  const store = new Map<string, string>();
  const fakeLocalStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;

  (globalThis as Record<string, unknown>).window = { localStorage: fakeLocalStorage };

  try {
    const storage = await import("../storage");

    assert.equal(storage.loadCredits(), 5000);
    storage.saveCredits(7500);
    assert.equal(storage.loadCredits(), 7500);
    assert.equal(store.get("rooster_arena_credits"), "7500");

    assert.equal(storage.loadAudioEnabled(), false);
    storage.saveAudioEnabled(true);
    assert.equal(storage.loadAudioEnabled(), true);
    assert.equal(store.get("rooster_arena_audio_enabled"), "true");

    storage.saveAudioEnabled(false);
    assert.equal(storage.loadAudioEnabled(), false);
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
});

test("loadCredits falls back to default when storage throws", async () => {
  const throwingLocalStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;

  (globalThis as Record<string, unknown>).window = { localStorage: throwingLocalStorage };

  try {
    const storage = await import("../storage");
    assert.equal(storage.loadCredits(), 5000);
    assert.doesNotThrow(() => storage.saveCredits(999));
    assert.equal(storage.loadAudioEnabled(), false);
    assert.doesNotThrow(() => storage.saveAudioEnabled(true));
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
});
