import { ACTIONS } from './actions';
import { aerialImpact, aerialPhase } from './aerial';
import { bodyRadius, separateFighters, strikeCollision } from './collision';
import { beginBreak, beginClash, readTicks, resetProfile, setEngagement, updateEngagement } from './rhythm';
import { updateReadTells } from './tells';
import { canTransition } from './transitions';
import { clamp, COMBAT_VERSION, COMMAND_COOLDOWN_TICKS, TACTICAL_MODES, TEMPORARY_COMBAT_EXAGGERATION, quantize as q } from './constants';
import { createCombatRng } from './rng';
import { AWAKENING_DURATION_TICKS, awakeningModifiers } from './awakenings';
import type { AwakeningType, CombatMatchState, CombatCommand, CombatEvent, CommandCompliance, FighterRuntimeState as Fighter, FighterState, MatchConfig, TacticalMode } from './types';

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
    return { snapshot, state: 'circling', previousState: 'neutral', stateEnteredTick: 0, position: { x, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, grounded: true, wasGrounded: true, justLanded: false, groundedTicks: 1, locomotion: 'GROUNDED', facing: x < 0 ? 0 : Math.PI, health: snapshot.maxHealth, stamina: 100, balance: 100, currentIntent: 'probe', tacticalMode: 'balanced', awakeningAttempted: false, lastSignatureTick: -1000, nextDecisionTick: Math.round(18 + snapshot.behavior.patience * 20), lastCommandTick: -COMMAND_COOLDOWN_TICKS, lastSequence: -1, openingUntil: 0, cooldowns: {}, engagement: { phase: 'stalking', enteredTick: 0, clashUntil: 0, breakUntil: 0, resetUntil: 0, desiredRange: preferred, orbitDirection: x < 0 ? 1 : -1, lastCollisionTick: -1000 }, observedTellTick: -1, memory: { attacks: {}, successfulCounters: 0, failedCounters: 0, recentDamageTaken: 0 }, utilities: {}, readTells: [] };
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
  if (c.sequence <= (prior?.sequence ?? f.lastSequence)) throw new Error('Command sequence violation');
  // docs/combat/tell-revamped.md §5-6: commands may be freely issued/changed
  // at any point while the fighter is still reading (stalking) — there is no
  // cooldown. Once the fighter has committed to an exchange, coaching locks
  // until the next readable window.
  if (f.engagement.phase !== 'stalking') throw new Error('COMMAND_LOCKED');
  s.commands.push({ ...c });
  s.commands.sort((a, b) => a.effectiveTick - b.effectiveTick || (a.fighterId < b.fighterId ? -1 : a.fighterId > b.fighterId ? 1 : a.sequence - b.sequence));
}
function emit(s: CombatMatchState, f: Fighter, type: CombatEvent['type'], fields: Partial<CombatEvent> = {}) { s.eventBuffer.push({ type, tick: s.tick, fighterId: f.snapshot.fighterId, ...fields }); }

