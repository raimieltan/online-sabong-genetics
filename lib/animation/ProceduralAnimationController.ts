/**
 * Per-fighter procedural animation controller.
 *
 * Owns: rest-pose capture, the state machine, the animation registry, pose
 * blending, the additive layer rig, and the walk/run velocity overlay. Every
 * frame it rebuilds the pose from rest (never `+=` across frames), blends out
 * of the previous state, applies layers, and writes bone quaternions/positions.
 *
 * Not a React component — plain class, driven imperatively from ChickenModel's
 * useFrame. No allocation in `update()` beyond three.js scratch objects created
 * once in the constructor.
 */

import * as THREE from "three";

import { ANIMATIONS } from "./animations/index";
import { aerialAttack } from './animations/aerial';
import { LayerRig } from "./layers";
import { clamp, clamp01, smoothstep } from "./math";
import { AnimationStateMachine } from "./stateMachine";
import {
  BONE_NAMES,
  copyPose,
  lerpPose,
  makePose,
  resetPose,
  type AnimContext,
  type AnimIntent,
  type AnimState,
  type AnimationGains,
  type BoneName,
} from "./types";

type BoneMap = Partial<Record<BoneName, THREE.Object3D>>;

interface RestEntry {
  quat: THREE.Quaternion;
  pos: THREE.Vector3;
}

/** Recoil-spring kick strength when entering each reaction state. */
const HIT_POWER: Partial<Record<AnimState, number>> = {
  hit_light: 0.4,
  hit_medium: 0.75,
  hit_heavy: 1.15,
  hit_critical: 1.5,
  stagger: 0.7,
  stagger_heavy: 1.1,
  knockback: 1.0,
  knockdown: 1.3,
};

// Planar drift (world units/sec) gating the walk overlay. Hysteresis so a
// speed hovering at the threshold doesn't flip-flop walk↔ready every frame.
const WALK_ENTER = 0.06;
const WALK_EXIT = 0.025;
const RUN_MIN = 1.2;

export class ProceduralAnimationController {
  private sm = new AnimationStateMachine();
  private layers = new LayerRig();
  private rest = new Map<BoneName, RestEntry>();
  private bones: BoneMap;

  private poseBase = makePose();
  private poseBlendFrom = makePose();
  private poseOut = makePose();

  private playbackSpeed = 1;
  private locoPhase = 0;
  private facing: "left" | "right" = "right";
  private gains: AnimationGains;
  private alive = true;

  // scratch
  private _euler = new THREE.Euler(0, 0, 0, "XYZ");
  private _quat = new THREE.Quaternion();
  private _ctx: AnimContext;

  constructor(bones: BoneMap, opts: { gains: AnimationGains; facing: "left" | "right" }) {
    this.bones = bones;
    this.gains = opts.gains;
    this.facing = opts.facing;
    for (const name of BONE_NAMES) {
      const b = bones[name];
      if (!b) continue;
      this.rest.set(name, { quat: b.quaternion.clone(), pos: b.position.clone() });
    }
    this._ctx = {
      stateTime: 0,
      t: 0,
      dt: 0,
      now: 0,
      gains: this.gains,
      facing: this.facing,
      speed: 0,
      velX: 0,
      velZ: 0,
      velY: 0,
      aimYaw: 0,
      alive: true,
    };
  }

  setFacing(f: "left" | "right"): void {
    this.facing = f;
  }

  setGains(g: AnimationGains): void {
    this.gains = g;
  }

  get state(): AnimState {
    return this.sm.current;
  }

  /** Re-bind bones after a scene re-clone (physical/mutation change) and re-capture rest. */
  rebind(bones: BoneMap): void {
    this.bones = bones;
    this.rest.clear();
    for (const name of BONE_NAMES) {
      const b = bones[name];
      if (!b) continue;
      this.rest.set(name, { quat: b.quaternion.clone(), pos: b.position.clone() });
    }
  }

  /** Apply an intent from BattleCanvas. No-op if the state machine rejects it. */
  play(intent: AnimIntent): void {
    this.facing = intent.facing;
    const target = intent.fatal ? "death" : intent.state;
    const finished = this.currentFinished();
    const blendScale = clamp(this.gains.inertia, 0.9, 1.4);
    const accepted = this.sm.request(target, finished, blendScale);
    if (!accepted) return;
    this.playbackSpeed = Math.max(0.2, intent.speed || 1);
    copyPose(this.poseOut, this.poseBlendFrom);
    if (target === "death") this.alive = false;
    const power = HIT_POWER[target];
    if (power != null && !intent.aerial) {
      const away = this.facing === "right" ? -1 : 1;
      this.layers.addHit(away, power);
    }
  }

