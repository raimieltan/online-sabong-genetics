import { ACTION_DEFINITIONS, legalActions } from "./actions";
import { generateBattleAnalysis } from "./analysis";
import { chooseAction, type DecisionContext } from "./behavior";
import { gainExperience, updateOpponentModel } from "./experience";
import { clampFatigue, fatigueGain, fatigueRecoveryPerTurn, fatigueStatMultiplier } from "./fatigue";
import { createInjuryRecord, rollInjurySeverity } from "./injuries";
import { decayMomentum, momentumRiskNudge } from "./momentum";
import { applyMentalState, deriveMentalState } from "./mentalState";
import { deriveCombatIdentity, withIdentity } from "./identity";
import { shouldForceEngagement, STALEMATE_TURNS } from "./inactivity";
import { deriveContextState } from "./positioning";
import { isOffensive, resolveExchange } from "./resolution";
import { effectiveStat } from "./stats";
import { makeCombatantState, type CombatantState } from "./state";
import { selectTell } from "./tells";
import { exchangeDurationMs } from "./timeline";
import { resolvePhysicalProfile } from "../physicalProfile";
import { isDevModeEnabled } from "../dev";
import { COMMAND_ACTIVE_TURNS, COMMAND_POINTS_MAX, COMMAND_POINT_REGEN_TURNS, commandTargetsAction, type PlayerCommand } from "./command";
import type {
  Chicken,
  CombatAction,
  CombatContextState,
  CombatExperienceCategory,
  CombatLogEntry,
  CombatResult,
  InjuryRecord,
} from "../types";

export type Rng = () => number;

export const MAX_TURNS = 300;

function pickForcedOffensiveAction(legal: readonly CombatAction[]): CombatAction | null {
  const priority: readonly CombatAction[] = ["LIGHT_ATTACK", "PRESSURE", "HEAVY_ATTACK"];
  for (const action of priority) {
    if (legal.includes(action)) return action;
  }
  return null;
}

function categoryForAction(action: CombatAction): CombatExperienceCategory {
  switch (action) {
    case "LIGHT_ATTACK":
    case "HEAVY_ATTACK":
      return "offensive";
    case "PRESSURE":
      return "pressure";
    case "EVADE":
    case "REPOSITION":
      return "evasion";
    case "COUNTER":
      return "counter";
    case "GUARD":
      return "defensive";
    case "RECOVER":
      return "recovery";
  }
}

function initiativeScore(chicken: Chicken, action: CombatAction, physicalMobility: number, fatigue: number, rng: Rng): number {
  const spd = effectiveStat(chicken, "speed") * physicalMobility * fatigueStatMultiplier(fatigue);
  return spd * (1 - ACTION_DEFINITIONS[action].commitment * 0.2) + rng() * 10;
}

/** What a coach (player or Auto-Coach) sees before deciding whether to spend a CommandPoint this turn. */
export type CoachObservation = {
  turn: number;
  own: {
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    momentum: number;
    mentalState: CombatantState["mentalState"];
    commandPoints: number;
  };
  opponentContextState: CombatContextState;
  opponentRecentActions: readonly CombatAction[];
};

export type CoachFn = (obs: CoachObservation) => PlayerCommand | null;

export type SimulateBattleOptions = {
  coachA?: CoachFn;
  coachB?: CoachFn;
};

/**
 * Either a live/manual command (or `null`/`undefined` for "nothing issued
 * this turn") or a `CoachFn` that decides it from the turn's observation —
 * `BattleSession.step` accepts either so the same stepping path serves a
 * human clicking buttons in real time and an automated coach policy.
 */
export type CommandSource = PlayerCommand | null | undefined | CoachFn;

function resolveCommandSource(source: CommandSource, obs: CoachObservation): PlayerCommand | null {
  if (typeof source === "function") return source(obs);
  return source ?? null;
}

export type TurnStepResult = {
  turn: number;
  entries: readonly CombatLogEntry[];
  fightOver: boolean;
  observationA: CoachObservation;
  observationB: CoachObservation;
  /** Real wall-clock duration (ms) this turn's exchange takes to play out — see combat/timeline.ts. */
  durationMs: number;
};

/**
 * One fully-resolved V2 turn-based battle, steppable one turn at a time so a
 * real player can watch state (HP, CommandPoints, mental state) and issue a
 * `PlayerCommand` between turns instead of only ever pre-supplying a `CoachFn`
 * up front. `simulateBattle` below is just this run to completion in a tight
 * loop with `options.coachA`/`coachB` as the per-turn command source, so both
 * paths share one implementation and can never drift.
 */
