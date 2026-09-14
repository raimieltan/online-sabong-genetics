import { mulberry32 } from "@/lib/coopVillage";

/**
 * Lightweight, per-chicken idle behavior for the Coop village. Deliberately
 * separate from the combat ProceduralAnimationController/AnimState machinery
 * (lib/animation/types.ts, stateMachine.ts) — that system exists to drive
 * bone-level attack/hit poses from a battle timeline, which idle village
 * chickens have no use for. This is just "where is the chicken walking to
 * right now", read once per frame from a ref, never from React state.
 */
export type VillageAnimState = "idle" | "walking" | "pecking" | "looking_around" | "resting" | "returning_home";

const STATE_SEQUENCE: VillageAnimState[] = [
  "idle",
  "walking",
  "pecking",
  "looking_around",
  "walking",
  "resting",
];

/** Base durations (seconds) per state before personality multipliers apply. */
const BASE_DURATION: Record<VillageAnimState, number> = {
  idle: 2,
  walking: 2.5,
  pecking: 1.8,
  looking_around: 1.6,
  resting: 4,
  returning_home: 2,
};

export interface VillageIdleConfig {
  home: [number, number, number];
  personalArea: [number, number, number];
  /** Radius around the personal area the chicken will wander while "walking". */
  wanderRadius: number;
  walkSpeed: number;
  restBias: number;
  wanderFrequency: number;
  /** Deterministic seed (hash of chicken id) so chickens don't all sync to the same beat. */
  seed: number;
}

export interface VillageIdleFrame {
  position: [number, number, number];
  rotationY: number;
  state: VillageAnimState;
  /** True while translating — callers use this to decide whether to play the idle showcase wiggle. */
  moving: boolean;
}

/**
 * Per-chicken state machine + position integrator. `update(dt)` is called
 * from useFrame and mutates internal fields only — callers read the returned
 * frame object (reused each call, not reallocated) to position the group.
 */
export class VillageChickenAI {
  private config: VillageIdleConfig;
  private rng: () => number;
  private stateIndex = 0;
  private stateTimer: number;
  private position: [number, number, number];
  private rotationY = 0;
  private target: [number, number, number];
  private frame: VillageIdleFrame;

  constructor(config: VillageIdleConfig) {
    this.config = config;
    this.rng = mulberry32(config.seed);
    this.position = [...config.home];
    this.target = [...config.home];
    // Random phase offset so chickens placed at the same time don't lock-step.
    this.stateIndex = Math.floor(this.rng() * STATE_SEQUENCE.length);
    this.stateTimer = this.rng() * BASE_DURATION[STATE_SEQUENCE[this.stateIndex]];
    this.frame = { position: [...this.position], rotationY: 0, state: "idle", moving: false };
  }

  private currentState(): VillageAnimState {
    return STATE_SEQUENCE[this.stateIndex];
  }

  private pickWanderTarget() {
    const [cx, cy, cz] = this.config.personalArea;
    const angle = this.rng() * Math.PI * 2;
    const r = this.rng() * this.config.wanderRadius;
    this.target = [cx + Math.cos(angle) * r, cy, cz + Math.sin(angle) * r];
  }

  private advanceState() {
    this.stateIndex = (this.stateIndex + 1) % STATE_SEQUENCE.length;
    const state = this.currentState();
    let duration = BASE_DURATION[state];

    if (state === "resting") duration *= this.config.restBias;
    if (state === "walking") {
      duration /= Math.max(0.4, this.config.wanderFrequency);
      this.pickWanderTarget();
    }
    // Small deterministic jitter so identical chickens don't all flip state in lockstep.
    duration *= 0.8 + this.rng() * 0.4;
    this.stateTimer = duration;
  }

  update(dt: number): VillageIdleFrame {
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) this.advanceState();

    const state = this.currentState();
    const moving = state === "walking" || state === "returning_home";

    if (moving) {
      const dx = this.target[0] - this.position[0];
      const dz = this.target[2] - this.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 0.02) {
        const step = Math.min(dist, this.config.walkSpeed * dt);
        this.position[0] += (dx / dist) * step;
        this.position[2] += (dz / dist) * step;
        this.rotationY = Math.atan2(dx, dz);
      }
    }

    this.frame.position[0] = this.position[0];
    this.frame.position[1] = this.position[1];
    this.frame.position[2] = this.position[2];
    this.frame.rotationY = this.rotationY;
    this.frame.state = state;
    this.frame.moving = moving;
    return this.frame;
  }
}
