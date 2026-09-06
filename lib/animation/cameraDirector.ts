/**
 * Camera director (spec §20 / §21 / §22).
 *
 * Turns discrete battle events ("heavy impact", "knockdown", "victory") into a
 * smooth, damped camera. No Three.js here so it stays unit-testable — the R3F
 * layer (BattleStage3D) reads `position` / `lookAt` / `fov` / `shake` each
 * frame and copies them onto the real camera.
 *
 * Rules enforced here:
 *  - every framing change eases (damped), never snaps
 *  - shake is a decaying impulse, only added on meaningful impacts
 *  - the base move is a slow front-arc orbit; cues bias radius / height / look
 *    target and add a short push-in that decays back to neutral
 */

import { clamp, damp } from "./math";

export type CameraCueName =
  | "battle_start"
  | "approach"
  | "attack"
  | "impact_light"
  | "impact_heavy"
  | "critical"
  | "knockback"
  | "knockdown"
  | "death"
  | "victory"
  | "neutral";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Per-cue framing bias, all relative to the neutral orbit. */
interface CueFraming {
  /** Multiplier on orbit radius (distance from stage centre). <1 = closer. */
  radiusMul: number;
  /** Added to orbit height (world units). */
  heightAdd: number;
  /** Added to fov (degrees). Negative = zoom in. */
  fovAdd: number;
  /** 0 = look at stage centre, +1 = look fully at the "focus" fighter. */
  focusBias: number;
  /** Extra transient push-in applied on cue entry, decays out over `pushDecay` s. */
  pushIn: number;
  pushDecay: number;
  /** Auto-fired shake on cue entry. */
  shake?: CameraImpulse;
}

export interface CameraImpulse {
  strength: number;
  duration: number;
  frequency: number;
}

const NEUTRAL: CueFraming = { radiusMul: 1, heightAdd: 0, fovAdd: 0, focusBias: 0, pushIn: 0, pushDecay: 1 };

const CUES: Record<CameraCueName, CueFraming> = {
  battle_start: { radiusMul: 1.28, heightAdd: 0.55, fovAdd: 4, focusBias: 0, pushIn: 0, pushDecay: 1.5 },
  approach: { radiusMul: 1.05, heightAdd: 0.1, fovAdd: 0, focusBias: 0.12, pushIn: 0, pushDecay: 1 },
  attack: { radiusMul: 0.94, heightAdd: -0.05, fovAdd: -2, focusBias: 0.3, pushIn: 0.12, pushDecay: 0.5 },
  impact_light: {
    radiusMul: 0.9,
    heightAdd: -0.05,
    fovAdd: -3,
    focusBias: 0.4,
    pushIn: 0.18,
    pushDecay: 0.4,
    shake: { strength: 0.05, duration: 0.16, frequency: 32 },
  },
  impact_heavy: {
    radiusMul: 0.82,
    heightAdd: -0.08,
    fovAdd: -6,
    focusBias: 0.5,
    pushIn: 0.32,
    pushDecay: 0.5,
    shake: { strength: 0.13, duration: 0.28, frequency: 26 },
  },
  critical: {
    radiusMul: 0.72,
    heightAdd: -0.02,
    fovAdd: -9,
    focusBias: 0.62,
    pushIn: 0.42,
    pushDecay: 0.65,
    shake: { strength: 0.2, duration: 0.34, frequency: 22 },
  },
  knockback: { radiusMul: 0.98, heightAdd: 0.05, fovAdd: -1, focusBias: 0.55, pushIn: 0.1, pushDecay: 0.6 },
  knockdown: {
    radiusMul: 1.12,
    heightAdd: 0.35,
    fovAdd: 2,
    focusBias: 0.5,
    pushIn: 0,
    pushDecay: 0.8,
    shake: { strength: 0.09, duration: 0.4, frequency: 18 },
  },
  death: {
    radiusMul: 0.9,
    heightAdd: 0.1,
    fovAdd: -4,
    focusBias: 0.72,
    pushIn: 0.15,
    pushDecay: 1.2,
    shake: { strength: 0.11, duration: 0.45, frequency: 16 },
  },
  victory: { radiusMul: 0.85, heightAdd: 0.15, fovAdd: -3, focusBias: 0.8, pushIn: 0.1, pushDecay: 1.4 },
  neutral: NEUTRAL,
};

export interface CameraDirectorOpts {
  /** Neutral orbit radius (hypot of the idle camera's x/z). */
  radius: number;
  /** Neutral orbit height. */
  height: number;
  /** Neutral fov (deg). */
  fov: number;
  /** ms for one full front-arc orbit sweep. */
  orbitPeriodMs?: number;
  /** rad of half-swing to each side of front-on. */
  orbitArc?: number;
  /** Look-at target when focusBias is 0. */
  center?: Vec3;
}

export class CameraDirector {
  readonly position: Vec3 = { x: 0, y: 0, z: 0 };
  readonly lookAt: Vec3 = { x: 0, y: 0, z: 0 };
  fov: number;

  private opts: Required<CameraDirectorOpts>;
  private cue: CameraCueName = "battle_start";
  private framing: CueFraming = { ...CUES.battle_start };

  // Damped current framing scalars.
  private curRadiusMul = 1;
  private curHeightAdd = 0;
  private curFovAdd = 0;
  private curFocusBias = 0;
  private push = 0;
  private pushDecay = 1;

  // Shake state.
  private shakeStrength = 0;
  private shakeElapsed = 0;
  private shakeDuration = 0;
  private shakeFreq = 20;
  private shakePhase = Math.random() * 1000;
  readonly shake: Vec3 = { x: 0, y: 0, z: 0 };