export class BattleSession {
  readonly chickenA: Chicken;
  readonly chickenB: Chicken;
  private readonly rng: Rng;
  private readonly stateA: CombatantState;
  private readonly stateB: CombatantState;
  private readonly physicalA: ReturnType<typeof resolvePhysicalProfile>;
  private readonly physicalB: ReturnType<typeof resolvePhysicalProfile>;
  private readonly log: CombatLogEntry[] = [];

  turn = 0;
  fightOver = false;
  private noDamageStreak = 0;
  private outcomeReason: CombatResult["outcomeReason"] = "timeout";
  private injuredChickenId: string | null = null;
  private winner: CombatantState;
  private loser: CombatantState;

  constructor(chickenA: Chicken, chickenB: Chicken, rng: Rng = Math.random) {
    this.chickenA = chickenA;
    this.chickenB = chickenB;
    this.rng = rng;
    this.stateA = makeCombatantState(chickenA);
    this.stateB = makeCombatantState(chickenB);
    this.physicalA = resolvePhysicalProfile(chickenA);
    this.physicalB = resolvePhysicalProfile(chickenB);
    this.winner = this.stateA;
    this.loser = this.stateB;
  }

  get log_(): readonly CombatLogEntry[] {
    return this.log;
  }

  /** CommandPoints/mental-state snapshot for side A, for a UI to render between steps without waiting on a turn result. */
  snapshotA(): CoachObservation["own"] & { pendingCommand: PlayerCommand | null } {
    return {
      hp: this.stateA.hp, maxHp: this.stateA.maxHp, stamina: this.stateA.stamina, maxStamina: this.stateA.maxStamina,
      momentum: this.stateA.momentum, mentalState: this.stateA.mentalState, commandPoints: this.stateA.commandPoints,
      pendingCommand: this.stateA.pendingCommand,
    };
  }

  snapshotB(): CoachObservation["own"] & { pendingCommand: PlayerCommand | null } {
    return {
      hp: this.stateB.hp, maxHp: this.stateB.maxHp, stamina: this.stateB.stamina, maxStamina: this.stateB.maxStamina,
      momentum: this.stateB.momentum, mentalState: this.stateB.mentalState, commandPoints: this.stateB.commandPoints,
      pendingCommand: this.stateB.pendingCommand,
    };
  }

