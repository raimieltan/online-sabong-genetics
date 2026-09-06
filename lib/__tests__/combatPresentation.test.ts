import test from "node:test";
import assert from "node:assert/strict";

import {
  ATTACK_CHOREOGRAPHY,
  choreographyDuration,
  getChoreography,
  hitStopFor,
  impactTime,
  resolveAttackPhase,
  resolveLunge,
} from "../animation/choreography";
import {
  DEFAULT_SPACING,
  resolveSpacingIntent,
  spacingSpeed,
  stepToward,
  clampFighterX,
  dampFacingYaw,
} from "../animation/combatSpacing";
import { HitStopController } from "../animation/hitStop";
import { CameraDirector } from "../animation/cameraDirector";
import { personalityForStyle, personalityForArchetype } from "../animation/battlePersonality";
import { IMPACT_VFX, impactKindFor } from "../animation/impactVfx";
import {
  CombatPresentationController,
  cameraCueForResult,
  type PresentationTurn,
} from "../animation/combatPresentation";

// ---------------------------------------------------------------------------
// choreography
// ---------------------------------------------------------------------------

test("every attack choreography has a positive scripted duration and in-range impact", () => {
  for (const [id, c] of Object.entries(ATTACK_CHOREOGRAPHY)) {
    assert.equal(c.id, id);
    assert.ok(choreographyDuration(c) > 0, `${id} duration`);
    const contact = impactTime(c);
    assert.ok(contact > 0 && contact < choreographyDuration(c), `${id} impact within clip`);
    assert.ok(c.impactTimeFrac > 0 && c.impactTimeFrac <= 1, `${id} impactTimeFrac`);
  }
});

test("getChoreography falls back for an unknown state", () => {
  assert.equal(getChoreography("nonsense").id, "charge_attack");
  assert.equal(getChoreography("heavy_kick").id, "heavy_kick");
});

test("resolveAttackPhase walks APPROACH -> ANTICIPATION -> ACTIVE -> IMPACT -> RECOVERY -> COMPLETE", () => {
  const c = getChoreography("heavy_kick");
  assert.equal(resolveAttackPhase(c, 0, true), "APPROACH");
  assert.equal(resolveAttackPhase(c, c.anticipation * 0.5, false), "ANTICIPATION");
  const contact = impactTime(c);
  assert.equal(resolveAttackPhase(c, (c.anticipation + contact) * 0.5 + 0.001, false), "ACTIVE");
  assert.equal(resolveAttackPhase(c, contact + 0.001, false), "IMPACT");
  assert.equal(resolveAttackPhase(c, choreographyDuration(c) - 0.001, false), "RECOVERY");
  assert.equal(resolveAttackPhase(c, choreographyDuration(c) + 1, false), "COMPLETE");
});

test("hitStopFor scales with severity and honours the critical flag", () => {
  const c = getChoreography("heavy_kick");
  assert.equal(hitStopFor(c, "none", false), 0);
  assert.ok(hitStopFor(c, "light", false) < hitStopFor(c, "heavy", false));
  assert.equal(hitStopFor(c, "light", true), c.hitStop.critical);
  assert.ok(hitStopFor(c, "knockdown", false) >= hitStopFor(c, "medium", false));
});

test("resolveLunge never closes past the minimum combat distance", () => {
  const c = getChoreography("charge_attack");
  // plenty of room -> scripted distance (commit 1)
  assert.equal(resolveLunge(c, 10, 1.5, 1), c.lungeDistance);
  // tight -> clamped to the room available
  assert.equal(resolveLunge(c, 2.0, 1.5, 1), 0.5);
  // already inside min distance -> zero, never negative
  assert.equal(resolveLunge(c, 1.0, 1.5, 1), 0);
  // commit multiplier scales the scripted reach
  assert.equal(resolveLunge(c, 10, 1.5, 0.5), c.lungeDistance * 0.5);
});

// ---------------------------------------------------------------------------
// combat spacing
// ---------------------------------------------------------------------------

