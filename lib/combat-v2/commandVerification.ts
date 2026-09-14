import { ACTIONS } from './actions';
import { CanonicalCombatRuntime, CANONICAL_COMMANDS, type CoachingCommand } from './canonical';
import type { Chicken } from '../types';

export type CommandExchangeMetrics = {
  exchanges: number;
  medianSpacing: number;
  commitmentsPerExchange: number;
  counterEvadeAttemptsPerExchange: number;
  movementPerExchange: number;
  medianStaminaDelta: number;
};

export type CommandProfileVerification = {
  profile: string;
  metrics: Record<CoachingCommand, CommandExchangeMetrics>;
  checks: Record<
    | 'pressClosesDistance'
    | 'pressIncreasesCommitment'
    | 'counterIncreasesReactions'
    | 'waitReducesCommitment'
    | 'waitRetainsMovement'
    | 'recoverImprovesStamina',
    boolean
  >;
};

export type LaunchCommandVerification = {
  passed: boolean;
  trialsPerCommandPerProfile: number;
  profiles: CommandProfileVerification[];
  failures: string[];
};

export type MatchedIdentityPair = { name: string; fighter: Chicken; opponent: Chicken };

type ExchangeSample = {
  spacing: number;
  commitments: number;
  counterEvadeAttempts: number;
  movement: number;
  staminaDelta: number;
};

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function distance(runtime: CanonicalCombatRuntime): number {
  const [fighter, opponent] = runtime.checkpoint.state.fighters;
  return Math.hypot(fighter.position.x - opponent.position.x, fighter.position.z - opponent.position.z);
}

function sampleExchange(pair: MatchedIdentityPair, command: CoachingCommand, seed: number): ExchangeSample {
  const runtime = CanonicalCombatRuntime.create({
    sessionId: `command-verification-${pair.name}-${command}-${seed}`,
    seed,
    fighterA: pair.fighter,
    fighterB: pair.opponent,
    openingCommand: command,
  });
  const fighterId = pair.fighter.id;
  const startStamina = runtime.checkpoint.state.fighters[0].stamina;
  const spacings: number[] = [];
  let commitments = 0;
  let counterEvadeAttempts = 0;
  let movement = 0;
  let priorX = runtime.checkpoint.state.fighters[0].position.x;
  let priorZ = runtime.checkpoint.state.fighters[0].position.z;
  runtime.drainEvents();

  while (runtime.checkpoint.state.phase === 'active' && runtime.checkpoint.exchangeIndex === 0) {
    runtime.advance(1);
    spacings.push(distance(runtime));
    const fighter = runtime.checkpoint.state.fighters[0];
    movement += Math.hypot(fighter.position.x - priorX, fighter.position.z - priorZ);
    priorX = fighter.position.x;
    priorZ = fighter.position.z;
    for (const event of runtime.drainEvents()) {
      if (event.payload.fighterId !== fighterId) continue;
      if (event.type === 'ACTION_STARTED') {
        const action = ACTIONS[String(event.payload.actionId ?? '')];
        if (action?.category === 'attack' || action?.category === 'counter') commitments += 1;
        if (action?.category === 'counter') counterEvadeAttempts += 1;
      }
      if (event.type === 'EVADE') counterEvadeAttempts += 1;
    }
  }
  return {
    spacing: median(spacings),
    commitments,
    counterEvadeAttempts,
    movement,
    staminaDelta: runtime.checkpoint.state.fighters[0].stamina - startStamina,
  };
}

function summarize(samples: readonly ExchangeSample[]): CommandExchangeMetrics {
  const count = samples.length;
  const sum = (select: (sample: ExchangeSample) => number) =>
    samples.reduce((total, sample) => total + select(sample), 0);
  return {
    exchanges: count,
    medianSpacing: median(samples.map((sample) => sample.spacing)),
    commitmentsPerExchange: count === 0 ? 0 : sum((sample) => sample.commitments) / count,
    counterEvadeAttemptsPerExchange: count === 0 ? 0 : sum((sample) => sample.counterEvadeAttempts) / count,
    movementPerExchange: count === 0 ? 0 : sum((sample) => sample.movement) / count,
    medianStaminaDelta: median(samples.map((sample) => sample.staminaDelta)),
  };
}

export function verifyLaunchCommands(
  pairs: readonly MatchedIdentityPair[],
  trialsPerCommandPerProfile = 500,
): LaunchCommandVerification {
  if (pairs.length < 5) throw new Error('launch verification requires at least five identity profiles');
  if (!Number.isInteger(trialsPerCommandPerProfile) || trialsPerCommandPerProfile < 1) {
    throw new Error('trialsPerCommandPerProfile must be a positive integer');
  }
  const failures: string[] = [];
  const profiles = pairs.map((pair, profileIndex): CommandProfileVerification => {
    const metrics = Object.fromEntries(
      CANONICAL_COMMANDS.map((command) => [
        command,
        summarize(
          Array.from({ length: trialsPerCommandPerProfile }, (_, trial) =>
            sampleExchange(pair, command, 10_007 + profileIndex * 1_000_003 + trial * 7_919),
          ),
        ),
      ]),
    ) as Record<CoachingCommand, CommandExchangeMetrics>;
    const nonRecoveryBest = Math.max(
      metrics.PRESS.medianStaminaDelta,
      metrics.WAIT.medianStaminaDelta,
      metrics.COUNTER.medianStaminaDelta,
    );
    const checks = {
      pressClosesDistance: metrics.PRESS.medianSpacing < metrics.WAIT.medianSpacing,
      pressIncreasesCommitment: metrics.PRESS.commitmentsPerExchange > metrics.WAIT.commitmentsPerExchange,
      counterIncreasesReactions:
        metrics.COUNTER.counterEvadeAttemptsPerExchange > metrics.PRESS.counterEvadeAttemptsPerExchange,
      waitReducesCommitment: metrics.WAIT.commitmentsPerExchange < metrics.PRESS.commitmentsPerExchange,
      waitRetainsMovement: metrics.WAIT.movementPerExchange > 0.05,
      recoverImprovesStamina: metrics.RECOVER.medianStaminaDelta > nonRecoveryBest,
    };
    for (const [check, passed] of Object.entries(checks)) {
      if (!passed) failures.push(`${pair.name}: ${check}`);
    }
    return { profile: pair.name, metrics, checks };
  });
  return { passed: failures.length === 0, trialsPerCommandPerProfile, profiles, failures };
}
