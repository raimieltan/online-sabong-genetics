import { clamp } from './constants';
import type { createCombatRng } from './rng';
import type { ActiveReadTell, CombatMatchState, FighterRuntimeState as Fighter, ReadTellType } from './types';

/**
 * Player-facing "read" tells (docs/combat/tell-revamped.md).
 *
 * The old system only surfaced a tell once an attack's `startup` phase had
 * already begun — by then the player had no real decision window (§63). This
 * module instead reads the fighter's *forming* intent (its utility scores,
 * tactical mode, spacing, and physical state) while it is still `stalking` /
 * `resetting`, well before anything commits, and exposes it as ambiguous body
 * language rather than the underlying action id.
 */
export const READ_TELL_TYPES: readonly ReadTellType[] = [
  'weight_forward', 'closing_distance', 'wing_adjust', 'head_low', 'guard_open',
  'rear_leg_loaded', 'hesitating', 'recovering', 'angle_shift', 'side_on_stance',
  'overextended', 'resetting',
];

const MAX_VISIBLE_TELLS = 2;

/** Ticks (@60/s) a tell can stay alive once it stops being a live candidate. */
const TELL_LIFETIME: Record<ReadTellType, number> = {
  rear_leg_loaded: 45, overextended: 40, wing_adjust: 55,
  weight_forward: 95, head_low: 100, angle_shift: 105, guard_open: 90,
  closing_distance: 165, recovering: 175, hesitating: 145, side_on_stance: 150, resetting: 115,
};
/** Ticks for the tell to ramp from 0 to full strength (docs §22). */
const RAMP_TICKS: Record<ReadTellType, number> = {
  rear_leg_loaded: 18, overextended: 14, wing_adjust: 22,
  weight_forward: 45, head_low: 42, angle_shift: 48, guard_open: 34,
  closing_distance: 60, recovering: 65, hesitating: 55, side_on_stance: 58, resetting: 40,
};

const distance = (a: Fighter, b: Fighter) => Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);

interface Candidate { type: ReadTellType; weight: number }

/** Derives candidate observable behaviors from the fighter's already-computed
 * decision utilities, current tactical mode, spacing, and balance — never
 * from the actual chosen action id, so the label never gives away the answer. */
function candidates(f: Fighter, other: Fighter, d: number): Candidate[] {
  const u = f.utilities;
  const mode = f.tacticalMode;
  const intent = f.currentIntent;
  const out: Candidate[] = [];
  const push = (type: ReadTellType, weight: number) => { if (weight > .03) out.push({ type, weight }); };

  const strike = (u.peck_strike ?? 0) + (u.spur_lunge ?? 0);
  const aerial = (u.jump_kick ?? 0) + (u.flying_spur ?? 0);
  const aggression = strike + aerial + (u.advance ?? 0);
  const pressing = mode === 'pressure' || mode === 'all_in';

  push('weight_forward', aggression * (pressing ? 1.3 : 1));
  if (intent === 'advance' && d > f.engagement.desiredRange - .3) push('closing_distance', (u.advance ?? 0) * 1.1 + aggression * .3);
  push('rear_leg_loaded', (u.jump_kick ?? 0) * 1.15 + (u.flying_spur ?? 0) * .6);
  push('wing_adjust', (u.flying_spur ?? 0) * .85 + (f.aerial ? .4 : 0));
  push('side_on_stance', (u.wing_counter ?? 0) * .9 + (mode === 'counter' ? .35 : 0));
  push('head_low', (u.guard ?? 0) * .8 + (mode === 'defensive' || mode === 'counter' ? .3 : 0));
  if (intent === 'circle') push('angle_shift', (u.circle ?? 0) * .75);
  if (f.balance < 55) push('guard_open', (100 - f.balance) / 130);
  push('hesitating', (u.feint ?? 0) * 1.2 + (intent === 'feint' ? .3 : 0) + (f.stamina < 25 ? .15 : 0));
  push('recovering', mode === 'recover' ? .55 + (u.recover ?? 0) * .5 : (u.recover ?? 0) * .6);
  if (f.engagement.phase === 'breaking') push('resetting', .55);
  if (f.engagement.phase === 'resetting') push('resetting', .4);
  if (f.balance < 35 && f.lastActionId && ['jump_kick', 'flying_spur', 'spur_lunge'].includes(f.lastActionId)) push('overextended', (35 - f.balance) / 35);
  return out;
}

/** Runs once per tick for a fighter still in a read-able engagement phase.
 * Ramps existing tells, retires stale ones, and (probabilistically, via the
 * shared match rng) surfaces new ones — capped at `MAX_VISIBLE_TELLS` so the
 * HUD never turns into the "everything at once" wall the spec forbids (§27). */
export function updateReadTells(s: CombatMatchState, f: Fighter, other: Fighter, rng: ReturnType<typeof createCombatRng>): void {
  const readable = (f.engagement.phase === 'stalking' || f.engagement.phase === 'resetting' || f.engagement.phase === 'breaking') && f.grounded;
  if (!readable) {
    for (const tell of f.readTells) s.eventBuffer.push({ type: 'READ_TELL_ENDED', tick: s.tick, fighterId: f.snapshot.fighterId, detail: tell.type });
    if (f.readTells.length) f.readTells = [];
    return;
  }
  const battleHardened = f.snapshot.evolution.traitLevels['battle-hardened'] ?? 0;
  const d = distance(f, other);
  const cands = candidates(f, other, d);
  const next: ActiveReadTell[] = [];
  for (const tell of f.readTells) {
    const age = s.tick - tell.startedTick;
    const stillLive = cands.some(c => c.type === tell.type);
    const lifetime = TELL_LIFETIME[tell.type] * (1 - battleHardened * .08);
    if (age > lifetime || !stillLive) {
      s.eventBuffer.push({ type: 'READ_TELL_ENDED', tick: s.tick, fighterId: f.snapshot.fighterId, detail: tell.type });
      continue;
    }
    const strength = clamp(age / RAMP_TICKS[tell.type]);
    if (Math.abs(strength - tell.strength) > .015) {
      s.eventBuffer.push({ type: 'READ_TELL_UPDATED', tick: s.tick, fighterId: f.snapshot.fighterId, detail: tell.type, value: strength });
    }
    next.push({ ...tell, strength });
  }
  const tracked = new Set(next.map(t => t.type));
  const untracked = cands.filter(c => !tracked.has(c.type)).sort((a, b) => b.weight - a.weight);
  for (const c of untracked) {
    if (next.length >= MAX_VISIBLE_TELLS) break;
    if (!rng.chance(clamp(c.weight - battleHardened * .05))) continue;
    const confidence = clamp(.35 + f.snapshot.experience * .3 + f.snapshot.stats.accuracy / 250 - battleHardened * .06 - (d > 3.2 ? .15 : 0) + (rng.next() - .5) * .2, .1, .95);
    next.push({ type: c.type, strength: 0, confidence, startedTick: s.tick });
    s.eventBuffer.push({ type: 'READ_TELL_STARTED', tick: s.tick, fighterId: f.snapshot.fighterId, detail: c.type, value: confidence });
  }
  next.sort((a, b) => (b.strength * b.confidence) - (a.strength * a.confidence));
  f.readTells = next.slice(0, MAX_VISIBLE_TELLS);
}