  /**
   * Resolves exactly one turn. `sourceA`/`sourceB` are only consulted once
   * this turn's CommandPoints regen has landed, same as the old inline
   * `options.coachA` check — a manual command supplied when CP < 1 is simply
   * ignored (mirrors "imperfect command compliance" never being free).
   */
  step(sourceA?: CommandSource, sourceB?: CommandSource): TurnStepResult {
    const { chickenA, chickenB, rng } = this;
    const stateA = this.stateA;
    const stateB = this.stateB;
    const physicalA = this.physicalA;
    const physicalB = this.physicalB;

    this.turn += 1;
    const turn = this.turn;
    const entries: CombatLogEntry[] = [];

    stateA.staggerTurns = Math.max(0, stateA.staggerTurns - 1);
    stateB.staggerTurns = Math.max(0, stateB.staggerTurns - 1);
    stateA.recoveryTurns = Math.max(0, stateA.recoveryTurns - 1);
    stateB.recoveryTurns = Math.max(0, stateB.recoveryTurns - 1);
    stateA.momentum = decayMomentum(stateA.momentum);
    stateB.momentum = decayMomentum(stateB.momentum);

    const contextA = deriveContextState({
      position: stateA.position,
      momentum: stateA.momentum,
      fatigue: stateA.fatigue,
      staggerTurns: stateA.staggerTurns,
      recoveryTurns: stateA.recoveryTurns,
      staminaRatio: stateA.stamina / stateA.maxStamina,
    });
    const contextB = deriveContextState({
      position: stateB.position,
      momentum: stateB.momentum,
      fatigue: stateB.fatigue,
      staggerTurns: stateB.staggerTurns,
      recoveryTurns: stateB.recoveryTurns,
      staminaRatio: stateB.stamina / stateB.maxStamina,
    });

    const legalA = legalActions(stateA.stamina, stateA.staggerTurns, stateA.recoveryTurns);
    const legalB = legalActions(stateB.stamina, stateB.staggerTurns, stateB.recoveryTurns);

    const decisionCtxA: DecisionContext = {
      stamina: stateA.stamina,
      maxStamina: stateA.maxStamina,
      fatigue: stateA.fatigue,
      momentum: stateA.momentum,
      position: stateA.position,
      distance: stateA.distance,
      contextState: contextA,
      opponentContextState: contextB,
      style: chickenA.fightingStyle,
      physical: physicalA,
      pendingCommand: stateA.pendingCommand,
      noDamageStreak: this.noDamageStreak,
      experience: stateA.experience,
      opponentModel: stateA.opponentModel,
      rng,
    };
    const decisionCtxB: DecisionContext = {
      stamina: stateB.stamina,
      maxStamina: stateB.maxStamina,
      fatigue: stateB.fatigue,
      momentum: stateB.momentum,
      position: stateB.position,
      distance: stateB.distance,
      contextState: contextB,
      opponentContextState: contextA,
      style: chickenB.fightingStyle,
      physical: physicalB,
      pendingCommand: stateB.pendingCommand,
      noDamageStreak: this.noDamageStreak,
      experience: stateB.experience,
      opponentModel: stateB.opponentModel,
      rng,
    };

    stateA.mentalState = deriveMentalState({
      hpRatio: stateA.hp / stateA.maxHp,
      staminaRatio: stateA.stamina / stateA.maxStamina,
      momentum: stateA.momentum,
      recentExchangeResult: stateA.wasHitLastTurn ? "taken" : "neutral",
      experience: stateA.experience,
    });
    stateB.mentalState = deriveMentalState({
      hpRatio: stateB.hp / stateB.maxHp,
      staminaRatio: stateB.stamina / stateB.maxStamina,
      momentum: stateB.momentum,
      recentExchangeResult: stateB.wasHitLastTurn ? "taken" : "neutral",
      experience: stateB.experience,
    });

    const identityA = applyMentalState(deriveCombatIdentity(stateA.behavior), stateA.mentalState);
    const identityB = applyMentalState(deriveCombatIdentity(stateB.behavior), stateB.mentalState);
    identityA.riskTolerance = Math.min(1, Math.max(0, identityA.riskTolerance + momentumRiskNudge(stateA.momentum)));
    identityB.riskTolerance = Math.min(1, Math.max(0, identityB.riskTolerance + momentumRiskNudge(stateB.momentum)));
    const effectiveProfileA = withIdentity(stateA.behavior, identityA);
    const effectiveProfileB = withIdentity(stateB.behavior, identityB);

    stateA.commandPoints = Math.min(COMMAND_POINTS_MAX, stateA.commandPoints + 1 / COMMAND_POINT_REGEN_TURNS);
    stateB.commandPoints = Math.min(COMMAND_POINTS_MAX, stateB.commandPoints + 1 / COMMAND_POINT_REGEN_TURNS);

    // Dev-mode cheat: keep the player's (side A) CommandPoints topped off so commands
    // are never gated behind regen while testing. Never active in production
    // (see lib/dev.ts) — side B (NPC/opponent) is untouched.
    if (isDevModeEnabled()) {
      stateA.commandPoints = COMMAND_POINTS_MAX;
    }

    if (stateA.pendingCommandTurnsLeft > 0) stateA.pendingCommandTurnsLeft -= 1;
    else stateA.pendingCommand = null;
    if (stateB.pendingCommandTurnsLeft > 0) stateB.pendingCommandTurnsLeft -= 1;
    else stateB.pendingCommand = null;

    const observationA: CoachObservation = {
      turn,
      own: {
        hp: stateA.hp, maxHp: stateA.maxHp, stamina: stateA.stamina, maxStamina: stateA.maxStamina,
        momentum: stateA.momentum, mentalState: stateA.mentalState, commandPoints: stateA.commandPoints,
      },
      opponentContextState: contextB,
      opponentRecentActions: stateA.opponentModel.recentActions,
    };
    const observationB: CoachObservation = {
      turn,
      own: {
        hp: stateB.hp, maxHp: stateB.maxHp, stamina: stateB.stamina, maxStamina: stateB.maxStamina,
        momentum: stateB.momentum, mentalState: stateB.mentalState, commandPoints: stateB.commandPoints,
      },
      opponentContextState: contextA,
      opponentRecentActions: stateB.opponentModel.recentActions,
    };

    if (stateA.commandPoints >= 1) {
      const cmd = resolveCommandSource(sourceA, observationA);
      if (cmd) {
        stateA.pendingCommand = cmd;
        stateA.pendingCommandTurnsLeft = COMMAND_ACTIVE_TURNS;
        stateA.commandPoints -= 1;
      }
    }
    if (stateB.commandPoints >= 1) {
      const cmd = resolveCommandSource(sourceB, observationB);
      if (cmd) {
        stateB.pendingCommand = cmd;
        stateB.pendingCommandTurnsLeft = COMMAND_ACTIVE_TURNS;
        stateB.commandPoints -= 1;
      }
    }

    if (shouldForceEngagement(this.noDamageStreak)) {
      if (!stateA.pendingCommand) { stateA.pendingCommand = "FORCE_ENGAGEMENT"; stateA.pendingCommandTurnsLeft = 1; }
      if (!stateB.pendingCommand) { stateB.pendingCommand = "FORCE_ENGAGEMENT"; stateB.pendingCommandTurnsLeft = 1; }
    }

    let actionA = chooseAction(effectiveProfileA, legalA, decisionCtxA);
    let actionB = chooseAction(effectiveProfileB, legalB, decisionCtxB);

    if (this.noDamageStreak >= STALEMATE_TURNS && !isOffensive(actionA) && !isOffensive(actionB)) {
      const forceA = stateA.behavior.caution <= stateB.behavior.caution;
      const forced = pickForcedOffensiveAction(forceA ? legalA : legalB);
      if (forced) {
        if (forceA) actionA = forced;
        else actionB = forced;
      }
    }

    // Phase A.5 — one beat before either fighter's committed action actually
    // resolves, read its own intent tier off the *final* action (post
    // stalemate-override above), never the raw pre-override pick.
    const tellA = selectTell(effectiveProfileA, actionA, decisionCtxA);
    const tellB = selectTell(effectiveProfileB, actionB, decisionCtxB);

    // Same "final action" rule applies here: whether a pending command was
    // actually followed is judged off what the fighter ended up doing, not
    // its pre-stalemate-override pick.
    const commandFollowedA = stateA.pendingCommand !== null && commandTargetsAction(stateA.pendingCommand, actionA);
    const commandFollowedB = stateB.pendingCommand !== null && commandTargetsAction(stateB.pendingCommand, actionB);

    const durationMs = exchangeDurationMs(actionA, physicalA, stateA.fatigue, actionB, physicalB, stateB.fatigue);

    const initiativeA = initiativeScore(chickenA, actionA, physicalA.mobility, stateA.fatigue, rng);
    const initiativeB = initiativeScore(chickenB, actionB, physicalB.mobility, stateB.fatigue, rng);
    const firstIsA = initiativeA >= initiativeB;

    const outcome = resolveExchange({
      first: firstIsA ? stateA : stateB,
      firstAction: firstIsA ? actionA : actionB,
      firstPhysical: firstIsA ? physicalA : physicalB,
      second: firstIsA ? stateB : stateA,
      secondAction: firstIsA ? actionB : actionA,
      secondPhysical: firstIsA ? physicalB : physicalA,
      rng,
    });

    const defA = ACTION_DEFINITIONS[actionA];
    const defB = ACTION_DEFINITIONS[actionB];
    stateA.fatigue = clampFatigue(stateA.fatigue + fatigueGain(Math.max(0, defA.staminaCost), defA.commitment) - fatigueRecoveryPerTurn(actionA));
    stateB.fatigue = clampFatigue(stateB.fatigue + fatigueGain(Math.max(0, defB.staminaCost), defB.commitment) - fatigueRecoveryPerTurn(actionB));

    stateA.opponentModel = updateOpponentModel(stateA.opponentModel, actionB, stateB.stamina / stateB.maxStamina, stateB.distance);
    stateB.opponentModel = updateOpponentModel(stateB.opponentModel, actionA, stateA.stamina / stateA.maxStamina, stateA.distance);

    const attackerState = outcome.attackerId === chickenA.id ? stateA : stateB;
    const defenderState = outcome.defenderId === chickenA.id ? stateA : stateB;
    attackerState.battleExperienceGain = gainExperience(
      attackerState.battleExperienceGain,
      categoryForAction(outcome.attackerAction),
      outcome.hit.isMiss ? 1 : outcome.hit.isCrit ? 4 : 2
    );
    if (outcome.isCounterSwitch) {
      attackerState.battleExperienceGain = gainExperience(attackerState.battleExperienceGain, "adaptation", 2);
    }
    if (outcome.defenderAction === "EVADE" || outcome.defenderAction === "REPOSITION" || outcome.defenderAction === "GUARD") {
      defenderState.battleExperienceGain = gainExperience(
        defenderState.battleExperienceGain,
        categoryForAction(outcome.defenderAction),
        outcome.hit.isMiss ? 3 : 1
      );
    }

    attackerState.wasHitLastTurn = false;
    defenderState.wasHitLastTurn = !outcome.hit.isMiss;

    entries.push({
      turn,
      attackerId: outcome.attackerId,
      defenderId: outcome.defenderId,
      damage: outcome.hit.damage,
      hitZone: outcome.hit.hitZone,
      isMiss: outcome.hit.isMiss,
      isCrit: outcome.hit.isCrit,
      isCounter: outcome.isCounterSwitch,
      isCritical: outcome.hit.isCritical,
      defenderHp: defenderState.hp,
      stagger: outcome.hit.stagger,
      timestamp: Date.now(),
      attackerAction: outcome.attackerAction,
      defenderAction: outcome.defenderAction,
      attackerState: outcome.attackerId === chickenA.id ? contextA : contextB,
      defenderState: outcome.defenderId === chickenA.id ? contextA : contextB,
      momentum: { attacker: attackerState.momentum, defender: defenderState.momentum },
      position: attackerState.position,
      distance: attackerState.distance,
      fatigue: { attacker: attackerState.fatigue, defender: defenderState.fatigue },
      attackerTell: outcome.attackerId === chickenA.id ? tellA : tellB,
      defenderTell: outcome.defenderId === chickenA.id ? tellA : tellB,
      attackerCommandFollowed: outcome.attackerId === chickenA.id ? commandFollowedA : commandFollowedB,
      defenderCommandFollowed: outcome.defenderId === chickenA.id ? commandFollowedA : commandFollowedB,
      durationMs,
    });

    if (outcome.hit.isCritical) {
      this.fightOver = true;
      this.outcomeReason = "critical_injury";
      this.injuredChickenId = defenderState.chicken.id;
      this.winner = attackerState;
      this.loser = defenderState;
    } else if (defenderState.hp <= 0) {
      this.fightOver = true;
      this.outcomeReason = "ko";
      this.winner = attackerState;
      this.loser = defenderState;
    }

    if (!this.fightOver && outcome.returnExchange) {
      const re = outcome.returnExchange;
      const reAttackerState = re.attackerId === chickenA.id ? stateA : stateB;
      const reDefenderState = re.defenderId === chickenA.id ? stateA : stateB;
      reAttackerState.battleExperienceGain = gainExperience(
        reAttackerState.battleExperienceGain,
        categoryForAction(re.attackerAction),
        re.hit.isMiss ? 1 : re.hit.isCrit ? 4 : 2
      );
      reAttackerState.wasHitLastTurn = false;
      reDefenderState.wasHitLastTurn = !re.hit.isMiss;

      entries.push({
        turn,
        attackerId: re.attackerId,
        defenderId: re.defenderId,
        damage: re.hit.damage,
        hitZone: re.hit.hitZone,
        isMiss: re.hit.isMiss,
        isCrit: re.hit.isCrit,
        isCounter: false,
        isCritical: re.hit.isCritical,
        defenderHp: reDefenderState.hp,
        stagger: re.hit.stagger,
        timestamp: Date.now(),
        attackerAction: re.attackerAction,
        defenderAction: re.defenderAction,
        attackerState: re.attackerId === chickenA.id ? contextA : contextB,
        defenderState: re.defenderId === chickenA.id ? contextA : contextB,
        momentum: { attacker: reAttackerState.momentum, defender: reDefenderState.momentum },
        position: reAttackerState.position,
        distance: reAttackerState.distance,
        fatigue: { attacker: reAttackerState.fatigue, defender: reDefenderState.fatigue },
        attackerCommandFollowed: re.attackerId === chickenA.id ? commandFollowedA : commandFollowedB,
        defenderCommandFollowed: re.defenderId === chickenA.id ? commandFollowedA : commandFollowedB,
        durationMs,
      });

      if (re.hit.isCritical) {
        this.fightOver = true;
        this.outcomeReason = "critical_injury";
        this.injuredChickenId = reDefenderState.chicken.id;
        this.winner = reAttackerState;
        this.loser = reDefenderState;
      } else if (reDefenderState.hp <= 0) {
        this.fightOver = true;
        this.outcomeReason = "ko";
        this.winner = reAttackerState;
        this.loser = reDefenderState;
      }
    }

    const turnDamage = outcome.hit.damage + (outcome.returnExchange?.hit.damage ?? 0);
    this.noDamageStreak = turnDamage > 0 ? 0 : this.noDamageStreak + 1;

    this.log.push(...entries);
    return { turn, entries, fightOver: this.fightOver, observationA, observationB, durationMs };
  }

