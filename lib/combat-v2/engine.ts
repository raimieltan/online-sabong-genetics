import { ACTIONS } from './actions';
import { aerialImpact, aerialPhase } from './aerial';
import { bodyRadius, separateFighters, strikeCollision } from './collision';
import { beginBreak, beginClash, readTicks, setEngagement, updateEngagement } from './rhythm';
import { canTransition } from './transitions';
import { clamp, COMBAT_VERSION, COMMAND_COOLDOWN_TICKS, TACTICAL_MODES, quantize as q } from './constants';
import { createCombatRng } from './rng';
import type { CombatMatchState, CombatCommand, CombatEvent, FighterRuntimeState as Fighter, FighterState, MatchConfig } from './types';

const GROUND_HEIGHT = 0;
const GROUND_EPSILON = .001;
const GROUNDED_VELOCITY_TOLERANCE = .05;
const LAND_POSE_TICKS = 8;

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function validateNumbers(value: unknown): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite match input');
  if (value && typeof value === 'object') Object.values(value).forEach(validateNumbers);
}
export function createMatch(input: MatchConfig): CombatMatchState {
  validateNumbers(input);
  if (input.version !== COMBAT_VERSION) throw new Error('Unsupported combat version');
  if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 0xffffffff || !Number.isInteger(input.maxTicks) || input.maxTicks < 1 || input.maxTicks > 36000 || input.arena.radius < 2 || input.arena.radius > 20) throw new Error('Invalid match rules');
  if (!input.fighterA.fighterId || !input.fighterB.fighterId || input.fighterA.fighterId === input.fighterB.fighterId) throw new Error('Fighters must be distinct');
  for (const f of [input.fighterA, input.fighterB]) {
    if (f.maxHealth <= 0 || f.maxHealth > 10000 || Object.values(f.stats).some(n => n < 0 || n > 1000) || Object.values(f.physical).some(n => n <= 0 || n > 5) || Object.values(f.behavior).some(n => n < 0 || n > 1) || f.condition < 0 || f.condition > 1 || f.experience < 0 || f.experience > 1) throw new Error('Invalid fighter snapshot');
  }
  const bodySum = [input.fighterA, input.fighterB].reduce((sum, f) => sum + .5 * Math.max(f.physical.mass, f.physical.wingControl), 0);
  if (bodySum >= input.arena.radius) throw new Error('Fighters do not fit arena');
  const config = freeze(JSON.parse(JSON.stringify({ ...input, commands: [] })) as MatchConfig);
  const fighter = (snapshot: MatchConfig['fighterA'], x: number): Fighter => {
    const b = snapshot.behavior;
    const preferred = clamp(5.1 + b.caution * 1.35 + b.patience * .8 + b.counterPreference * .75 - b.aggression * .9 - b.pressurePreference * .6, 4.1, 7.3);
    return { snapshot, state: 'circling', previousState: 'neutral', stateEnteredTick: 0, position: { x, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, grounded: true, wasGrounded: true, justLanded: false, groundedTicks: 1, locomotion: 'GROUNDED', facing: x < 0 ? 0 : Math.PI, health: snapshot.maxHealth, stamina: 100, balance: 100, currentIntent: 'probe', tacticalMode: 'balanced', nextDecisionTick: Math.round(18 + snapshot.behavior.patience * 20), lastCommandTick: -COMMAND_COOLDOWN_TICKS, lastSequence: -1, openingUntil: 0, cooldowns: {}, engagement: { phase: 'stalking', enteredTick: 0, clashUntil: 0, breakUntil: 0, resetUntil: 0, desiredRange: preferred, orbitDirection: x < 0 ? 1 : -1, lastCollisionTick: -1000 }, observedTellTick: -1, memory: { attacks: {}, successfulCounters: 0, failedCounters: 0 }, utilities: {} };
  };
  const openingHalfGap = Math.min(input.arena.radius * .55, 4.6);
  const state: CombatMatchState = { config, tick: 0, phase: 'active', rngState: input.seed >>> 0, fighters: [fighter(config.fighterA, -openingHalfGap), fighter(config.fighterB, openingHalfGap)], commands: [], eventBuffer: [], lastContactTick: 0 };
  for (const command of input.commands ?? []) queueCommand(state, command);
  return state;
}
export function queueCommand(s: CombatMatchState, c: CombatCommand): void {
  const f = s.fighters.find(f => f.snapshot.fighterId === c.fighterId);
  if (s.phase === 'finished' || !f || c.playerId !== f.snapshot.playerId || !TACTICAL_MODES.includes(c.command) || !Number.isInteger(c.issuedTick) || !Number.isInteger(c.effectiveTick) || !Number.isInteger(c.sequence) || c.sequence < 0 || c.issuedTick < 0 || c.effectiveTick <= s.tick || c.effectiveTick < c.issuedTick || c.effectiveTick > s.config.maxTicks) throw new Error('Invalid command');
  const prior = s.commands.filter(x => x.fighterId === c.fighterId).at(-1);
  if (c.sequence <= (prior?.sequence ?? f.lastSequence) || c.effectiveTick - (prior?.effectiveTick ?? f.lastCommandTick) < COMMAND_COOLDOWN_TICKS) throw new Error('Command cooldown or sequence violation');
  s.commands.push({ ...c });
  s.commands.sort((a, b) => a.effectiveTick - b.effectiveTick || (a.fighterId < b.fighterId ? -1 : a.fighterId > b.fighterId ? 1 : a.sequence - b.sequence));
}
function emit(s: CombatMatchState, f: Fighter, type: CombatEvent['type'], fields: Partial<CombatEvent> = {}) { s.eventBuffer.push({ type, tick: s.tick, fighterId: f.snapshot.fighterId, ...fields }); }
function transition(s: CombatMatchState, f: Fighter, next: FighterState) {
  if (f.state === next) return;
  if (!canTransition(f.state, next)) throw new Error(`Illegal fighter transition: ${f.state} → ${next}`);
  f.previousState = f.state; f.state = next; f.stateEnteredTick = s.tick;
  emit(s, f, 'STATE_CHANGED', { detail: next });
}
const distance = (a: Fighter, b: Fighter) => Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
const free = (f: Fighter) => f.grounded && !f.currentAction && !['recovering', 'staggered', 'down', 'finished'].includes(f.state);

