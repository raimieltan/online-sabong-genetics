export type Vec3 = { x: number; y: number; z: number };
/** Physics-owned locomotion. Combat state deliberately does not decide this. */
export type LocomotionState = 'GROUNDED' | 'AIRBORNE';
export type AerialPhase = 'PRELOAD' | 'TAKEOFF' | 'AIRBORNE' | 'STRIKE_ACTIVE' | 'IMPACT' | 'RECOVERY' | 'LAND';
export interface AerialRuntime {
  phase: AerialPhase; phaseTick: number; launchedTick: number; variant: 'left' | 'right' | 'bilateral';
  followups: number; wingOffset: number;
  recoil?: { tick: number; zone: string; strength: number; side: number };
}
export type TacticalMode = 'balanced' | 'pressure' | 'defensive' | 'counter' | 'recover' | 'all_in';
export type CommandCompliance = 'ignore' | 'resist' | 'partial' | 'obey' | 'commit';
export type AwakeningType = 'unbreakable' | 'berserker' | 'flow-state' | 'second-wind' | 'apex';
export type FighterState = 'neutral' | 'advancing' | 'retreating' | 'circling' | 'feinting' | 'winding_up' | 'attacking' | 'defending' | 'evading' | 'countering' | 'recovering' | 'staggered' | 'down' | 'finished';
export type EngagementPhase = 'stalking' | 'committing' | 'clashing' | 'breaking' | 'resetting';
export type Behavior = Record<'aggression' | 'caution' | 'patience' | 'persistence' | 'riskTolerance' | 'counterPreference' | 'pressurePreference' | 'recoveryPreference', number>;
export interface FighterCombatSnapshot {
  readonly fighterId: string;
  readonly playerId: string;
  readonly name: string;
  readonly stats: Readonly<Record<'power' | 'speed' | 'agility' | 'accuracy' | 'defense' | 'stamina', number>>;
  readonly physical: Readonly<{ mass: number; reach: number; mobility: number; stability: number; wingControl: number; neck: number }>;
  readonly behavior: Readonly<Behavior>;
  readonly experience: number;
  readonly condition: number;
  readonly maxHealth: number;
  readonly evolution: Readonly<{
    traitLevels: Readonly<Record<string, number>>;
    signatures: readonly ('relentless-rush' | 'sky-counter' | 'ghost-step' | 'second-wind')[];
    awakenings: readonly AwakeningType[];
    rivalryFamiliarity: number;
  }>;
}
export interface ActionDefinition {
  readonly id: string;
  readonly category: 'attack' | 'counter' | 'defense' | 'evade' | 'feint';
  readonly startupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly staminaCost: number;
  readonly range: number;
  readonly damage: number;
  readonly interruptPower: number;
  readonly interruptResistance: number;
  readonly tracking: number;
  readonly aerial?: { height: number; takeoffTick: number; flightTicks: number; speed: number };
}
export interface ActionRuntime { id: string; startedTick: number; hit: boolean; phase: 'startup' | 'active' | 'recovery'; meetingCommitment?: boolean }
export interface FighterRuntimeState {
  snapshot: FighterCombatSnapshot;
  state: FighterState;
  previousState: FighterState;
  stateEnteredTick: number;
  position: Vec3;
  velocity: Vec3;
  /** Contact-derived state, updated after every physics movement step. */
  grounded: boolean;
  wasGrounded: boolean;
  justLanded: boolean;
  groundedTicks: number;
  locomotion: LocomotionState;
  facing: number;
  health: number;
  stamina: number;
  balance: number;
  currentIntent: string;
  currentAction?: ActionRuntime;
  aerial?: AerialRuntime;
  tacticalMode: TacticalMode;
  coaching?: { command: TacticalMode; compliance: CommandCompliance; strength: number; issuedTick: number; exchangeTick: number; successful: boolean };
  awakening?: { type: AwakeningType; startedTick: number };
  awakeningAttempted: boolean;
  lastSignatureTick: number;
  nextDecisionTick: number;
  lastCommandTick: number;
  lastSequence: number;
  openingUntil: number;
  cooldowns: Record<string, number>;
  lastActionId?: string;
  engagement: { phase: EngagementPhase; enteredTick: number; clashUntil: number; breakUntil: number; resetUntil: number; desiredRange: number; orbitDirection: number; lastCollisionTick: number };
  reaction?: { sourceTick: number; readyTick: number; actionId: string };
  observedTellTick: number;
  memory: { attacks: Record<string, number>; successfulCounters: number; failedCounters: number; recentDamageTaken: number };
  utilities: Record<string, number>;
}
export interface CombatCommand { playerId: string; fighterId: string; command: TacticalMode; issuedTick: number; effectiveTick: number; sequence: number }
export interface CombatEvent { type: 'ENGAGEMENT_CHANGED' | 'CLASH_STARTED' | 'CLASH_ENDED' | 'COLLISION' | 'STATE_CHANGED' | 'INTENT_CHANGED' | 'TELL_STARTED' | 'TELL_DETECTED' | 'ATTACK_STARTED' | 'ATTACK_ACTIVE' | 'ATTACK_MISSED' | 'ATTACK_LANDED' | 'BLOCK' | 'EVADE' | 'COUNTER_LANDED' | 'DAMAGE' | 'STAGGER' | 'COMMAND' | 'COMMAND_RESPONSE' | 'SIGNATURE_TECHNIQUE' | 'AWAKENING_STARTED' | 'MATCH_FINISHED'; tick: number; fighterId: string; targetId?: string; actionId?: string; value?: number; detail?: string }
export interface MatchConfig { id: string; version: string; seed: number; fighterA: FighterCombatSnapshot; fighterB: FighterCombatSnapshot; arena: { radius: number }; maxTicks: number; commands?: CombatCommand[] }
export interface MatchResult { winnerId: string | null; finishReason: 'KO' | 'double_KO' | 'time_limit'; durationTicks: number }
export interface CombatMatchState { config: MatchConfig; tick: number; phase: 'active' | 'paused' | 'finished'; rngState: number; fighters: [FighterRuntimeState, FighterRuntimeState]; commands: CombatCommand[]; eventBuffer: CombatEvent[]; lastContactTick: number; result?: MatchResult }
