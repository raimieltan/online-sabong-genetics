import { ACTION_DEFINITIONS, legalActions } from "./actions";
import { generateBattleAnalysis } from "./analysis";
import { chooseAction, type DecisionContext } from "./behavior";
import { gainExperience, updateOpponentModel } from "./experience";
import { clampFatigue, fatigueGain, fatigueRecoveryPerTurn, fatigueStatMultiplier } from "./fatigue";
import { createInjuryRecord, rollInjurySeverity } from "./injuries";
import { decayMomentum } from "./momentum";
import { deriveContextState } from "./positioning";
import { resolveExchange } from "./resolution";
import { effectiveStat } from "./stats";
import { makeCombatantState, type CombatantState } from "./state";
import { resolvePhysicalProfile } from "../physicalProfile";
import type {
  Chicken,
  CombatAction,
  CombatExperienceCategory,
  CombatLogEntry,
  CombatResult,
  InjuryRecord,
} from "../types";

export type Rng = () => number;

export const MAX_TURNS = 300;

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

/**
 * Full V2 turn-based battle simulator (spec §13): both fighters read their
 * own state + a rolling opponent model, weigh all 8 actions through
 * behavior.ts's scorer, and the winner of this turn's initiative check acts
 * (the other's chosen action is interpreted as a reaction). Deterministic for
 * a given rng — same inputs + seed always produce the same CombatResult.
 * Emits the same CombatLogEntry shape lib/combat.ts's old simulateFight did
 * (extended with optional V2 fields), so the 3D replay client and existing
 * API routes need no changes.
 */
export function simulateBattle(chickenA: Chicken, chickenB: Chicken, rng: Rng = Math.random): CombatResult {
  const stateA = makeCombatantState(chickenA);
  const stateB = makeCombatantState(chickenB);
  const physicalA = resolvePhysicalProfile(chickenA);
  const physicalB = resolvePhysicalProfile(chickenB);

  const log: CombatLogEntry[] = [];

  let turn = 0;
  let outcomeReason: CombatResult["outcomeReason"] = "timeout";
  let injuredChickenId: string | null = null;
  let winner: CombatantState = stateA;
  let loser: CombatantState = stateB;
  let fightOver = false;

  while (turn < MAX_TURNS && !fightOver) {
    turn += 1;

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
      experience: stateB.experience,
      opponentModel: stateB.opponentModel,
      rng,
    };

    const actionA = chooseAction(stateA.behavior, legalA, decisionCtxA);
    const actionB = chooseAction(stateB.behavior, legalB, decisionCtxB);

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

    log.push({
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
    });

    if (outcome.hit.isCritical) {
      fightOver = true;
      outcomeReason = "critical_injury";
      injuredChickenId = defenderState.chicken.id;
      winner = attackerState;
      loser = defenderState;
    } else if (defenderState.hp <= 0) {
      fightOver = true;
      outcomeReason = "ko";
      winner = attackerState;
      loser = defenderState;
    }
  }

  if (!fightOver) {
    outcomeReason = "timeout";
    if (stateA.hp === stateB.hp) {
      const totalA = effectiveStat(chickenA, "power") + effectiveStat(chickenA, "stamina");
      const totalB = effectiveStat(chickenB, "power") + effectiveStat(chickenB, "stamina");
      winner = totalB > totalA ? stateB : stateA;
      loser = winner === stateA ? stateB : stateA;
    } else {
      winner = stateA.hp > stateB.hp ? stateA : stateB;
      loser = winner === stateA ? stateB : stateA;
    }
  }

  const newInjuries: Record<string, InjuryRecord[]> = { [chickenA.id]: [], [chickenB.id]: [] };
  const severity = rollInjurySeverity({
    rng,
    wasCriticalInjury: outcomeReason === "critical_injury",
    wasKo: outcomeReason === "ko",
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
    log,
    totalTurns: turn,
    outcomeReason,
    injuredChickenId,
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