function traitLevel(f: Fighter, id: string) { return f.snapshot.evolution.traitLevels[id] ?? 0; }
function awakeningPower(f: Fighter) {
  return awakeningModifiers(f.awakening?.type)?.power ?? 1;
}
function pickAwakening(f: Fighter): AwakeningType {
  const available = f.snapshot.evolution.awakenings;
  return available.includes('apex') ? 'apex'
    : available.includes('flow-state') && traitLevel(f, 'counter-instinct') >= 3 ? 'flow-state'
    : available.includes('unbreakable') ? 'unbreakable'
    : available.includes('second-wind') && f.stamina < 28 ? 'second-wind'
    : available[0] ?? 'unbreakable';
}
function startAwakening(s: CombatMatchState, f: Fighter, type: AwakeningType) {
  f.awakeningAttempted = true;
  f.awakening = { type, startedTick: s.tick };
  f.balance = Math.max(f.balance, type === 'unbreakable' ? 55 : 40);
  emit(s, f, 'AWAKENING_STARTED', { detail: type });
}
function tryAwakening(s: CombatMatchState, f: Fighter, other: Fighter, rng: ReturnType<typeof createCombatRng>) {
  if (f.awakening || f.awakeningAttempted || !f.snapshot.evolution.awakenings.length) return;
  const healthRatio = f.health / f.snapshot.maxHealth;
  if (healthRatio > .18 || healthRatio >= other.health / other.snapshot.maxHealth) return;
  f.awakeningAttempted = true;
  const preferred = pickAwakening(f);
  const chance = clamp(.24 + f.snapshot.experience * .28 + (f.stamina < 20 ? .1 : 0) - (preferred === 'apex' ? .18 : 0), .08, .62);
  if (!rng.chance(chance)) return;
  startAwakening(s, f, preferred);
}
/** Manual override for a player-unlocked awakening. Still requires the
 * fighter to have earned it in career progression; only the in-fight RNG
 * gate is bypassed. */
