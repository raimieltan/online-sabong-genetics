import { clamp } from './constants';
import type { CombatMatchState, EngagementPhase, FighterRuntimeState } from './types';

/** Each fighter owns its rhythm. There is no global exchange or initiative winner. */
export function setEngagement(s: CombatMatchState, f: FighterRuntimeState, phase: EngagementPhase) {
  if (f.engagement.phase === phase) return;
  f.engagement.phase = phase;
  f.engagement.enteredTick = s.tick;
  s.eventBuffer.push({ type: 'ENGAGEMENT_CHANGED', tick: s.tick, fighterId: f.snapshot.fighterId, detail: phase });
}
export function resetProfile(f: FighterRuntimeState) {
  const b = f.snapshot.behavior;
  const pressure = f.tacticalMode === 'pressure' || f.tacticalMode === 'all_in' ? .4 : 0;
  const fatigue = 1 - f.stamina / 100;
  const urgency = clamp(b.aggression * .5 + b.pressurePreference * .5 + pressure);
  return {
    breakTicks: Math.round(clamp((48 + fatigue * 30 + b.caution * 18 - urgency * 24) / f.snapshot.physical.mobility, 30, 90)),
    resetTicks: Math.round(clamp(75 + b.patience * 45 + fatigue * 45 - urgency * 45, 60, 180)),
    // A break deliberately exceeds ordinary neutral range.  The old 2–3m
    // reset was the source of the perpetual close orbit in V2.
    distance: clamp(5.1 + b.counterPreference * 1.15 + b.caution * .8 + b.patience * .55 + fatigue * .65 - urgency * .9, 3.8, 7.4),
  };
}
/** Readiness changes with temperament and current condition, not a fixed attack clock. */
export function readTicks(f: FighterRuntimeState) {
  const b = f.snapshot.behavior;
  const pressure = f.tacticalMode === 'pressure' || f.tacticalMode === 'all_in' ? 60 : 0;
  const patientMode = f.tacticalMode === 'counter' || f.tacticalMode === 'defensive' ? 45 : f.tacticalMode === 'recover' ? 75 : 0;
  return Math.round(clamp(180 + b.patience * 100 + b.caution * 50 + b.counterPreference * 50
    - b.aggression * 90 - b.pressurePreference * 45 - pressure + patientMode
    + (1 - f.stamina / 100) * 90 + (1 - f.health / f.snapshot.maxHealth) * 60, 60, 480));
}
/** A clash is a short, open window. It contains however many actions the two
 * fighters can create; neither an attack nor a hit ends it on its own. */
export function clashTicks(f: FighterRuntimeState) {
  const b = f.snapshot.behavior;
  const pressure = f.tacticalMode === 'pressure' || f.tacticalMode === 'all_in' ? .25 : 0;
  const fatigue = 1 - f.stamina / 100;
  return Math.round(clamp(30 + b.persistence * 55 + b.aggression * 20 + pressure * 20 - b.caution * 12 - fatigue * 28, 24, 120));
}
export function beginClash(s: CombatMatchState, f: FighterRuntimeState) {
  const until = s.tick + clashTicks(f);
  if (f.engagement.phase !== 'clashing') {
    setEngagement(s, f, 'clashing');
    s.eventBuffer.push({ type: 'CLASH_STARTED', tick: s.tick, fighterId: f.snapshot.fighterId, value: until - s.tick });
  }
  f.engagement.clashUntil = Math.max(f.engagement.clashUntil, until);
}
export function beginBreak(s: CombatMatchState, f: FighterRuntimeState) {
  const profile = resetProfile(f);
  f.engagement.breakUntil = s.tick + profile.breakTicks;
  f.engagement.resetUntil = f.engagement.breakUntil + profile.resetTicks;
  f.engagement.desiredRange = profile.distance;
  f.engagement.orbitDirection *= -1;
  setEngagement(s, f, 'breaking');
}
export function updateEngagement(s: CombatMatchState, f: FighterRuntimeState) {
  if (f.engagement.phase === 'clashing' && s.tick >= f.engagement.clashUntil && !f.currentAction) {
    s.eventBuffer.push({ type: 'CLASH_ENDED', tick: s.tick, fighterId: f.snapshot.fighterId });
    beginBreak(s, f);
  }
  if (f.engagement.phase === 'breaking' && s.tick >= f.engagement.breakUntil) setEngagement(s, f, 'resetting');
  if (f.engagement.phase === 'resetting' && s.tick >= f.engagement.resetUntil && !f.currentAction && f.grounded) setEngagement(s, f, 'stalking');
}
