import test from "node:test";
import assert from "node:assert/strict";
import { BattleDirector } from "../animation/battleDirector";
import type { CombatEvent } from "../combat-v2/types";

const event = (type: CombatEvent["type"], extra: Partial<CombatEvent> = {}): CombatEvent => ({ type, tick: 10, fighterId: "a", ...extra });
const index = (id: string | undefined) => id === "a" ? 0 : 1;

test("BattleDirector maps engagement phases to contextual HUD visibility", () => {
  const director = new BattleDirector();
  assert.equal(director.consume(event("ENGAGEMENT_CHANGED", { detail: "stalking" }), index).hud, "FULL");
  assert.equal(director.consume(event("ENGAGEMENT_CHANGED", { detail: "committing" }), index).hud, "REDUCED");
  assert.equal(director.consume(event("CLASH_STARTED"), index).hud, "CINEMATIC");
  assert.equal(director.consume(event("CLASH_ENDED"), index).camera, "knockback");
});

test("BattleDirector emphasizes only meaningful impacts and never writes combat data", () => {
  const director = new BattleDirector();
  const light = director.consume(event("DAMAGE", { value: 4, targetId: "b" }), index);
  assert.equal(light.vfx, "light_impact");
  assert.ok(light.hitStopSeconds > 0);
  const counter = director.consume(event("COUNTER_LANDED", { value: 12, targetId: "b" }), index);
  assert.equal(counter.vfx, "critical_impact");
  assert.equal(counter.camera, "critical");
  assert.equal(counter.hud, "CINEMATIC");
});