  private currentFinished(): boolean {
    const anim = ANIMATIONS[this.sm.current];
    if (anim.loop) return true; // looping states never block a same/lower swap
    return this.sm.stateTime * this.playbackSpeed >= anim.duration;
  }

  /** Advance and write bones. `frame` carries the per-frame inputs from ChickenModel. */
  update(frame: {
    dt: number;
    now: number;
    speed: number;
    velX: number;
    velZ: number;
    velY: number;
    aimYaw: number;
    simulationIntent?: AnimIntent;
  }): void {
    const dt = Math.min(frame.dt, 1 / 30);
    this.sm.update(dt);
    const simulation = frame.simulationIntent;
    if (simulation) {
      this.sm.current = simulation.state;
      this.sm.transitionT = 1;
      this.sm.stateTime = (simulation.simulationProgress ?? 0) * ANIMATIONS[simulation.state].duration;
      this.playbackSpeed = 1;
      this.alive = !simulation.fatal;
    }

    // --- internal auto-transitions ------------------------------------------
    const cur = this.sm.current;
    const anim = ANIMATIONS[cur];
    const done = !anim.loop && this.sm.stateTime * this.playbackSpeed >= anim.duration;
    if (done && !simulation) {
      if (isAttack(cur)) this.sm.request("recovery", true);
      else if (cur === "recovery" || cur === "getup" || cur === "backstep" || cur === "knockback") {
        this.sm.request("ready", true);
      } else if (cur === "hit_light" || cur === "hit_medium" || cur === "hit_heavy" ||
                 cur === "hit_critical" || cur === "stagger" || cur === "stagger_heavy") {
        this.sm.request("ready", true);
      }
      // knockdown & death intentionally hold their final pose.
    }

    // --- walk / run velocity overlay --------------------------------------
    if (!simulation && isRestState(this.sm.current)) {
      if (frame.speed > RUN_MIN) this.sm.request("run", true);
      else if (frame.speed > WALK_ENTER) this.sm.request("walk", true);
    } else if (!simulation && (this.sm.current === "walk" || this.sm.current === "run") && frame.speed <= WALK_EXIT) {
      this.sm.request("ready", true);
    }

    // --- build context ----------------------------------------------------
    const state = this.sm.current;
    const def = ANIMATIONS[state];
    const ctx = this._ctx;
    ctx.dt = dt;
    ctx.now = frame.now;
    ctx.gains = this.gains;
    ctx.facing = this.facing;
    ctx.speed = frame.speed;
    ctx.velX = frame.velX;
    ctx.velZ = frame.velZ;
    ctx.velY = frame.velY;
    ctx.aimYaw = frame.aimYaw;
    ctx.alive = this.alive;
    ctx.stateTime = this.sm.stateTime * this.playbackSpeed;

    if (state === "walk" || state === "run") {
      const rate = clamp(frame.speed * 4, 0.25, 3.2); // cycles/sec
      this.locoPhase = (this.locoPhase + rate * dt) % 1;
      ctx.t = this.locoPhase;
    } else if (def.loop) {
      ctx.t = (ctx.stateTime / def.duration) % 1;
    } else {
      ctx.t = clamp01(ctx.stateTime / def.duration);
    }

    // --- pose: rest → base anim → blend → layers -------------------------
    resetPose(this.poseBase);
    if (simulation?.aerial && !simulation.fatal) aerialAttack(simulation.aerial, this.poseBase);
    else def.fn(ctx.t, ctx, this.poseBase);

    if (this.sm.transitionT < 1) {
      lerpPose(this.poseBlendFrom, this.poseBase, smoothstep(this.sm.transitionT), this.poseOut);
    } else {
      copyPose(this.poseBase, this.poseOut);
    }

    this.layers.apply(this.poseOut, ctx, state);

    this.writeBones();
  }

  private writeBones(): void {
    for (const name of BONE_NAMES) {
      const bone = this.bones[name];
      const rest = this.rest.get(name);
      if (!bone || !rest) continue;
      const d = this.poseOut[name];
      this._euler.set(d.rx, d.ry, d.rz, "XYZ");
      this._quat.setFromEuler(this._euler);
      bone.quaternion.copy(rest.quat).multiply(this._quat);
      bone.position.set(rest.pos.x + d.px, rest.pos.y + d.py, rest.pos.z + d.pz);
    }
  }
}

function isAttack(s: AnimState): boolean {
  return (
    s === "peck_attack" || s === "quick_kick" || s === "heavy_kick" || s === "wing_strike" ||
    s === "jump_attack" || s === "flying_kick" || s === "double_kick" || s === "charge_attack"
  );
}

function isRestState(s: AnimState): boolean {
  return s === "idle" || s === "ready" || s === "idle_alert";
}