test("resolveSpacingIntent keeps fighters in an intentional band", () => {
  const s = DEFAULT_SPACING;
  assert.equal(resolveSpacingIntent(s.minimumCombatDistance - 0.2, s, false), "separate");
  assert.equal(resolveSpacingIntent(s.maximumCombatDistance + 1, s, false), "close");
  assert.equal(resolveSpacingIntent(s.idealCombatDistance, s, false), "hold");
  // about to attack from just out of range -> approach, not hold
  assert.equal(resolveSpacingIntent(s.attackRange + 0.3, s, true), "approach");
  assert.equal(resolveSpacingIntent(s.attackRange - 0.1, s, true), "hold");
});

test("spacingSpeed sign matches intent", () => {
  assert.ok(spacingSpeed("close") > 0);
  assert.ok(spacingSpeed("approach") > 0);
  assert.ok(spacingSpeed("separate") < 0);
  assert.equal(spacingSpeed("hold"), 0);
});

test("stepToward never overshoots", () => {
  assert.equal(stepToward(0, 1, 100, 0.016), 1); // maxStep 1.6 >= 1 -> snap to target
  assert.equal(stepToward(0, 10, 1, 1), 1); // exactly one unit of travel
  assert.equal(stepToward(5, -5, 2, 1), 3);
  assert.equal(stepToward(0, 1, 10, 0.016), 0.16); // maxStep < gap -> partial step, no snap
});

test("clampFighterX keeps a fighter off the opponent and inside the arena", () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);
  // opponent on the right at +2.0, min gap 1.5 -> this fighter capped at +0.5
  near(clampFighterX(5, 2, 1.5, 3), 0.5);
  // arena bound wins when the opponent is far enough not to constrain
  near(clampFighterX(-9, 2.8, 1.5, 3), -3);
  // opponent on the near side pushes this fighter back off them
  near(clampFighterX(-9, -1.6, 1.5, 3), -0.1);
});

test("dampFacingYaw moves toward the target and is stable", () => {
  let yaw = 0;
  for (let i = 0; i < 200; i++) yaw = dampFacingYaw(yaw, Math.PI / 2, 8, 1 / 60);
  assert.ok(Math.abs(yaw - Math.PI / 2) < 1e-3);
});

// ---------------------------------------------------------------------------
// hit stop
// ---------------------------------------------------------------------------

test("HitStopController freezes virtual time then resumes", () => {
  const hs = new HitStopController();
  hs.tick(1000);
  assert.equal(hs.now(), 1000);
  hs.trigger(0.1, 1000); // 100ms freeze
  hs.tick(1050);
  assert.equal(hs.now(), 1000, "virtual clock pinned during freeze");
  assert.equal(hs.frozen, true);
  hs.tick(1100);
  assert.equal(hs.frozen, false);
  hs.tick(1150);
  // 50ms elapsed since freeze ended -> virtual now = 1000 + 50
  assert.equal(hs.now(), 1050);
});

test("HitStopController extends rather than truncates on a second hit", () => {
  const hs = new HitStopController();
  hs.tick(0);
  hs.trigger(0.1, 0);
  hs.tick(20);
  hs.trigger(0.05, 20); // ends at 70ms, earlier than the existing 100ms end
  hs.tick(80);
  assert.equal(hs.frozen, true, "shorter second trigger did not cut the freeze short");
  hs.tick(120);
  assert.equal(hs.frozen, false);
});

test("HitStopController ignores non-positive durations", () => {
  const hs = new HitStopController();
  hs.tick(0);
  hs.trigger(0, 0);
  hs.trigger(-1, 0);
  assert.equal(hs.frozen, false);
});

// ---------------------------------------------------------------------------
// camera director
// ---------------------------------------------------------------------------