  /** Settles tie-break/injury/experience/analysis once `fightOver` (or `turn >= MAX_TURNS`) — same tail `simulateBattle` always ran. */
  finalize(): CombatResult {
    const { chickenA, chickenB, rng } = this;
    const stateA = this.stateA;
    const stateB = this.stateB;

    if (!this.fightOver) {
      this.outcomeReason = "timeout";
      if (stateA.hp === stateB.hp) {
        const totalA = effectiveStat(chickenA, "power") + effectiveStat(chickenA, "stamina");
        const totalB = effectiveStat(chickenB, "power") + effectiveStat(chickenB, "stamina");
        this.winner = totalB > totalA ? stateB : stateA;
        this.loser = this.winner === stateA ? stateB : stateA;
      } else {
        this.winner = stateA.hp > stateB.hp ? stateA : stateB;
        this.loser = this.winner === stateA ? stateB : stateA;
      }
    }

    const winner = this.winner;
    const loser = this.loser;

    const newInjuries: Record<string, InjuryRecord[]> = { [chickenA.id]: [], [chickenB.id]: [] };
    const severity = rollInjurySeverity({
      rng,
      wasCriticalInjury: this.outcomeReason === "critical_injury",
      wasKo: this.outcomeReason === "ko",
      hasSurvivorTrait: loser.chicken.traits.some((t) => t.id === "survivor"),
    });
    if (severity) newInjuries[loser.chicken.id] = [createInjuryRecord(rng, severity)];

    const damageTaken = (state: CombatantState) => state.maxHp - state.hp;
    const conditionDelta: Record<string, number> = {
      [winner.chicken.id]: -Math.min(15, damageTaken(winner) / winner.maxHp * 20),
      [loser.chicken.id]: -Math.min(30, 8 + (damageTaken(loser) / loser.maxHp) * 25),
    };

    const result: CombatResult = {
      winnerId: winner.chicken.id,
      loserId: loser.chicken.id,
      log: this.log,
      totalTurns: this.turn,
      outcomeReason: this.outcomeReason,
      injuredChickenId: this.injuredChickenId,
      experienceGained: {
        [chickenA.id]: stateA.battleExperienceGain,
        [chickenB.id]: stateB.battleExperienceGain,
      },
      newInjuries,
      conditionDelta,
    };

    result.analysis = {
      [chickenA.id]: generateBattleAnalysis(result, chickenA.id),
      [chickenB.id]: generateBattleAnalysis(result, chickenB.id),
    };

    return result;
  }
}

/**
 * Full V2 turn-based battle simulator (spec §13): both fighters read their
 * own state + a rolling opponent model, weigh all 8 actions through
 * behavior.ts's scorer, and the winner of this turn's initiative check acts
 * (the other's chosen action is interpreted as a reaction). Deterministic for
 * a given rng — same inputs + seed always produce the same CombatResult.
 * Emits the same CombatLogEntry shape lib/combat.ts's old simulateFight did
 * (extended with optional V2 fields), so the 3D replay client and existing
 * API routes need no changes. Runs a `BattleSession` to completion in one
 * call — see `BattleSession` directly for turn-by-turn control (e.g. a live
 * player issuing commands between turns).
 */
export function simulateBattle(
  chickenA: Chicken,
  chickenB: Chicken,
  rng: Rng = Math.random,
  options: SimulateBattleOptions = {}
): CombatResult {
  const session = new BattleSession(chickenA, chickenB, rng);
  while (session.turn < MAX_TURNS && !session.fightOver) {
    session.step(options.coachA, options.coachB);
  }
  return session.finalize();
}
