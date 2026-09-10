/**
 * Additive procedural layers, applied every frame AFTER the base/blend pose in
 * this order: breathing → head tracking → recoil springs → wing balance →
 * tail balance. All state lives on the LayerRig instance — no per-frame
 * allocation. Layers only ever `add` into the accumulator pose.
 */

import { Spring, clamp, clamp01, damp } from "./math";
import { add, type AnimContext, type AnimState, type PoseMap } from "./types";

/** States during which breathing is damped down so it doesn't fight the motion. */
const BREATH_SUPPRESS: Partial<Record<AnimState, number>> = {
  peck_attack: 0.2,
  quick_kick: 0.2,
  heavy_kick: 0.15,
  wing_strike: 0.2,
  jump_attack: 0.1,
  flying_kick: 0.1,
  double_kick: 0.15,
  charge_attack: 0.15,
  hit_light: 0.3,
  hit_medium: 0.2,
  hit_heavy: 0.1,
  hit_critical: 0.1,
  stagger: 0.25,
  stagger_heavy: 0.2,
  knockback: 0.2,
  knockdown: 0.1,
  getup: 0.3,
  death: 0,
};

/** One side of the wing as a damped, momentum-carrying three-joint chain. */
class WingChainSpring {
  // Shoulder is muscular and decisive; every distal joint is looser and more
  // under-damped, so it visibly continues after the stroke reverses.
  private shoulderRz = new Spring(260, 23);
  private shoulderRx = new Spring(220, 21);
  private midRz = new Spring(105, 11);
  private midRx = new Spring(96, 10);
  private midRy = new Spring(90, 10);
  private tipRz = new Spring(54, 6.5);
  private tipRx = new Spring(50, 6);
  private tipRy = new Spring(46, 5.5);

  reset(): void {
    for (const spring of [this.shoulderRz, this.shoulderRx, this.midRz, this.midRx, this.midRy, this.tipRz, this.tipRx, this.tipRy]) spring.reset();
  }

  apply(pose: PoseMap, side: "L" | "R", sign: number, shoulder: number, mid: number, tip: number, intensity: number, dt: number): void {
    add(pose, `Wing${side}`, {
      rz: this.shoulderRz.step(sign * shoulder * 0.36 * intensity, dt),
      rx: this.shoulderRx.step(shoulder * 0.1 * intensity, dt),
    });
    add(pose, `Wing${side}_Mid`, {
      rz: this.midRz.step(sign * mid * 0.58 * intensity, dt),
      rx: this.midRx.step(mid * 0.28 * intensity, dt),
      ry: this.midRy.step(-sign * mid * 0.14 * intensity, dt),
    });
    add(pose, `Wing${side}_Tip`, {
      rz: this.tipRz.step(sign * tip * 0.67 * intensity, dt),
      rx: this.tipRx.step(tip * 0.32 * intensity, dt),
      ry: this.tipRy.step(-sign * tip * 0.23 * intensity, dt),
    });
  }
}

export class LayerRig {
  // Recoil springs — kicked on impact, otherwise pull to 0.
  private headRx = new Spring(180, 16);
  private headRy = new Spring(160, 15);
  private neckRx = new Spring(170, 15);
  private spineRy = new Spring(140, 14);
  private wingL = new Spring(120, 12);
  private wingR = new Spring(120, 12);
  private tailRx = new Spring(110, 12);
  private flapIntensity = new Spring(72, 16);
  private flapLeft = new WingChainSpring();
  private flapRight = new WingChainSpring();

  // Head-tracking damped state.
  private aim = 0;

  // Previous-frame body angles for velocity-driven wing/tail balance.
  private prevHipRy = 0;
  private prevHipRx = 0;
  private prevSpineRy = 0;
  private prevVelY = 0;

  /** Kick the recoil springs. `away` is -1/+1 (direction the hit throws the head), `power` ~0..1.5. */
  addHit(away: number, power: number): void {
    this.headRx.addImpulse(-power * 9);
    this.headRy.addImpulse(away * power * 7);
    this.neckRx.addImpulse(-power * 5);
    this.spineRy.addImpulse(away * power * 4);
    this.wingL.addImpulse(-power * 6);
    this.wingR.addImpulse(power * 6);
    this.tailRx.addImpulse(power * 5);
  }

  reset(): void {
    for (const s of [this.headRx, this.headRy, this.neckRx, this.spineRy, this.wingL, this.wingR, this.tailRx, this.flapIntensity]) {
      s.reset();
    }
    this.flapLeft.reset();
    this.flapRight.reset();
    this.aim = 0;
  }