test("CameraDirector eases framing toward a cue without snapping", () => {
  const cam = new CameraDirector({ radius: 4.4, height: 2.45, fov: 90 });
  const mid = { x: 0, y: 0, z: 0 };
  cam.setCue("battle_start");
  cam.update(1 / 60, 0, mid);
  const startFov = cam.fov;
  cam.setCue("critical", { x: 1.6, y: 0, z: 0 });
  cam.update(1 / 60, 16, mid);
  // one frame in, fov has moved toward the zoom but not all the way
  assert.ok(cam.fov < startFov, "fov started zooming");
  assert.ok(cam.fov > 90 - 9, "fov did not snap to the cue target in one frame");
  for (let i = 0; i < 240; i++) cam.update(1 / 60, 32 + i * 16, mid);
  assert.ok(Math.abs(cam.fov - (90 - 9)) < 0.5, "fov settles at the cue target");
});

test("CameraDirector shake is a decaying impulse that returns to zero", () => {
  const cam = new CameraDirector({ radius: 4.4, height: 2.45, fov: 90 });
  const mid = { x: 0, y: 0, z: 0 };
  cam.addImpulse({ strength: 0.2, duration: 0.3, frequency: 20 });
  cam.update(1 / 60, 16, mid);
  const mag1 = Math.hypot(cam.shake.x, cam.shake.y, cam.shake.z);
  assert.ok(mag1 > 0, "shake active");
  for (let i = 0; i < 60; i++) cam.update(1 / 60, 32 + i * 16, mid);
  const mag2 = Math.hypot(cam.shake.x, cam.shake.y, cam.shake.z);
  assert.equal(mag2, 0, "shake fully decayed");
});

test("CameraDirector never NaNs its position", () => {
  const cam = new CameraDirector({ radius: 4.4, height: 2.45, fov: 90 });
  const mid = { x: 0.2, y: -0.1, z: 0 };
  for (const cue of ["battle_start", "approach", "attack", "impact_heavy", "knockdown", "victory"] as const) {
    cam.setCue(cue);
    for (let i = 0; i < 30; i++) cam.update(1 / 60, i * 16, mid);
  }
  assert.ok(Number.isFinite(cam.position.x));
  assert.ok(Number.isFinite(cam.position.y));
  assert.ok(Number.isFinite(cam.position.z));
  assert.ok(Number.isFinite(cam.fov));
});

// ---------------------------------------------------------------------------
// personality + vfx
// ---------------------------------------------------------------------------

test("personalityForStyle maps every backend style and stays presentation-scaled", () => {
  for (const style of ["aggressive", "counter", "endurance", "balanced"] as const) {
    const p = personalityForStyle(style);
    assert.ok(p.timingMul > 0.5 && p.timingMul < 1.6);
    assert.ok(p.lungeCommit > 0.5 && p.lungeCommit < 1.6);
    assert.ok(p.neutralBeatMul > 0.4);
  }
  assert.equal(personalityForStyle("aggressive").archetype, "aggressive");
  assert.equal(personalityForStyle("counter").archetype, "defensive");
  assert.equal(personalityForArchetype("heavy").footworkMul < 1, true);
});

test("impactKindFor honours miss / crit / severity", () => {
  assert.equal(impactKindFor({ isMiss: true, isCritical: false, stagger: "heavy" }), null);
  assert.equal(impactKindFor({ isMiss: false, isCritical: true, stagger: "none" }), "critical_impact");
  assert.equal(impactKindFor({ isMiss: false, isCritical: false, stagger: "heavy" }), "heavy_impact");
  assert.equal(impactKindFor({ isMiss: false, isCritical: false, stagger: "light" }), "light_impact");
  for (const def of Object.values(IMPACT_VFX)) {
    assert.ok(def.count > 0 && def.life > 0);
  }
});

// ---------------------------------------------------------------------------
// presentation controller end-to-end
// ---------------------------------------------------------------------------

function turn(partial: Partial<PresentationTurn>): PresentationTurn {
  return {
    turn: 1,
    attacker: "A",
    move: "quick_kick",
    isMiss: false,
    isCrit: false,
    isCritical: false,
    stagger: "light",
    fatal: false,
    hitZone: "body",
    damage: 10,
    defenderHp: 90,
    ...partial,
  };
}

