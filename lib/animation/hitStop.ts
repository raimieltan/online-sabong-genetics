/**
 * Centralized hit-stop controller (spec §8 / §9).
 *
 * On impact the battle *presentation* freezes for a few dozen milliseconds so
 * a heavy hit reads as violent instead of sliding past. This is a virtual
 * clock, not a real freeze: `requestAnimationFrame` keeps running, React keeps
 * rendering, unrelated timers keep ticking. Only code that reads `now()` from
 * this controller (the battle timeline, the choreography clock, the camera
 * director, the VFX spawner) is held still.
 *
 * Model: virtual = raw − (total real time spent frozen). Each `tick` measures
 * how much of the frame's real delta fell inside an active freeze window and
 * adds it to that accumulator, so the virtual clock loses *exactly* the freeze
 * duration regardless of frame timing.
 *
 * Usage each frame:
 *   hitStop.tick(rawNowMs);
 *   const now = hitStop.now();        // virtual ms — flat during a freeze
 * On impact:
 *   hitStop.trigger(seconds, rawNowMs);
 */
export class HitStopController {
  private accumFrozenMs = 0;
  private freezeStartRaw = 0;
  private freezeEndRaw = 0;
  private rawNow = 0;
  private lastRaw = -1;
  private lastTriggerVirtual = -Infinity;

  /** Advance the virtual clock. Call once at the top of every frame. */
  tick(rawNowMs: number): void {
    if (this.lastRaw < 0) this.lastRaw = rawNowMs;
    // Portion of [lastRaw, rawNowMs] that overlaps the active freeze window.
    const lo = Math.max(this.lastRaw, this.freezeStartRaw);
    const hi = Math.min(rawNowMs, this.freezeEndRaw);
    if (hi > lo) this.accumFrozenMs += hi - lo;
    this.lastRaw = rawNowMs;
    this.rawNow = rawNowMs;
  }

  /** Virtual timestamp (ms). Flat while a freeze is active. */
  now(): number {
    return this.rawNow - this.accumFrozenMs;
  }

  /** True while a freeze is currently holding the clock. */
  get frozen(): boolean {
    return this.rawNow < this.freezeEndRaw;
  }

  /** Seconds of freeze still remaining (0 when not frozen). */
  get remaining(): number {
    return this.frozen ? (this.freezeEndRaw - this.rawNow) / 1000 : 0;
  }

  /**
   * Freeze presentation for `seconds`. `rawNowMs` is the real timestamp of the
   * impact frame. A second trigger while already frozen extends to whichever
   * end is later (back-to-back hits don't cut each other short).
   */
  trigger(seconds: number, rawNowMs: number): void {
    if (seconds <= 0) return;
    const endRaw = rawNowMs + seconds * 1000;
    if (endRaw <= this.freezeEndRaw) return; // already frozen at least this long
    if (rawNowMs >= this.freezeEndRaw) this.freezeStartRaw = rawNowMs; // fresh freeze
    this.freezeEndRaw = endRaw;
    this.lastTriggerVirtual = this.now();
  }

  /** Virtual ms of the most recent trigger — handy for debug overlays. */
  get lastTriggerAt(): number {
    return this.lastTriggerVirtual;
  }

  /** Drop any active freeze (edge cases: battle ends mid-freeze, unmount). */
  clear(): void {
    this.freezeEndRaw = this.rawNow;
  }

  reset(): void {
    this.accumFrozenMs = 0;
    this.freezeStartRaw = 0;
    this.freezeEndRaw = 0;
    this.lastRaw = -1;
    this.lastTriggerVirtual = -Infinity;
  }
}
