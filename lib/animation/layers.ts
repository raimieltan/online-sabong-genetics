/**
 * Additive procedural layers, applied every frame AFTER the base/blend pose in
 * this order: breathing → head tracking → recoil springs → wing balance →
 * tail balance. All state lives on the LayerRig instance — no per-frame
 * allocation. Layers only ever `add` into the accumulator pose.
 */

import { Spring, clamp, clamp01, damp } from "./math";
import { add, type AnimContext, type AnimState, type PoseMap } from "./types";
import { sampleWingFlapCycle, type WingFlapSample } from "./wingFlap";

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
interface WingChainTarget {
  shoulder: WingFlapSample;
  mid: WingFlapSample;
  tip: WingFlapSample;
}

class WingChainSpring {
  // Shoulder is muscular and decisive; every distal joint is looser and more
  // under-damped, so it visibly continues after the stroke reverses.
  private shoulderRz = new Spring(230, 18);
  private shoulderRx = new Spring(255, 19);
  private shoulderRy = new Spring(215, 17);
  private midRz = new Spring(165, 13);
  private midRx = new Spring(175, 13.5);
  private midRy = new Spring(145, 12);
  private tipRz = new Spring(110, 9);
  private tipRx = new Spring(118, 9.5);
  private tipRy = new Spring(96, 8.5);

  reset(): void {
    for (const spring of [this.shoulderRz, this.shoulderRx, this.shoulderRy, this.midRz, this.midRx, this.midRy, this.tipRz, this.tipRx, this.tipRy]) spring.reset();
  }

  apply(pose: PoseMap, side: "L" | "R", sign: number, target: WingChainTarget, intensity: number, dt: number): void {
    const shoulder = target.shoulder;
    const midStroke = target.mid.flap;
    const tipStroke = target.tip.flap;
    // Ported from rooster_viewer's 3-joint diagnostic: the wrist receives
    // both its delayed stroke and the mid-to-tip velocity difference.
    const tipWhip = tipStroke * 1.18 + (midStroke - tipStroke) * 0.42;

    add(pose, `Wing${side}`, {
      // The shoulder now owns the silhouette. At full force it traverses a
      // broad arc instead of merely exciting the looser mid/tip joints.
      // Wing_Mid extends mostly down local -Z in this rig. Rotating about X
      // therefore carries the whole fan through the large shoulder-centred
      // arc; Y/Z only cup and sweep the fan within that arc.
      // Keep the viewer's large three-axis rotation, then add independently
      // phased sweep/twist so the world-space path remains a loop.
      rx: this.shoulderRx.step(shoulder.flap * 1.5 * intensity, dt),
      ry: this.shoulderRy.step(-sign * (shoulder.flap * 0.2 + shoulder.sweep * 0.38) * intensity, dt),
      rz: this.shoulderRz.step(sign * (shoulder.flap * 0.4 + shoulder.twist * 0.28) * intensity, dt),
    });
    add(pose, `Wing${side}_Mid`, {
      // Full bipolar rotation is what made the viewer diagnostic feel alive;
      // the recovery-fold term closes the silhouette without replacing it.
      rz: this.midRz.step(sign * (midStroke * 0.88 + target.mid.fold * 0.1) * intensity, dt),
      rx: this.midRx.step((midStroke * 0.95 + target.mid.fold * 0.12) * intensity, dt),
      ry: this.midRy.step(-sign * (midStroke * 0.38 + target.mid.fold * 0.08) * intensity, dt),
    });
    add(pose, `Wing${side}_Tip`, {
      rz: this.tipRz.step(sign * tipWhip * intensity, dt),
      rx: this.tipRx.step(tipStroke * 1.3 * intensity, dt),
      ry: this.tipRy.step(-sign * tipStroke * 0.68 * intensity, dt),
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
  private flapPhase = 0;

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
    this.flapPhase = 0;
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
      // Keep the phase continuous while intensity changes; deriving it from
      // absolute time * rate causes a visible jump at every burst boundary.
      const rate = 1.65 + flap * 1.1;
      this.flapPhase = (this.flapPhase + rate * dt) % 1;
      const lead = ctx.facing === "right" ? "R" : "L";
      const targetFor = (side: "L" | "R") => {
        // Viewer-calibrated delays are expressed in seconds, so the distal
        // wave retains the same physical timing as combat cadence changes.
        const wingDelay = side === lead ? 0 : 0.028;
        const shoulderCycle = this.flapPhase - rate * wingDelay;
        const target: WingChainTarget = {
          shoulder: sampleWingFlapCycle(shoulderCycle),
          mid: sampleWingFlapCycle(shoulderCycle - rate * 0.035),
          tip: sampleWingFlapCycle(shoulderCycle - rate * 0.075),
        };
        const variation = 1 + Math.sin(ctx.now * 0.00083 + (side === "L" ? 0.4 : 2.1)) * 0.035;
        target.shoulder.flap *= variation;
        target.shoulder.sweep *= variation;
        target.mid.flap *= variation;
        target.tip.flap *= variation;
        return target;
      };
      const left = targetFor("L");
      const right = targetFor("R");
      this.flapLeft.apply(pose, "L", -1, left, flap, dt);
      // A stable asymmetry avoids mirror-perfect combat motion without RNG.
      this.flapRight.apply(pose, "R", 1, right, flap * 0.94, dt);

      // Hard strokes move mass. Keep this restrained: it sells force without
      // turning the torso into a second set of wings, while head tracking
      // below continues to stabilize the opponent-facing gaze.
      const force = Math.max(0, flap - 0.35);
      if (force > 0) {
        const pulse = left.shoulder.downstroke;
        const settle = left.shoulder.settle;
        const lead = ctx.facing === "right" ? 1 : -1;
        add(pose, "Chest", { py: pulse * force * 0.026, rx: -pulse * force * 0.085, rz: lead * pulse * force * 0.035 });
        add(pose, "Spine", { py: pulse * force * 0.012, rx: pulse * force * 0.045 });
        add(pose, "Hips", { py: (pulse * 0.028 - settle * 0.012) * force, rx: settle * force * 0.025 });
        add(pose, "Neck", { rx: pulse * force * 0.035 });
        add(pose, "Tail", { rx: -pulse * force * 0.13 * g.tailCounter + settle * force * 0.05 });
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