function harness(turns: PresentationTurn[]) {
  const events: string[] = [];
  const persona = {
    A: personalityForArchetype("balanced"),
    B: personalityForArchetype("balanced"),
  };
  const ctrl = new CombatPresentationController(
    {
      startAttack: (t) => events.push(`start:${t.turn}:${t.move}`),
      impact: (info) => events.push(`impact:${info.turn.turn}:${info.vfx ?? "none"}:${info.camera}`),
      hitStop: (s) => events.push(`hitstop:${s.toFixed(3)}`),
      cameraCue: (name) => events.push(`cue:${name}`),
      phaseChange: (phase) => events.push(`phase:${phase}`),
      finished: (w) => events.push(`finished:${w ?? "none"}`),
    },
    { personality: persona }
  );
  ctrl.load(turns, 0);
  // run a generous virtual timeline
  for (let i = 0; i < 4000 && !ctrl.done; i++) ctrl.update(1 / 120);
  return { events, ctrl };
}

test("presentation controller sequences a two-hit fight through all phases", () => {
  const { events, ctrl } = harness([
    turn({ turn: 1, attacker: "A", move: "quick_kick" }),
    turn({ turn: 2, attacker: "B", move: "heavy_kick", stagger: "heavy" }),
  ]);
  assert.equal(ctrl.done, true);
  assert.ok(events.includes("cue:battle_start"));
  assert.ok(events.includes("start:1:quick_kick"));
  assert.ok(events.some((e) => e.startsWith("impact:1:")));
  assert.ok(events.includes("start:2:heavy_kick"));
  assert.ok(events.some((e) => e.startsWith("impact:2:heavy_impact")));
  assert.ok(events.includes("phase:ANTICIPATION"));
  assert.ok(events.includes("phase:IMPACT"));
  assert.ok(events.includes("phase:COMPLETE"));
  assert.ok(events.includes("finished:B"));
  // exactly one impact per turn
  assert.equal(events.filter((e) => e === "impact:1:light_impact:impact_light").length, 1);
});

test("a missed attack fires no impact vfx and no hit-stop", () => {
  const { events } = harness([turn({ isMiss: true, stagger: "none", move: "peck_attack" })]);
  const impact = events.find((e) => e.startsWith("impact:1:"));
  assert.ok(impact && impact.includes(":none:"), "impact reported with no vfx on a miss");
  assert.equal(events.some((e) => e.startsWith("hitstop:")), false, "no hit-stop on a miss");
});

test("a fatal hit holds for KO recognition then fires the victory cue", () => {
  const { events, ctrl } = harness([
    turn({ turn: 1, attacker: "A", move: "heavy_kick", stagger: "knockdown", fatal: true, defenderHp: 0 }),
  ]);
  assert.equal(ctrl.done, true);
  const deathIdx = events.indexOf("cue:death");
  const victoryIdx = events.indexOf("cue:victory");
  assert.ok(deathIdx >= 0 && victoryIdx > deathIdx, "death cue precedes victory cue");
  assert.ok(events.includes("finished:A"));
});

test("cameraCueForResult picks the dramatic cue for big outcomes", () => {
  assert.equal(cameraCueForResult(turn({ isMiss: true })), "attack");
  assert.equal(cameraCueForResult(turn({ isCritical: true })), "critical");
  assert.equal(cameraCueForResult(turn({ fatal: true })), "critical");
  assert.equal(cameraCueForResult(turn({ stagger: "knockdown" })), "knockdown");
  assert.equal(cameraCueForResult(turn({ stagger: "heavy" })), "impact_heavy");
  assert.equal(cameraCueForResult(turn({ stagger: "light" })), "impact_light");
});

test("controller never advances past the loaded turns", () => {
  const { ctrl } = harness([turn({})]);
  const before = ctrl.virtualNow;
  ctrl.update(1); // extra updates after done
  ctrl.update(1);
  assert.equal(ctrl.virtualNow, before, "clock frozen once done");
});
