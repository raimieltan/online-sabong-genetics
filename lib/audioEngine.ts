type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as typeof window & { webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** Ascending arpeggio: C4, E4, G4, C5. */
const VICTORY_FREQUENCIES = [130, 164, 196, 262] as const;

/** Browser-safe Web Audio synthesis engine — zero external audio assets. */
export class AudioEngine {
  private enabled: boolean;
  private context: AudioContext | null = null;
  private contextFailed = false;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  playHit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      this.startAndStop(osc, gain, now, 0.1);
    } catch {
      // no-op
    }
  }

  playCrit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [250, 500].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        this.startAndStop(osc, gain, now, 0.15);
      });
    } catch {
      // no-op
    }
  }

  playMiss(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const duration = 0.05;
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(3000, now);
      filter.Q.setValueAtTime(1, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(now);
      noise.stop(now + duration);
      noise.onended = () => {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    } catch {
      // no-op
    }
  }

  playFatigue(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(40, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      this.startAndStop(osc, gain, now, 0.3);
    } catch {
      // no-op
    }
  }

  playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const noteDuration = 0.2;
      VICTORY_FREQUENCIES.forEach((freq, index) => {
        const start = ctx.currentTime + index * noteDuration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.linearRampToValueAtTime(0, start + noteDuration);
        osc.connect(gain).connect(ctx.destination);
        this.startAndStop(osc, gain, start, noteDuration);
      });
    } catch {
      // no-op
    }
  }

  private startAndStop(
    osc: OscillatorNode,
    gain: GainNode,
    start: number,
    duration: number
  ): void {
    osc.start(start);
    osc.stop(start + duration);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  /** Lazily creates the AudioContext on first use, after a user gesture. Never throws. */
  private ensureContext(): AudioContext | null {
    if (!this.enabled || this.contextFailed) return null;
    if (this.context) return this.context;

    try {
      const Ctor = getAudioContextCtor();
      if (!Ctor) {
        this.contextFailed = true;
        return null;
      }
      this.context = new Ctor();
      return this.context;
    } catch {
      this.contextFailed = true;
      return null;
    }
  }
}