  /**
   * @param pose   accumulator, already holding base + blend pose
   * @param ctx    frame context
   * @param state  current animation state (for breathing suppression)
   */
  apply(pose: PoseMap, ctx: AnimContext, state: AnimState): void {
    const dt = ctx.dt;
    const g = ctx.gains;

    // Additive spring-chain flap. The target travels shoulder → mid → tip;
    // each joint has different stiffness/damping instead of direct Euler
    // assignment, so a stopped flap settles in a visible wave.
    const flap = this.flapIntensity.step(clamp01(ctx.wingFlapIntensity * g.wingForce), dt);
    if (flap > 0.002) {
      const rate = 6.4 + flap * 2.4;
      const phase = ctx.stateTime * rate * Math.PI * 2;
      const stroke = (p: number) => {
        const cycle = ((p / (Math.PI * 2)) % 1 + 1) % 1;
        // 35% SNAP downstroke, 65% slower folding recovery.
        return cycle < 0.35 ? -1 + (cycle / 0.35) * 2 : 1 - ((cycle - 0.35) / 0.65) * 2;
      };
      const lead = ctx.facing === "right" ? "R" : "L";
      const phaseFor = (side: "L" | "R") => phase - (side === lead ? 0 : 0.82);
      const targetFor = (side: "L" | "R") => {
        const p = phaseFor(side);
        const variation = 1 + Math.sin(ctx.stateTime * 0.83 + (side === "L" ? 0.4 : 2.1)) * 0.035;
        return [stroke(p) * variation, stroke(p - 0.92) * variation, stroke(p - 1.78) * variation] as const;
      };
      const [leftShoulder, leftMid, leftTip] = targetFor("L");
      const [rightShoulder, rightMid, rightTip] = targetFor("R");
      this.flapLeft.apply(pose, "L", -1, leftShoulder, leftMid, leftTip, flap, dt);
      // A stable asymmetry avoids mirror-perfect combat motion without RNG.
      this.flapRight.apply(pose, "R", 1, rightShoulder, rightMid, rightTip, flap * 0.94, dt);

      // Hard strokes move mass. Keep this restrained: it sells force without
      // turning the torso into a second set of wings, while head tracking
      // below continues to stabilize the opponent-facing gaze.
      const force = Math.max(0, flap - 0.35);
      if (force > 0) {
        const pulse = leftShoulder;
        const lead = ctx.facing === "right" ? 1 : -1;
        add(pose, "Chest", { rx: pulse * force * 0.045, rz: lead * pulse * force * 0.025 });
        add(pose, "Spine", { rx: -pulse * force * 0.035 });
        add(pose, "Hips", { py: -Math.abs(pulse) * force * 0.008, rz: -lead * pulse * force * 0.018 });
        add(pose, "Neck", { rx: -pulse * force * 0.025 });
        add(pose, "Tail", { rx: pulse * force * 0.07 * g.tailCounter });
      }
    }

    // --- 1. Breathing -----------------------------------------------------
    if (ctx.alive) {
      const suppress = BREATH_SUPPRESS[state] ?? 1;
      const breath = Math.sin(ctx.now * 0.0016);
      const amt = 0.5 + 0.5 * breath; // 0..1
      add(pose, "Chest", { py: amt * 0.012 * g.bob * suppress, rx: -amt * 0.03 * g.bob * suppress });
      add(pose, "Spine", { rx: -amt * 0.012 * g.bob * suppress });
      add(pose, "Neck", { rx: amt * 0.015 * g.bob * suppress });
    }

    // --- 2. Head tracking ----------------------------------------------------
    if (ctx.alive && state !== "knockdown" && state !== "getup" && state !== "death") {
      this.aim = damp(this.aim, clamp(ctx.aimYaw, -0.6, 0.6), 6, dt);
      add(pose, "Neck", { ry: this.aim * 0.4 });
      add(pose, "Head", { ry: this.aim * 0.6 });
    } else {
      this.aim = damp(this.aim, 0, 4, dt);
    }

    // --- 3. Recoil springs ------------------------------------------------
    add(pose, "Head", { rx: this.headRx.step(0, dt), ry: this.headRy.step(0, dt) });
    add(pose, "Neck", { rx: this.neckRx.step(0, dt) });
    add(pose, "Spine", { ry: this.spineRy.step(0, dt) });
    add(pose, "WingL", { rz: this.wingL.step(0, dt) });
    add(pose, "WingR", { rz: this.wingR.step(0, dt) });
    add(pose, "Tail", { rx: this.tailRx.step(0, dt) });

    // --- 4. Wing balance ------------------------------------------------------
    // React to body angular velocity + vertical velocity (launch/landing).
    const hipRyVel = (pose.Hips.ry - this.prevHipRy) / Math.max(dt, 1e-4);
    const hipRxVel = (pose.Hips.rx - this.prevHipRx) / Math.max(dt, 1e-4);
    const velYAccel = (ctx.velY - this.prevVelY) / Math.max(dt, 1e-4);
    const wingReact = clamp((-hipRyVel * 0.04 - velYAccel * 0.0008) * g.wingForce, -0.5, 0.5);
    add(pose, "WingL", { rz: -wingReact });
    add(pose, "WingR", { rz: wingReact });
    // Both wings lift a little when falling fast / landing hard.
    const drop = clamp(-ctx.velY * 0.02, 0, 0.4) * g.wingForce;
    add(pose, "WingL", { rz: -drop });
    add(pose, "WingR", { rz: drop });

    // --- 5. Tail balance ---------------------------------------------------
    // Tail lags body yaw and lifts under forward pitch acceleration.
    const spineRyVel = (pose.Spine.ry - this.prevSpineRy) / Math.max(dt, 1e-4);
    add(pose, "Tail", {
      ry: clamp((-pose.Hips.ry * 1.1 - spineRyVel * 0.03) * g.tailCounter, -0.5, 0.5),
      rx: clamp((-hipRxVel * 0.02 + Math.abs(ctx.velX) * 0.03) * g.tailCounter, -0.3, 0.4),
    });

    this.prevHipRy = pose.Hips.ry;
    this.prevHipRx = pose.Hips.rx;
    this.prevSpineRy = pose.Spine.ry;
    this.prevVelY = ctx.velY;
  }
}