/**
 * The single authority boundary between physics and all higher-level state.
 * It runs after movement and again after collision/interrupt resolution so a
 * hit cannot resurrect an aerial phase after the root has made contact.
 */
function normalizePhysicsState(s: CombatMatchState, f: Fighter) {
  const isGrounded = f.position.y <= GROUND_HEIGHT + GROUND_EPSILON
    && f.velocity.y <= GROUNDED_VELOCITY_TOLERANCE;
  f.wasGrounded = f.grounded;
  f.grounded = isGrounded;
  f.justLanded ||= !f.wasGrounded && isGrounded;
  f.locomotion = isGrounded ? 'GROUNDED' : 'AIRBORNE';
  f.groundedTicks = isGrounded ? f.groundedTicks + 1 : 0;

  if (!isGrounded) return;
  // Clamp the physical root once contact has been established. No animation
  // state is permitted to pull it back up.
  f.position.y = GROUND_HEIGHT;
  f.velocity.y = 0;

  const launched = f.aerial?.launchedTick !== undefined && f.aerial.launchedTick >= 0;
  // `justLanded` is the normal path. The second branch is deliberately
  // defensive: it repairs imported/corrupt state that says "flapping" while
  // its physical root has already been grounded, without relying on a timer.
  if (launched && f.aerial?.phase !== 'LAND' && (f.justLanded || isGrounded)) {
    // LAND is an edge transition: it is entered once, never restarted while
    // the fighter remains in contact.
    aerialPhase(s, f, 'LAND');
    f.currentAction = undefined;
    f.reaction = undefined;
    if (['winding_up', 'attacking', 'countering', 'defending', 'evading', 'feinting'].includes(f.state)) transition(s, f, 'recovering');
  }

  if (f.aerial?.phase === 'LAND' && s.tick - f.aerial.phaseTick > LAND_POSE_TICKS) {
    f.aerial = undefined;
    if (f.state === 'recovering') {
      transition(s, f, 'neutral');
      f.nextDecisionTick = Math.max(f.nextDecisionTick, s.tick + 3);
    }
  }
}
function start(s: CombatMatchState, f: Fighter, id: string) {
  const a = ACTIONS[id];
  if (!free(f) || f.stamina < a.staminaCost || (f.cooldowns[id] ?? 0) > s.tick) return false;
  if (a.damage && f.engagement.phase === 'stalking') setEngagement(s, f, 'committing');
  f.lastActionId = id;
  // Cooldowns prevent one animation from looping mechanically, while still
  // allowing a fighter to return to that move during the same clash.
  f.cooldowns[id] = s.tick + a.startupTicks + a.activeTicks + a.recoveryTicks + (a.aerial ? 16 : id === 'peck_strike' ? 10 : 8);
  f.stamina = q(f.stamina - a.staminaCost);
  f.currentAction = { id, startedTick: s.tick, hit: false, phase: 'startup' };
  if (a.aerial) {
    f.aerial = { phase: 'PRELOAD', phaseTick: s.tick, launchedTick: -1, followups: 0,
      variant: id === 'flying_spur' ? 'bilateral' : f.engagement.orbitDirection > 0 ? 'right' : 'left',
      wingOffset: f.snapshot.stats.agility * .017 + s.tick * .13 };
  }
  transition(s, f, a.category === 'feint' ? 'feinting' : 'winding_up');
  emit(s, f, 'ATTACK_STARTED', { actionId: id });
  if (a.damage || a.category === 'feint') emit(s, f, 'TELL_STARTED', { actionId: id, detail: a.category === 'feint' ? 'feint' : 'attack_windup' });
  return true;
}
function perceive(s: CombatMatchState, f: Fighter, other: Fighter, rng: ReturnType<typeof createCombatRng>) {
  const tell = other.currentAction;
  if (!tell || tell.phase !== 'startup' || f.observedTellTick === tell.startedTick || !free(f) || distance(f, other) > 2.8) return;
  if (!ACTIONS[tell.id].damage && ACTIONS[tell.id].category !== 'feint') return;
  f.observedTellTick = tell.startedTick;
  if (!rng.chance(clamp(.35 + f.snapshot.stats.accuracy / 200 + f.snapshot.experience * .25))) return;
  const delay = Math.round(clamp(17 - f.snapshot.stats.speed / 18 - f.snapshot.stats.agility / 36 - f.snapshot.experience * 4 + (100 - f.stamina) / 10, 5, 25));
  const b = f.snapshot.behavior;
  const meetChance = clamp(.35 + b.aggression * .35 + b.riskTolerance * .25 - b.caution * .15
    + (f.tacticalMode === 'pressure' || f.tacticalMode === 'all_in' ? .2 : 0)
    - (f.tacticalMode === 'recover' || f.tacticalMode === 'defensive' ? .3 : 0), .05, .85);
  const canMeet = f.engagement.phase === 'stalking' && f.stamina >= 35 && f.balance >= 45;
  const meet = canMeet && rng.chance(meetChance);
  const reply = ACTIONS[tell.id].aerial ? tell.id : distance(f, other) < 1.6 ? 'wing_counter' : 'spur_lunge';
  f.reaction = { sourceTick: tell.startedTick, readyTick: s.tick + delay, actionId: meet ? reply : rng.chance(.45 + b.counterPreference * .3) ? 'sidestep' : 'guard' };
  emit(s, f, 'TELL_DETECTED', { targetId: other.snapshot.fighterId, value: delay });
}
function decide(s: CombatMatchState, f: Fighter, other: Fighter, rng: ReturnType<typeof createCombatRng>) {
  if (f.aerial && f.position.y > .18 && !f.currentAction && f.state === 'neutral' && f.aerial.followups < 2
    && f.engagement.phase === 'clashing' && f.stamina > 12 && f.balance > 25 && f.velocity.y > -3) {
    if (distance(f, other) < 1.9 && rng.chance(.3 + f.snapshot.behavior.persistence * .5)) {
      const id = distance(f, other) < 1.05 ? 'air_peck' : f.balance < 45 ? 'air_push' : f.aerial.variant === 'right' ? 'air_left' : 'air_right';
      f.aerial.followups++;
      f.aerial.variant = id === 'air_left' ? 'left' : 'right';
      f.stamina = q(f.stamina - ACTIONS[id].staminaCost);
      f.currentAction = { id, startedTick: s.tick, hit: false, phase: 'startup' };
      // One short balancing beat, bounded by flight age and follow-up count.
      f.velocity.y = Math.min(2, f.velocity.y + .65 * f.snapshot.physical.wingControl);
      transition(s, f, 'winding_up'); aerialPhase(s, f, 'AIRBORNE');
      emit(s, f, 'ATTACK_STARTED', { actionId: id });
    }
    return;
  }
  if (!free(f)) return;
  if (f.reaction) {
    if (s.tick < f.reaction.readyTick) return;
    const reaction = f.reaction; f.reaction = undefined;
    if (other.currentAction?.startedTick === reaction.sourceTick
      && other.currentAction.phase !== 'recovery'
      && (!ACTIONS[reaction.actionId].damage || !['breaking', 'resetting'].includes(f.engagement.phase))
      && start(s, f, reaction.actionId)) {
      if (ACTIONS[reaction.actionId].damage) f.currentAction!.meetingCommitment = true;
      return;
    }
  }
  if (s.tick < f.engagement.resetUntil) {
    const d = distance(f, other);
    transition(s, f, d < f.engagement.desiredRange ? 'retreating' : 'circling');
    f.currentIntent = f.engagement.phase === 'breaking' ? 'disengage' : 'reposition';
    return;
  }
  if (s.tick < f.nextDecisionTick) return;
  f.nextDecisionTick = s.tick + (f.engagement.phase === 'clashing' ? 4 : 12);
  const b = f.snapshot.behavior, mode = f.tacticalMode, d = distance(f, other);
  const pressure = clamp((s.tick - s.lastContactTick - 360) / 480), tired = 1 - f.stamina / 100;
  const reading = f.engagement.phase === 'stalking' && s.tick - f.engagement.enteredTick < readTicks(f);
  const opening = other.openingUntil > s.tick;
  const patternRead = Math.max(0, ...Object.values(f.memory.attacks)) >= 3 ? .15 + f.snapshot.experience * .5 : 0;
  const aggressive = mode === 'pressure' || mode === 'all_in';
  const scores: Record<string, number> = {
    peck_strike: d < 1.25 * f.snapshot.physical.reach ? .25 + b.aggression * .4 + pressure * .3 - tired : 0,
    spur_lunge: d < 1.65 * f.snapshot.physical.reach ? .2 + b.riskTolerance * .5 + pressure + (mode === 'all_in' ? 1 : 0) - tired : 0,
    jump_kick: d > .9 && d < 1.8 ? .7 + b.aggression * .5 + f.snapshot.stats.agility / 120 + (opening ? .4 : 0) - tired : 0,
    flying_spur: d > 2.2 && d < 7.4 ? 1 + b.riskTolerance + b.pressurePreference + pressure - tired * 1.5 : 0,
    wing_counter: opening && d < 1.6 ? 1 + b.counterPreference * 2 + (mode === 'counter' ? 2 : 0) + f.snapshot.experience + patternRead : 0,
    guard: .05 + (mode === 'defensive' ? .6 : 0) + b.caution * .2 + patternRead - pressure,
    feint: d < 1.5 ? .1 + b.patience * .2 + b.counterPreference * .2 - tired : 0,
    advance: d > f.engagement.desiredRange - .45 ? .7 + pressure * 2 + b.pressurePreference + (aggressive ? .5 : 0) : 0,
    retreat: d < f.engagement.desiredRange - .9 ? .6 + tired + b.recoveryPreference * tired + (mode === 'recover' ? .8 : 0) - pressure * .3 : 0,
    circle: .45 + b.patience * .3 - pressure * .3,
    recover: tired * 1.5 + (mode === 'recover' ? .6 : 0) - pressure,
  };
  // A real recovery opening permits a counter; feints and defensive tells remain live while reading.
  if (reading) for (const id of Object.keys(scores)) {
    if (ACTIONS[id]?.category === 'attack') scores[id] = 0;
  }
  for (const id of Object.keys(scores)) scores[id] = Math.max(0, ACTIONS[id] && (f.stamina < ACTIONS[id].staminaCost || (f.cooldowns[id] ?? 0) > s.tick) ? 0 : scores[id]);
  if (f.engagement.phase === 'clashing') {
    // Inside the burst, commitment has already happened. Aggression and
    // persistence create pressure while agility and counter preference create
    // evasions and replies between attempts.
    scores.advance = 0; scores.retreat = 0; scores.circle = 0; scores.recover = 0; scores.feint *= .25;
    // Keep a close-range option live even after aerial movement has altered
    // spacing. The window must produce choices, not a stalled "advance" loop.
    if (d < 1.55 * f.snapshot.physical.reach) scores.peck_strike = Math.max(scores.peck_strike, .35 + b.aggression * .5 + b.persistence * .25);
    if (d > .7 && d < 1.95 * f.snapshot.physical.reach) scores.jump_kick = Math.max(scores.jump_kick, .2 + f.snapshot.stats.speed / 300 + f.snapshot.stats.agility / 240);
    if (d > 1.15 && d < 2.7 * f.snapshot.physical.reach) scores.flying_spur = Math.max(scores.flying_spur, .15 + b.riskTolerance * .3);
    scores.wing_counter = Math.max(scores.wing_counter, b.counterPreference * .5);
    scores.sidestep = (scores.sidestep ?? 0) + b.caution * .25 + f.snapshot.stats.agility / 500;
    for (const id of Object.keys(scores)) if (ACTIONS[id] && (f.stamina < ACTIONS[id].staminaCost || (f.cooldowns[id] ?? 0) > s.tick)) scores[id] = 0;
  }
  if (f.lastActionId && scores[f.lastActionId]) scores[f.lastActionId] *= .3;
  f.utilities = scores;
  let roll = rng.next() * Object.values(scores).reduce((sum, x) => sum + x, 0);
  let choice = 'advance';
  for (const [id, score] of Object.entries(scores)) { roll -= score; if (score > 0 && roll <= 0) { choice = id; break; } }
  f.currentIntent = choice; emit(s, f, 'INTENT_CHANGED', { detail: choice });
  if (ACTIONS[choice]) start(s, f, choice);
  else transition(s, f, choice === 'advance' ? 'advancing' : choice === 'retreat' ? 'retreating' : choice === 'circle' ? 'circling' : 'neutral');
}
function timeline(s: CombatMatchState, f: Fighter) {
  const runtime = f.currentAction;
  if (!runtime) {
    if (f.state === 'staggered' && s.tick - f.stateEnteredTick >= 20) { transition(s, f, 'neutral'); f.nextDecisionTick = s.tick + 3; }
    return;
  }
  const a = ACTIONS[runtime.id], age = s.tick - runtime.startedTick;
  if (age >= a.startupTicks + a.activeTicks + a.recoveryTicks) {
    f.currentAction = undefined; transition(s, f, 'neutral'); f.nextDecisionTick = s.tick + 3; return;
  }
  if (age >= a.startupTicks + a.activeTicks && runtime.phase !== 'recovery') {
    if (a.damage && !runtime.hit) {
      emit(s, f, 'ATTACK_MISSED', { actionId: a.id, detail: f.aerial ? 'AIR_KICK_MISS' : undefined });
      if (a.category === 'counter') f.memory.failedCounters++;
    }
    runtime.phase = 'recovery'; aerialPhase(s, f, 'RECOVERY'); f.openingUntil = runtime.startedTick + a.startupTicks + a.activeTicks + a.recoveryTicks;
    transition(s, f, 'recovering'); return;
  }
  if (age >= a.startupTicks && runtime.phase === 'startup') {
    runtime.phase = 'active';
    aerialPhase(s, f, 'STRIKE_ACTIVE');
    if (a.damage) beginClash(s, f);
    transition(s, f, a.category === 'defense' ? 'defending' : a.category === 'evade' ? 'evading' : a.category === 'counter' ? 'countering' : a.category === 'feint' ? 'feinting' : 'attacking');
    emit(s, f, a.category === 'evade' ? 'EVADE' : 'ATTACK_ACTIVE', { actionId: a.id });
  }
}
function move(s: CombatMatchState) {
  // Both movement vectors use the same pre-movement state. Flight locks direction at takeoff.
  const moves = s.fighters.map((f, i) => {
    const other = s.fighters[1 - i], d = distance(f, other) || 1;
    let ux = (other.position.x - f.position.x) / d, uz = (other.position.z - f.position.z) / d;
    const rt = f.currentAction, action = rt && ACTIONS[rt.id];
    const aerial = action?.aerial, age = rt ? s.tick - rt.startedTick : 0;
    const launch = aerial && age >= aerial.takeoffTick && f.aerial?.launchedTick === -1;
    const airborne = f.position.y > GROUND_HEIGHT + GROUND_EPSILON || !f.grounded || launch;
    if (!action || (rt?.phase === 'startup' && (!aerial || age < aerial.takeoffTick))) f.facing = q(Math.atan2(uz, ux));
    let forward = f.state === 'advancing' ? 1 : f.state === 'retreating' ? -.9 : 0;
    let lateral = f.state === 'circling' ? .85 : f.state === 'evading' ? 2 : 0;
    if (f.engagement.phase === 'breaking' || f.engagement.phase === 'resetting') {
      forward = d < f.engagement.desiredRange ? -1.35 : 0;
      lateral = .7 * f.engagement.orbitDirection;
      if (f.state === 'staggered') { forward = 0; lateral = 0; }
    } else if (f.engagement.phase === 'clashing' && !action) {
      // A fighter who has recovered during a clash stays in the pocket long
      // enough to create another opportunity instead of silently drifting
      // back into neutral spacing.
      forward = d > 1.35 ? 1.35 : d < .9 ? -.45 : .25;
      lateral = .35 * f.engagement.orbitDirection;
    } else lateral *= f.engagement.orbitDirection;
    if (!action && f.engagement.phase === 'stalking') {
      // Measured approaches hold reading distance instead of walking chest-to-chest.
      const reading = s.tick - f.engagement.enteredTick < readTicks(f);
      if (reading) {
        const preferred = f.engagement.desiredRange;
        forward = d < preferred - .7 ? -.9 : d > preferred + .8 ? .6 : 0;
        lateral = .72 * f.engagement.orbitDirection;
      } else if (forward > 0 && d < f.engagement.desiredRange - .35) forward = 0;
    }
    // A commitment is visibly different from neutral footwork: it accelerates
    // across medium/long range during the preload instead of walking into
    // attack distance. Collision projection remains the final authority.
    if (action?.damage && rt?.phase === 'startup' && f.engagement.phase === 'committing' && d > 1.15) forward = 15;
    if (action?.id === 'wing_counter' && rt?.phase === 'active') forward = 1.8;
    if (action?.id === 'spur_lunge' && rt?.phase === 'active') forward = 2;
    const speed = (.9 + f.snapshot.stats.speed / 120) * f.snapshot.physical.mobility / f.snapshot.physical.mass * (.5 + f.stamina / 200) * (.6 + f.snapshot.condition * .4);
    let y = f.position.y, vy = f.velocity.y;
    if (launch) {
      f.aerial!.launchedTick = s.tick; aerialPhase(s, f, 'TAKEOFF');
      vy = Math.sqrt(2 * 18 * aerial.height);
    }
    if (airborne) {
      vy -= 18 / 60; y = q(Math.max(0, y + vy / 60));
      if (f.aerial?.phase === 'TAKEOFF' && s.tick - f.aerial.launchedTick >= 7) aerialPhase(s, f, 'AIRBORNE');
      ux = Math.cos(f.facing); uz = Math.sin(f.facing);
      const vx = launch ? ux * aerial.speed : f.velocity.x * .99;
      const vz = launch ? uz * aerial.speed : f.velocity.z * .99;
      return { x: q(vx), z: q(vz), y, vy: q(vy) };
    }
    // Hit recoil decays in simulation rather than displacing a separate render-only rigid body.
    const recoil = f.state === 'staggered' ? .85 : 0;
    return { x: q((ux * forward - uz * lateral) * speed + f.velocity.x * recoil), z: q((uz * forward + ux * lateral) * speed + f.velocity.z * recoil), y, vy };
  });
  s.fighters.forEach((f, i) => {
    const m = moves[i];
    f.velocity = { x: m.x, y: m.vy, z: m.z };
    f.position.x += m.x / 60; f.position.z += m.z / 60; f.position.y = m.y;
  });
  separateFighters(s.fighters, s.config.arena.radius);
  s.fighters.forEach(f => normalizePhysicsState(s, f));
}
/** Fixed pipeline: clock/commands → timelines → perception (both) → decisions (both) → movement → collect hits → apply hits → stamina → finish.
 * Hits are collected before damage/interrupts, allowing simultaneous trades without slot priority.
 * Mutates the session-owned runtime; immutable snapshots are never changed. */
