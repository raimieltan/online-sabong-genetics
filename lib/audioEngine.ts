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

  private musicPlaying = false;
  private musicRequested = false;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicMasterGain: GainNode | null = null;

  private static readonly MUSIC_BPM = 96;
  private static readonly MUSIC_LOOP_BEATS = 8;
  private static readonly MUSIC_GAIN = 0.09;
  // How far ahead of a loop boundary the next loop's notes get scheduled —
  // keeps the (real) Web Audio clock gapless regardless of setTimeout jitter.
  private static readonly MUSIC_LOOKAHEAD = 0.15;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && this.musicRequested && !this.musicPlaying) {
      this.playMusic();
      return;
    }
    this.applyMusicGain();
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
    this.createFilteredNoiseBurst(ctx, ctx.destination, ctx.currentTime, {
      freq: 3000,
      q: 1,
      duration: 0.05,
      gain: 0.15,
    });
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

  /** Starts (or resumes) a looping ambient arena drone + war-drum bed. Safe to call repeatedly. */
  playMusic(): void {
    this.musicRequested = true;
    if (this.musicPlaying) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(AudioEngine.MUSIC_GAIN, ctx.currentTime + 1.5);
      master.connect(ctx.destination);
      this.musicMasterGain = master;
      this.musicPlaying = true;

      const beat = 60 / AudioEngine.MUSIC_BPM;
      const loopDuration = beat * AudioEngine.MUSIC_LOOP_BEATS;

      const scheduleLoop = (startAt: number) => {
        if (!this.musicPlaying) return;
        this.scheduleMusicDrone(ctx, master, startAt, loopDuration);
        this.scheduleMusicDrums(ctx, master, startAt, beat);

        const nextStart = startAt + loopDuration;
        const delayMs = Math.max(0, (nextStart - ctx.currentTime - AudioEngine.MUSIC_LOOKAHEAD) * 1000);
        this.musicTimer = setTimeout(() => scheduleLoop(nextStart), delayMs);
      };

      scheduleLoop(ctx.currentTime + 0.05);
    } catch {
      this.musicPlaying = false;
      // no-op
    }
  }

  /** Stops the music loop and fades it out. Idempotent. */
  stopMusic(): void {
    this.musicRequested = false;
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }

    const ctx = this.context;
    const master = this.musicMasterGain;
    if (ctx && master) {
      try {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 0.4);
      } catch {
        // no-op
      }
    }
    this.musicMasterGain = null;
  }

  /** Fades the music bed to match the current enabled/disabled (mute) state. */
  private applyMusicGain(): void {
    const ctx = this.context;
    const master = this.musicMasterGain;
    if (!ctx || !master) return;
    try {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(this.enabled ? AudioEngine.MUSIC_GAIN : 0, now + 0.25);
    } catch {
      // no-op
    }
  }

  /** Two slightly detuned low oscillators sustained for one loop — a rumbling arena drone bed. */
  private scheduleMusicDrone(ctx: AudioContext, dest: GainNode, startAt: number, duration: number): void {
    try {
      [55, 55.6].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const peak = i === 0 ? 0.5 : 0.3;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(peak, startAt + 0.6);
        gain.gain.setValueAtTime(peak, startAt + duration - 0.4);
        gain.gain.linearRampToValueAtTime(0, startAt + duration);
        osc.connect(gain).connect(dest);
        osc.start(startAt);
        osc.stop(startAt + duration);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      });
    } catch {
      // no-op
    }
  }

  /** War-drum pulse: a low thump every beat, a sharper accent on the backbeat. */
  private scheduleMusicDrums(ctx: AudioContext, dest: GainNode, startAt: number, beat: number): void {
    for (let i = 0; i < AudioEngine.MUSIC_LOOP_BEATS; i++) {
      const t = startAt + i * beat;
      const accent = i === 2 || i === 6;
      this.createFilteredNoiseBurst(ctx, dest, t, {
        freq: accent ? 220 : 90,
        q: accent ? 2 : 1,
        duration: accent ? 0.12 : 0.18,
        gain: accent ? 0.5 : 0.6,
      });
    }
  }

  /** Shared bandpass-filtered noise burst — used for whiffed-attack "miss" whooshes and war-drum hits. */
  private createFilteredNoiseBurst(
    ctx: AudioContext,
    dest: AudioNode,
    startAt: number,
    { freq, q, duration, gain }: { freq: number; q: number; duration: number; gain: number }
  ): void {
    try {
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
      filter.frequency.setValueAtTime(freq, startAt);
      filter.Q.setValueAtTime(q, startAt);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gain, startAt);
      gainNode.gain.linearRampToValueAtTime(0, startAt + duration);

      noise.connect(filter).connect(gainNode).connect(dest);
      noise.start(startAt);
      noise.stop(startAt + duration);
      noise.onended = () => {
        noise.disconnect();
        filter.disconnect();
        gainNode.disconnect();
      };
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