export function triggerAwakening(s: CombatMatchState, fighterId: string, type?: AwakeningType): void {
  const f = s.fighters.find(f => f.snapshot.fighterId === fighterId);
  if (!f || s.phase !== 'active') throw new Error('No active fighter');
  if (f.awakening) throw new Error('Fighter is already awakened');
  if (f.awakeningAttempted) throw new Error('Fighter has already awakened this match');
  const requested = type ?? pickAwakening(f);
  if (!f.snapshot.evolution.awakenings.includes(requested)) throw new Error('Awakening not unlocked');
  startAwakening(s, f, requested);
}
function commandAlignment(f: Fighter, command: TacticalMode) {
  const b = f.snapshot.behavior;
  const temperament = command === 'pressure' ? (b.aggression + b.pressurePreference + b.persistence) / 3
    : command === 'counter' ? (b.counterPreference + b.patience + b.caution) / 3
    : command === 'defensive' ? (b.caution + b.patience + (1 - b.riskTolerance)) / 3
    : command === 'recover' ? (b.recoveryPreference + b.caution + (1 - b.aggression)) / 3
    : command === 'all_in' ? (b.aggression + b.riskTolerance + b.persistence) / 3 : .65;
  const discipline = f.snapshot.experience * .15 + f.snapshot.evolution.rivalryFamiliarity / 1000;
  const physical = command === 'recover' ? (100 - f.stamina) / 500 : f.balance < 30 ? -.08 : 0;
  return clamp(temperament + discipline + physical, .05, .95);
}
function resolveCoaching(s: CombatMatchState, f: Fighter, command: CombatCommand, rng: ReturnType<typeof createCombatRng>) {
  const roll = rng.next();
  const alignment = commandAlignment(f, command.command);
  const shifted = roll - (alignment - .5) * .45;
  const compliance: CommandCompliance = shifted < .08 ? 'commit' : shifted < .38 ? 'obey' : shifted < .7 ? 'partial' : shifted < .9 ? 'resist' : 'ignore';
  const strength = compliance === 'commit' ? 1.15 : compliance === 'obey' ? .9 : compliance === 'partial' ? .58 : compliance === 'resist' ? .28 : 0;
  f.tacticalMode = strength > 0 ? command.command : 'balanced';
  f.engagement.desiredRange = resetProfile(f).distance;
  f.coaching = { command: command.command, compliance, strength, issuedTick: command.issuedTick, exchangeTick: s.tick, successful: false };
  f.lastCommandTick = s.tick; f.lastSequence = command.sequence;
  emit(s, f, 'COMMAND', { detail: command.command });
  emit(s, f, 'COMMAND_RESPONSE', { detail: `${command.command}:${compliance}`, value: strength });
}
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
  const rushCost = f.snapshot.evolution.signatures.includes('relentless-rush') && (f.tacticalMode === 'pressure' || f.tacticalMode === 'all_in') ? 1.14 : 1;
  const awakeningCost = awakeningModifiers(f.awakening?.type)?.staminaCost ?? 1;
  const staminaCost = a.staminaCost * rushCost * awakeningCost;
  if (!free(f) || f.stamina < staminaCost || (f.cooldowns[id] ?? 0) > s.tick) return false;
  if (a.damage && f.engagement.phase === 'stalking') setEngagement(s, f, 'committing');
  f.lastActionId = id;
  // Cooldowns prevent one animation from looping mechanically, while still
  // allowing a fighter to return to that move during the same clash.
  f.cooldowns[id] = s.tick + a.startupTicks + a.activeTicks + a.recoveryTicks + (a.aerial ? 16 : id === 'peck_strike' ? 10 : 8);
  f.stamina = q(f.stamina - staminaCost);
  f.currentAction = { id, startedTick: s.tick, hit: false, phase: 'startup' };
  if (a.aerial) {
    f.aerial = { phase: 'PRELOAD', phaseTick: s.tick, launchedTick: -1, followups: 0,
      variant: id === 'flying_spur' ? 'bilateral' : f.engagement.orbitDirection > 0 ? 'right' : 'left',
      wingOffset: f.snapshot.stats.agility * .017 + s.tick * .13 };
  }
  transition(s, f, a.category === 'feint' ? 'feinting' : 'winding_up');
  emit(s, f, 'ATTACK_STARTED', { actionId: id });
  const signature = id === 'wing_counter' && f.snapshot.evolution.signatures.includes('sky-counter') ? 'sky-counter'
    : ['flying_spur', 'spur_lunge'].includes(id) && f.tacticalMode === 'pressure' && f.snapshot.evolution.signatures.includes('relentless-rush') ? 'relentless-rush'
    : id === 'sidestep' && f.snapshot.evolution.signatures.includes('ghost-step') ? 'ghost-step'
    : f.stamina < 25 && f.snapshot.evolution.signatures.includes('second-wind') ? 'second-wind' : undefined;
  if (signature && s.tick - f.lastSignatureTick > 120) {
    f.lastSignatureTick = s.tick;
    emit(s, f, 'SIGNATURE_TECHNIQUE', { actionId: signature, detail: signature });
  }
  if (a.damage || a.category === 'feint') emit(s, f, 'TELL_STARTED', { actionId: id, detail: a.category === 'feint' ? 'feint' : 'attack_windup' });
  return true;
}
function perceive(s: CombatMatchState, f: Fighter, other: Fighter, rng: ReturnType<typeof createCombatRng>) {
  const tell = other.currentAction;
  if (!tell || tell.phase !== 'startup' || f.observedTellTick === tell.startedTick || !free(f) || distance(f, other) > 2.8) return;
  if (!ACTIONS[tell.id].damage && ACTIONS[tell.id].category !== 'feint') return;
  f.observedTellTick = tell.startedTick;
  // Flow State reads tells almost on reflex: near-guaranteed detection, a
  // shorter reaction window, and a much higher willingness to commit into
  // the counter rather than just guarding/sidestepping.
  const flowState = f.awakening?.type === 'flow-state';
  if (!rng.chance(clamp(.35 + f.snapshot.stats.accuracy / 200 + f.snapshot.experience * .25 + (flowState ? .35 : 0)))) return;
  const delay = Math.round(clamp(17 - f.snapshot.stats.speed / 18 - f.snapshot.stats.agility / 36 - f.snapshot.experience * 4 + (100 - f.stamina) / 10 - (flowState ? 6 : 0), 5, 25));
  const b = f.snapshot.behavior;
  const meetChance = clamp(.35 + b.aggression * .35 + b.riskTolerance * .25 - b.caution * .15
    + (f.tacticalMode === 'pressure' || f.tacticalMode === 'all_in' ? .2 : 0)
    - (f.tacticalMode === 'recover' || f.tacticalMode === 'defensive' ? .3 : 0)
    + (flowState ? .35 : 0), .05, .85);
  const canMeet = (flowState || f.engagement.phase === 'stalking') && f.stamina >= (flowState ? 20 : 35) && f.balance >= (flowState ? 30 : 45);
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
  const b = f.snapshot.behavior, mode = f.tacticalMode, d = distance(f, other), coaching = f.coaching?.strength ?? (mode === 'balanced' ? 0 : 1);
  const pressure = clamp((s.tick - s.lastContactTick - 360) / 480), tired = 1 - f.stamina / 100;
  const reading = f.engagement.phase === 'stalking' && s.tick - f.engagement.enteredTick < readTicks(f);
  const opening = other.openingUntil > s.tick;
  const patternRead = Math.max(0, ...Object.values(f.memory.attacks)) >= 3 ? .15 + f.snapshot.experience * .5 + f.snapshot.evolution.rivalryFamiliarity / 180 : 0;
  const aggressive = mode === 'pressure' || mode === 'all_in';
  const behind = f.health / f.snapshot.maxHealth < other.health / other.snapshot.maxHealth - .12;
  const ahead = f.health / f.snapshot.maxHealth > other.health / other.snapshot.maxHealth + .15;
  const battleHardened = traitLevel(f, 'battle-hardened');
  const comeback = traitLevel(f, 'comeback-fighter');
  const bully = traitLevel(f, 'bully');
  const giantKiller = traitLevel(f, 'giant-killer');
  const onceBitten = traitLevel(f, 'once-bitten');
  const slowStarter = traitLevel(f, 'slow-starter');
  const lateFight = s.tick > s.config.maxTicks * .55;
  const scores: Record<string, number> = {
    peck_strike: d < 1.25 * f.snapshot.physical.reach ? .25 + b.aggression * .4 + pressure * .3 + (mode === 'pressure' ? coaching * .55 : 0) - tired : 0,
    spur_lunge: d < 1.65 * f.snapshot.physical.reach ? .2 + b.riskTolerance * .5 + pressure + (mode === 'all_in' ? 1 + coaching : mode === 'pressure' ? coaching : 0) - tired : 0,
    jump_kick: d > .9 && d < 1.8 ? .7 + b.aggression * .5 + f.snapshot.stats.agility / 120 + (opening ? .4 : 0) + (mode === 'pressure' ? coaching * .6 : 0) - tired : 0,
    flying_spur: d > 2.2 && d < 7.4 ? 1 + b.riskTolerance + b.pressurePreference + pressure + (mode === 'pressure' || mode === 'all_in' ? coaching * 1.2 : 0) - tired * 1.5 : 0,
    wing_counter: opening && d < 1.6 ? 1 + b.counterPreference * 2 + (mode === 'counter' ? 2.2 * coaching + .5 : 0) + f.snapshot.experience + patternRead + traitLevel(f, 'counter-instinct') * .18 : 0,
    guard: .05 + (mode === 'defensive' ? .65 + coaching : mode === 'counter' ? coaching * .35 : 0) + b.caution * .2 + patternRead - pressure,
    feint: d < 1.5 ? .1 + b.patience * .2 + b.counterPreference * .2 - tired : 0,
    advance: d > f.engagement.desiredRange - .45 ? .7 + pressure * 2 + b.pressurePreference + (aggressive ? .5 + coaching : 0) : 0,
    retreat: d < f.engagement.desiredRange - .9 ? .6 + tired + b.recoveryPreference * tired + (mode === 'recover' ? .8 + coaching * 1.25 : mode === 'defensive' || mode === 'counter' ? coaching * .35 : 0) - pressure * .3 : 0,
    circle: .45 + b.patience * .3 + (mode === 'counter' || mode === 'defensive' ? coaching * .8 : mode === 'recover' ? coaching : 0) - pressure * .3,
    recover: tired * 1.5 + (mode === 'recover' ? .6 + coaching * 1.4 : 0) - pressure,
  };
  if (f.memory.recentDamageTaken > 0) {
    scores.peck_strike += battleHardened * .12;
    scores.wing_counter += battleHardened * .18;
  }
  if (behind) { scores.circle += comeback * .12; scores.wing_counter += comeback * .16; if (lateFight) scores.advance += comeback * .18; }
  if (bully) { scores.advance += ahead ? bully * .2 : -bully * .08; scores.guard += behind ? bully * .1 : 0; }
  if (giantKiller && other.snapshot.physical.mass > f.snapshot.physical.mass) { scores.circle += giantKiller * .12; scores.wing_counter += giantKiller * .15; }
  if (onceBitten && f.memory.recentDamageTaken > 8) { scores.retreat += onceBitten * .25; scores.advance *= Math.max(.45, 1 - onceBitten * .14); }
  if (slowStarter && s.tick < s.config.maxTicks * .25) { scores.circle += slowStarter * .2; scores.advance *= Math.max(.55, 1 - slowStarter * .12); }
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
  if (f.snapshot.evolution.signatures.includes('relentless-rush')) { scores.advance *= 1.12; scores.flying_spur *= 1.12; scores.retreat *= .82; }
  if (f.snapshot.evolution.signatures.includes('sky-counter')) scores.wing_counter *= 1.22;
  if (f.snapshot.evolution.signatures.includes('ghost-step')) { scores.sidestep = (scores.sidestep ?? 0) * 1.2; scores.circle *= 1.12; }
  if (f.snapshot.evolution.signatures.includes('second-wind') && f.stamina < 30) { scores.recover *= 1.2; scores.retreat *= .85; }
  // Temporary legibility pass: amplify the command's silhouette until each
  // mode is unmistakable in playtests. Personality still controls the raw
  // utilities; this only widens the tactical separation between them.
  const exaggeration = TEMPORARY_COMBAT_EXAGGERATION * Math.max(.35, coaching);
  const initiatingAttacks = ['peck_strike', 'spur_lunge', 'jump_kick', 'flying_spur'];
  if (mode === 'pressure' || mode === 'all_in') {
    for (const id of initiatingAttacks) scores[id] *= 1 + exaggeration * 1.5;
    scores.advance *= 1 + exaggeration * 2;
    for (const id of ['guard', 'retreat', 'circle', 'recover']) scores[id] /= 1 + exaggeration * 3;
  } else if (mode === 'counter') {
    for (const id of initiatingAttacks) scores[id] /= 1 + exaggeration * 5;
    scores.advance /= 1 + exaggeration * 5;
    scores.wing_counter *= 1 + exaggeration * 2.5;
    for (const id of ['guard', 'retreat', 'circle', 'feint']) scores[id] *= 1 + exaggeration * 1.5;
    scores.sidestep = (scores.sidestep ?? .1) * (1 + exaggeration * 1.5);
  } else if (mode === 'defensive') {
    for (const id of [...initiatingAttacks, 'wing_counter']) scores[id] /= 1 + exaggeration * 8;
    scores.advance /= 1 + exaggeration * 8;
    scores.guard *= 1 + exaggeration * 5;
    scores.retreat *= 1 + exaggeration * 3;
    scores.circle *= 1 + exaggeration * 2;
    scores.sidestep = (scores.sidestep ?? .1) * (1 + exaggeration * 3);
  } else if (mode === 'recover') {
    for (const id of [...initiatingAttacks, 'wing_counter']) scores[id] = 0;
    scores.advance = 0;
    scores.retreat *= 1 + exaggeration * 6;
    scores.recover *= 1 + exaggeration * 5;
    scores.circle *= 1 + exaggeration * 2;
    scores.guard *= 1 + exaggeration;
  }
  f.utilities = scores;
  let roll = rng.next() * Object.values(scores).reduce((sum, x) => sum + x, 0);
  let choice = 'advance';
  for (const [id, score] of Object.entries(scores)) { roll -= score; if (score > 0 && roll <= 0) { choice = id; break; } }
  f.currentIntent = choice; emit(s, f, 'INTENT_CHANGED', { detail: choice });
  if (f.coaching) {
    const follows = f.coaching.command === 'pressure' || f.coaching.command === 'all_in' ? ['advance', 'peck_strike', 'spur_lunge', 'jump_kick', 'flying_spur'].includes(choice)
      : f.coaching.command === 'counter' ? ['circle', 'retreat', 'guard', 'sidestep', 'wing_counter'].includes(choice)
      : f.coaching.command === 'defensive' ? ['circle', 'retreat', 'guard', 'sidestep'].includes(choice)
      : f.coaching.command === 'recover' ? ['recover', 'retreat', 'circle', 'guard'].includes(choice) : true;
    f.coaching.successful ||= follows;
  }
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
    if (!action) {
      if ((f.tacticalMode === 'pressure' || f.tacticalMode === 'all_in') && d > 1.05) {
        forward = Math.max(forward, TEMPORARY_COMBAT_EXAGGERATION);
      } else if (f.tacticalMode === 'counter' && forward > 0) {
        forward /= 1 + TEMPORARY_COMBAT_EXAGGERATION * 2;
      } else if (f.tacticalMode === 'defensive' && d < f.engagement.desiredRange) {
        forward = Math.min(forward, -TEMPORARY_COMBAT_EXAGGERATION * .9);
      } else if (f.tacticalMode === 'recover' && d < f.engagement.desiredRange) {
        forward = -TEMPORARY_COMBAT_EXAGGERATION * 1.8;
        lateral *= .5;
      }
    }
    // A commitment is visibly different from neutral footwork: it accelerates
    // across medium/long range during the preload instead of walking into
    // attack distance. Collision projection remains the final authority.
    if (action?.damage && rt?.phase === 'startup' && f.engagement.phase === 'committing' && d > 1.15) forward = 15;
    if (action?.id === 'wing_counter' && rt?.phase === 'active') forward = 1.8;
    if (action?.id === 'spur_lunge' && rt?.phase === 'active') forward = 2;
    const awakenedSpeed = awakeningModifiers(f.awakening?.type)?.speed ?? 1;
    const speed = (.9 + f.snapshot.stats.speed / 120) * awakenedSpeed * f.snapshot.physical.mobility / f.snapshot.physical.mass * (.5 + f.stamina / 200) * (.6 + f.snapshot.condition * .4);
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
  for (const fighter of s.fighters) {
    if (!fighter.awakening || s.tick - fighter.awakening.startedTick < AWAKENING_DURATION_TICKS) continue;
    const expiredType = fighter.awakening.type;
    fighter.awakening = undefined;
    fighter.lastMirageEvadeTick = undefined;
    emit(s, fighter, 'AWAKENING_ENDED', { detail: expiredType });
  }
  // Landing is an edge, not a sticky state. Preserve it through both
  // normalization passes in this tick, then clear it before the next one.
  s.fighters.forEach(f => { f.justLanded = false; });
  const rng = createCombatRng(s.rngState);
  for (const f of s.fighters) {
    // Coaching belongs to the next quiet read window. Commands issued while a
    // clash is playing remain buffered instead of becoming mid-clash QTEs. If
    // the coach revises the plan before that window, the newest call wins.
    const c = s.commands.filter(command => command.fighterId === f.snapshot.fighterId && command.effectiveTick <= s.tick && command.sequence > f.lastSequence).at(-1);
    if (c && f.engagement.phase === 'stalking') resolveCoaching(s, f, c, rng);
  }
  s.fighters.forEach(f => { timeline(s, f); updateEngagement(s, f); });
  s.fighters.forEach((f, i) => perceive(s, f, s.fighters[1 - i], rng));
  s.fighters.forEach((f, i) => decide(s, f, s.fighters[1 - i], rng));
  s.fighters.forEach((f, i) => updateReadTells(s, f, s.fighters[1 - i], rng));
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
    const targetAwakening = awakeningModifiers(target.awakening?.type);
    if (targetAwakening?.evadeChance && rng.chance(targetAwakening.evadeChance)) {
      // Flow State does not teleport. It makes a short, explosive lateral slip
      // off the attack line, then exposes the old pose to presentation as a
      // frozen afterimage. The seeded RNG keeps both the dodge and its side
      // deterministic in replay.
      const side = rng.chance(.5) ? 1 : -1;
      const slipAngle = target.facing + side * Math.PI / 2;
      const slipDistance = target.awakening?.type === 'flow-state' ? .62 : .4;
      target.position.x += Math.cos(slipAngle) * slipDistance;
      target.position.z += Math.sin(slipAngle) * slipDistance;
      const maxRadius = s.config.arena.radius - bodyRadius(target);
      const radialDistance = Math.hypot(target.position.x, target.position.z);
      if (radialDistance > maxRadius) {
        target.position.x *= maxRadius / radialDistance;
        target.position.z *= maxRadius / radialDistance;
      }
      target.velocity.x = Math.cos(slipAngle) * 4.5;
      target.velocity.z = Math.sin(slipAngle) * 4.5;
      target.lastMirageEvadeTick = s.tick;
      emit(s, target, 'EVADE', { targetId: f.snapshot.fighterId, actionId: a.id, detail: target.awakening?.type === 'flow-state' ? 'MIRAGE_EVADE' : 'AWAKENED_EVADE' });
      return;
    }
    const blocked = target.state === 'defending';
    const blockMultiplier = blocked ? target.tacticalMode === 'defensive' ? .25 / TEMPORARY_COMBAT_EXAGGERATION : .25 : 1;
    const damage = q(a.damage * (.6 + f.snapshot.stats.power / 100) * awakeningPower(f) * (zone === 'head' ? 1.15 * target.snapshot.physical.neck : 1) * (.65 + f.stamina / 285) * (.8 + f.snapshot.condition * .2) / (1 + target.snapshot.stats.defense / 120) / target.snapshot.physical.mass * blockMultiplier * (targetAwakening?.incomingDamage ?? 1));
    const resistance = target.currentAction ? ACTIONS[target.currentAction.id].interruptResistance : 0;
    // Balanced strikes and deliberate meet-in counters follow through so overlapping hits can trade.
    // Ordinary startup and off-balance attacks can still be stuffed; damage is never suppressed.
    const hardened = traitLevel(target, 'battle-hardened');
    const resolve = (targetAwakening?.resolve ?? 0) + (hardened >= 3 ? 12 : hardened === 2 ? 5 : hardened === 1 ? -4 : 0);
    const followingThrough = target.currentAction && ACTIONS[target.currentAction.id].damage > 0 && target.balance + resolve >= 45
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
  s.fighters.forEach((f, index) => tryAwakening(s, f, s.fighters[1 - index], rng));
  // Collision resolution can interrupt an action after movement. Reassert the
  // physics invariant so neither fighter can retain an airborne presentation
  // after their own root has landed; each fighter is normalized independently.
  s.fighters.forEach(f => normalizePhysicsState(s, f));
  for (const f of s.fighters) {
    const awakened = awakeningModifiers(f.awakening?.type);
    const reserves = f.stamina < 30 ? traitLevel(f, 'deep-reserves') * .025 : 0;
    f.stamina = q(clamp(f.stamina + (f.currentAction ? .04 : .10 + f.snapshot.stats.stamina / 1200) + (awakened?.staminaRecovery ?? 0) + reserves, 0, 100));
    f.balance = q(clamp(f.balance + .08 * f.snapshot.physical.wingControl + (awakened?.balanceRecovery ?? 0), 0, 100));
    f.memory.recentDamageTaken = q(Math.max(0, f.memory.recentDamageTaken - .035));
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
