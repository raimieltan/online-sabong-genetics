import { deriveBehaviorProfile } from './behavior';
import { resolvePhysicalProfile } from '../physicalProfile';
import type { BehavioralProfile, Chicken, GrowthStage } from '../types';

export type FighterIdentityPresentation = {
  primaryLabel: string;
  strengths: readonly [string, string, ...string[]];
  weakness: string;
  temperament: readonly string[];
  knownFor: readonly string[];
  confidence: 'untested' | 'emerging' | 'established';
  careerStage: string;
};

const CAREER_STAGE: Record<GrowthStage, string> = {
  chick: 'Unproven prospect',
  juvenile: 'Developing prospect',
  young_adult: 'Young contender',
  adult: 'Prime competitor',
  prime: 'Seasoned veteran',
  senior: 'Late-career veteran',
  retired: 'Retired lineage elder',
};

function behaviorOf(chicken: Chicken): BehavioralProfile {
  return chicken.behavior ?? deriveBehaviorProfile(chicken.fightingStyle, chicken.traits);
}

function identityFamily(behavior: BehavioralProfile): 'pressure' | 'counter' | 'grinder' | 'evasive' | 'balanced' {
  const scores = [
    ['pressure', (behavior.aggression + behavior.pressurePreference + behavior.persistence) / 3],
    ['counter', (behavior.counterPreference + behavior.patience + behavior.caution) / 3],
    ['grinder', (behavior.recoveryPreference + behavior.persistence + behavior.patience) / 3],
    ['evasive', (behavior.caution + behavior.patience + (1 - behavior.riskTolerance)) / 3],
  ] as const;
  const ranked = [...scores].sort((a, b) => b[1] - a[1]);
  return ranked[0][1] - ranked[1][1] < 0.08 ? 'balanced' : ranked[0][0];
}

export function presentFighterIdentity(chicken: Chicken): FighterIdentityPresentation {
  const behavior = behaviorOf(chicken);
  const physical = resolvePhysicalProfile(chicken);
  const family = identityFamily(behavior);
  const labels = {
    pressure: behavior.persistence >= 0.68 ? 'Relentless Pressure Fighter' : 'Forward Pressure Fighter',
    counter: behavior.patience >= 0.68 ? 'Patient Counter-Fighter' : 'Reactive Counter-Fighter',
    grinder: behavior.recoveryPreference >= 0.68 ? 'Resilient Endurance Grinder' : 'Composed Attrition Fighter',
    evasive: physical.mobility >= 1.03 ? 'Elusive Mobile Striker' : 'Cautious Outside Fighter',
    balanced: 'Adaptive All-Rounder',
  } as const;

  const strengthCandidates = [
    { score: behavior.aggression + behavior.pressurePreference, copy: 'Closes distance and sustains pressure' },
    { score: behavior.counterPreference + behavior.patience, copy: 'Waits for commitment before countering' },
    { score: behavior.persistence + behavior.recoveryPreference, copy: 'Keeps composure through long exchanges' },
    { score: behavior.caution + (1 - behavior.riskTolerance), copy: 'Protects position and avoids reckless trades' },
    { score: physical.mobility, copy: 'Changes angles with an agile frame' },
    { score: physical.reach, copy: 'Uses natural reach to contest space' },
  ].sort((a, b) => b.score - a.score);
  const strengths = strengthCandidates.slice(0, 3).map((entry) => entry.copy) as [string, string, string];

  const weakness = behavior.aggression >= 0.72 && behavior.riskTolerance >= 0.62
    ? 'Can overcommit when early pressure is resisted'
    : behavior.caution >= 0.7
      ? 'May concede initiative while waiting for a clean read'
      : behavior.recoveryPreference < 0.3
        ? 'Slow to choose recovery once stamina begins to fade'
        : behavior.counterPreference < 0.3
          ? 'Offers fewer answers to a well-timed committed attack'
          : 'Versatility comes without one overwhelming specialty';

  const temperament = [
    behavior.aggression >= 0.65 ? 'assertive' : behavior.caution >= 0.65 ? 'watchful' : 'measured',
    behavior.patience >= 0.65 ? 'patient' : behavior.persistence >= 0.65 ? 'persistent' : 'responsive',
    behavior.riskTolerance >= 0.65 ? 'bold' : behavior.riskTolerance <= 0.35 ? 'risk-conscious' : 'composed',
  ];

  const telemetry = chicken.combatCareer?.telemetry;
  const knownFor: string[] = [];
  if (chicken.record.championships > 0) knownFor.push(`${chicken.record.championships} championship title${chicken.record.championships === 1 ? '' : 's'}`);
  if (telemetry && telemetry.successfulCounters >= 3 && telemetry.successfulCounters >= telemetry.failedCounters) knownFor.push('Punishing committed attacks with counters');
  if (telemetry && telemetry.successfulChases >= 3 && telemetry.successfulChases > telemetry.punishedChases) knownFor.push('Turning pressure into successful chases');
  if (telemetry && telemetry.comebackWins >= 2) knownFor.push('Recovering from losing positions');
  const signature = chicken.combatCareer?.signatures.find((entry) => entry.developed);
  if (signature) knownFor.push(`Signature technique: ${signature.name}`);
  if (knownFor.length === 0) knownFor.push('Still building a recorded fighting history');

  const fights = chicken.combatCareer?.fightsProcessed ?? chicken.record.wins + chicken.record.losses;
  const confidence = fights === 0 ? 'untested' : fights < 5 ? 'emerging' : 'established';
  return {
    primaryLabel: labels[family],
    strengths,
    weakness,
    temperament,
    knownFor,
    confidence,
    careerStage: CAREER_STAGE[chicken.growthStage],
  };
}

export function describeIdentityContrast(left: Chicken, right: Chicken): string {
  const a = presentFighterIdentity(left);
  const b = presentFighterIdentity(right);
  return `${a.primaryLabel} versus ${b.primaryLabel}: ${left.name} leans on ${a.strengths[0].toLowerCase()}, while ${right.name} leans on ${b.strengths[0].toLowerCase()}.`;
}