export function stepCombat(s: CombatMatchState): CombatMatchState {
  if (s.phase !== 'active') return s;
  s.tick++; s.eventBuffer = [];
  // Landing is an edge, not a sticky state. Preserve it through both
  // normalization passes in this tick, then clear it before the next one.
  s.fighters.forEach(f => { f.justLanded = false; });
  const rng = createCombatRng(s.rngState);
  for (const c of s.commands.filter(c => c.effectiveTick === s.tick)) {
    const f = s.fighters.find(f => f.snapshot.fighterId === c.fighterId)!;
    f.tacticalMode = c.command; f.lastCommandTick = s.tick; f.lastSequence = c.sequence;
    emit(s, f, 'COMMAND', { detail: c.command });
  }
  s.fighters.forEach(f => { timeline(s, f); updateEngagement(s, f); });
  s.fighters.forEach((f, i) => perceive(s, f, s.fighters[1 - i], rng));
  s.fighters.forEach((f, i) => decide(s, f, s.fighters[1 - i], rng));
  move(s);
  const [fighterA, fighterB] = s.fighters;
  const bodyDistance = distance(fighterA, fighterB);
  const physicalContact = bodyDistance <= bodyRadius(fighterA) + bodyRadius(fighterB) + .05;
  if (physicalContact && (fighterA.currentAction || fighterB.currentAction)
    && s.tick - Math.max(fighterA.engagement.lastCollisionTick, fighterB.engagement.lastCollisionTick) >= 10) {
    fighterA.engagement.lastCollisionTick = fighterB.engagement.lastCollisionTick = s.tick;
    const detail = !fighterA.grounded || !fighterB.grounded ? 'AIR_COLLISION' : undefined;
    emit(s, fighterA, 'COLLISION', { targetId: fighterB.snapshot.fighterId, detail });
    emit(s, fighterB, 'COLLISION', { targetId: fighterA.snapshot.fighterId, detail });
    if (Math.abs(fighterA.position.y - fighterB.position.y) < .6) {
      aerialImpact(s, fighterA, fighterB, 'body', 3);
      aerialImpact(s, fighterB, fighterA, 'body', 3);
    }
  }
  const hits: { attacker: Fighter; target: Fighter; actionId: string; damage: number; blocked: boolean; zone: string; interrupt: boolean }[] = [];
  s.fighters.forEach((f, i) => {
    const rt = f.currentAction, target = s.fighters[1 - i];
    if (!rt || rt.phase !== 'active' || rt.hit) return;
    const a = ACTIONS[rt.id]; if (!a.damage) return;
    if (target.state === 'evading') {
      if (f.aerial) emit(s, f, 'EVADE', { targetId: target.snapshot.fighterId, detail: 'AIR_KICK_EVADED' });
      return;
    }
    const zone = strikeCollision(f, target, a);
    if (!zone) return;
    rt.hit = true;
    const blocked = target.state === 'defending';
    const damage = q(a.damage * (.6 + f.snapshot.stats.power / 100) * (zone === 'head' ? 1.15 * target.snapshot.physical.neck : 1) * (.65 + f.stamina / 285) * (.8 + f.snapshot.condition * .2) / (1 + target.snapshot.stats.defense / 120) / target.snapshot.physical.mass * (blocked ? .25 : 1));
    const resistance = target.currentAction ? ACTIONS[target.currentAction.id].interruptResistance : 0;
    // Balanced strikes and deliberate meet-in counters follow through so overlapping hits can trade.
    // Ordinary startup and off-balance attacks can still be stuffed; damage is never suppressed.
    const followingThrough = target.currentAction && ACTIONS[target.currentAction.id].damage > 0 && target.balance >= 45
      && (target.currentAction.phase === 'active'
        || (target.currentAction.phase === 'startup' && ['committing', 'clashing'].includes(target.engagement.phase))
        || target.currentAction.meetingCommitment && target.currentAction.phase === 'startup');
    hits.push({ attacker: f, target, actionId: a.id, damage, blocked, zone, interrupt: !blocked && !followingThrough && a.interruptPower / target.snapshot.physical.stability > resistance });
  });
  for (const h of hits) {
    const { attacker: f, target, actionId, damage, blocked, zone } = h;
    target.health = q(Math.max(0, target.health - damage)); target.balance = q(Math.max(0, target.balance - damage * 2 / target.snapshot.physical.stability));
    target.memory.recentDamageTaken = q(target.memory.recentDamageTaken + damage);
    target.memory.attacks[actionId] = (target.memory.attacks[actionId] ?? 0) + 1;
    s.lastContactTick = s.tick;
    emit(s, f, blocked ? 'BLOCK' : actionId === 'wing_counter' ? 'COUNTER_LANDED' : 'ATTACK_LANDED', { targetId: target.snapshot.fighterId, actionId, value: damage, detail: zone });
    emit(s, target, 'DAMAGE', { targetId: f.snapshot.fighterId, value: damage, detail: zone });
    aerialImpact(s, target, f, zone, damage);
    if (f.aerial && !f.grounded) emit(s, f, 'COLLISION', { targetId: target.snapshot.fighterId,
      detail: hits.some(other => other.attacker === target) ? 'AIR_KICK_TRADE' : ACTIONS[actionId].category === 'counter' ? 'AIR_KICK_COUNTERED' : 'AIR_KICK_HIT' });
    if (actionId === 'wing_counter') f.memory.successfulCounters++;
  }
  for (const h of hits) if (h.interrupt && h.target.health > 0) {
    h.target.currentAction = undefined; h.target.reaction = undefined;
    beginBreak(s, h.target);
    transition(s, h.target, 'staggered'); h.target.stateEnteredTick = s.tick;
    const dx = h.target.position.x - h.attacker.position.x, dz = h.target.position.z - h.attacker.position.z, length = Math.hypot(dx, dz) || 1;
    const recoil = clamp(h.damage / 4, .6, 2.8) / h.target.snapshot.physical.mass;
    h.target.velocity.x = q(dx / length * recoil); h.target.velocity.z = q(dz / length * recoil);
    emit(s, h.target, 'STAGGER', { value: h.damage });
  }
  // Collision resolution can interrupt an action after movement. Reassert the
  // physics invariant so neither fighter can retain an airborne presentation
  // after their own root has landed; each fighter is normalized independently.
  s.fighters.forEach(f => normalizePhysicsState(s, f));
  for (const f of s.fighters) {
    f.stamina = q(clamp(f.stamina + (f.currentAction ? .04 : .10 + f.snapshot.stats.stamina / 1200), 0, 100));
    f.balance = q(clamp(f.balance + .08 * f.snapshot.physical.wingControl, 0, 100));
  }
  s.rngState = rng.state;
  const [a, b] = s.fighters;
  if (a.health <= 0 || b.health <= 0 || s.tick >= s.config.maxTicks) {
    const dead = a.health <= 0 || b.health <= 0;
    const scoreA = a.health / a.snapshot.maxHealth, scoreB = b.health / b.snapshot.maxHealth;
    s.result = { winnerId: scoreA === scoreB ? null : scoreA > scoreB ? a.snapshot.fighterId : b.snapshot.fighterId, finishReason: a.health <= 0 && b.health <= 0 ? 'double_KO' : dead ? 'KO' : 'time_limit', durationTicks: s.tick };
    for (const f of s.fighters) { f.currentAction = undefined; f.reaction = undefined; f.velocity = { x: 0, y: 0, z: 0 }; f.position.y = 0; transition(s, f, f.health <= 0 ? 'down' : 'finished'); }
    s.phase = 'finished'; emit(s, a, 'MATCH_FINISHED', { detail: s.result.finishReason, targetId: s.result.winnerId ?? undefined });
  }
  return s;
}
export function runCombatToCompletion(config: MatchConfig): CombatMatchState {
  const state = createMatch(config);
  while (state.phase === 'active') stepCombat(state);
  return state;
}