  // Focus point the camera biases toward (usually the defender / loser / winner).
  private focus: Vec3 = { x: 0, y: 0, z: 0 };
  private focusTarget: Vec3 = { x: 0, y: 0, z: 0 };
  private hasExplicitFocus = false;

  private elapsedMs = 0;

  constructor(opts: CameraDirectorOpts) {
    this.opts = {
      orbitPeriodMs: 24000,
      orbitArc: 1.15,
      center: { x: 0, y: -0.15, z: 0 },
      ...opts,
    };
    this.fov = opts.fov;
  }

  /** Change the active cue. Re-entering the same cue re-fires its push-in / shake. */
  setCue(name: CameraCueName, focus?: Vec3): void {
    this.cue = name;
    this.framing = CUES[name] ?? NEUTRAL;
    this.push = this.framing.pushIn;
    this.pushDecay = Math.max(0.05, this.framing.pushDecay);
    this.hasExplicitFocus = false;
    if (focus) this.setFocus(focus);
    if (this.framing.shake) this.addImpulse(this.framing.shake);
  }

  get currentCue(): CameraCueName {
    return this.cue;
  }

  /** Point the camera should bias toward while `focusBias` > 0. */
  setFocus(p: Vec3): void {
    this.focusTarget.x = p.x;
    this.focusTarget.y = p.y;
    this.focusTarget.z = p.z;
    this.hasExplicitFocus = true;
  }

  /** Add a decaying shake. Multiple impulses take the strongest still-active one. */
  addImpulse(imp: CameraImpulse): void {
    if (imp.strength <= this.currentShakeAmplitude()) return;
    this.shakeStrength = imp.strength;
    this.shakeDuration = Math.max(0.01, imp.duration);
    this.shakeElapsed = 0;
    this.shakeFreq = imp.frequency;
    this.shakePhase = (this.shakePhase + 7.13) % 1000;
  }

  private currentShakeAmplitude(): number {
    if (this.shakeElapsed >= this.shakeDuration) return 0;
    const k = 1 - this.shakeElapsed / this.shakeDuration;
    return this.shakeStrength * k * k;
  }

  /**
   * @param dt        seconds
   * @param nowMs     virtual clock (from HitStopController) — orbit + shake freeze during hit-stop
   * @param midpoint  fallback look target (fighters' midpoint) when no cue focus is set
   */
  update(dt: number, nowMs: number, midpoint: Vec3): void {
    this.elapsedMs = nowMs;
    if (this.framing.focusBias > 0 && this.hasExplicitFocus === false) {
      this.setFocus(midpoint);
    }

    // --- ease framing scalars toward the active cue --------------------------
    const f = this.framing;
    const L = 5.5; // framing damping
    this.curRadiusMul = damp(this.curRadiusMul, f.radiusMul, L, dt);
    this.curHeightAdd = damp(this.curHeightAdd, f.heightAdd, L, dt);
    this.curFovAdd = damp(this.curFovAdd, f.fovAdd, L, dt);
    this.curFocusBias = damp(this.curFocusBias, f.focusBias, L, dt);

    // push-in decays to 0 independently of the cue's steady framing
    this.push = damp(this.push, 0, 1 / this.pushDecay, dt);

    // --- focus point --------------------------------------------------------
    this.focus.x = damp(this.focus.x, this.focusTarget.x, 6, dt);
    this.focus.y = damp(this.focus.y, this.focusTarget.y, 6, dt);
    this.focus.z = damp(this.focus.z, this.focusTarget.z, 6, dt);

    // --- base front-arc orbit ---------------------------------------------
    const yaw =
      Math.sin((this.elapsedMs / this.opts.orbitPeriodMs) * Math.PI * 2) * this.opts.orbitArc;
    const radius = this.opts.radius * this.curRadiusMul * (1 - clamp(this.push, 0, 0.6));
    const height = this.opts.height + this.curHeightAdd;

    // --- look-at: blend stage centre → focus fighter ---------------------
    const mid = this.opts.center;
    const bias = clamp(this.curFocusBias, 0, 1);
    this.lookAt.x = mid.x + (this.focus.x - mid.x) * bias;
    this.lookAt.y = mid.y + (this.focus.y - mid.y) * bias;
    this.lookAt.z = mid.z + (this.focus.z - mid.z) * bias;

    // Orbit around the look-at target, not a fixed origin, so a biased frame
    // still keeps the subject roughly centred.
    this.position.x = this.lookAt.x + Math.sin(yaw) * radius;
    this.position.y = height;
    this.position.z = this.lookAt.z + Math.cos(yaw) * radius;

    this.fov = this.opts.fov + this.curFovAdd;

    // --- shake -----------------------------------------------------------
    this.shakeElapsed += dt;
    const amp = this.currentShakeAmplitude();
    if (amp > 0) {
      const w = this.elapsedMs * 0.001 * this.shakeFreq * Math.PI * 2 + this.shakePhase;
      this.shake.x = Math.sin(w) * amp;
      this.shake.y = Math.sin(w * 1.37 + 1.1) * amp * 0.7;
      this.shake.z = Math.cos(w * 0.91 + 2.3) * amp * 0.5;
    } else {
      this.shake.x = 0;
      this.shake.y = 0;
      this.shake.z = 0;
    }
  }

  reset(): void {
    this.curRadiusMul = 1;
    this.curHeightAdd = 0;
    this.curFovAdd = 0;
    this.curFocusBias = 0;
    this.push = 0;
    this.shakeElapsed = this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.shake.x = this.shake.y = this.shake.z = 0;
    this.setCue("battle_start");
  }
}
