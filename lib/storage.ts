const CREDIT_KEY = "rooster_arena_credits";
const AUDIO_KEY = "rooster_arena_audio_enabled";
const DEFAULT_CREDITS = 5000;

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Some browsers throw just accessing localStorage (privacy mode, blocked storage).
    return null;
  }
}

export function loadCredits(): number {
  const storage = getStorage();
  if (!storage) return DEFAULT_CREDITS;
  try {
    const raw = storage.getItem(CREDIT_KEY);
    if (raw === null) return DEFAULT_CREDITS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULT_CREDITS;
  } catch {
    return DEFAULT_CREDITS;
  }
}

export function saveCredits(credits: number): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CREDIT_KEY, String(credits));
  } catch {
    // Blocked/full storage — silently no-op, credits stay session-only.
  }
}

export function loadAudioEnabled(): boolean {
  const storage = getStorage();
  if (!storage) return false; // muted by default
  try {
    return storage.getItem(AUDIO_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveAudioEnabled(enabled: boolean): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(AUDIO_KEY, String(enabled));
  } catch {
    // Blocked/full storage — silently no-op.
  }
}
