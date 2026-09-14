import { ARCHETYPE_PROFILES } from '../lib/combat/behavior';
import { verifyLaunchCommands, type MatchedIdentityPair } from '../lib/combat-v2/commandVerification';
import { GENETIC_STAT_KEYS, PHYSICAL_TRAIT_KEYS, type BehavioralProfile, type Chicken } from '../lib/types';

function fighter(id: string, behavior: BehavioralProfile): Chicken {
  const iv = Object.fromEntries(GENETIC_STAT_KEYS.map((key) => [key, 58])) as Chicken['iv'];
  const ev = Object.fromEntries(GENETIC_STAT_KEYS.map((key) => [key, 12])) as Chicken['ev'];
  const physical = Object.fromEntries(PHYSICAL_TRAIT_KEYS.map((key) => [key, 1])) as Chicken['physical'];
  return {
    id, name: id, sex: 'rooster', generation: 1,
    parents: { fatherId: null, motherId: null }, bloodlineId: 'launch-verification',
    iv, ev, physical, mutations: {}, traits: [], age: 1, health: 100, energy: 55,
    record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
    status: 'active', growthStage: 'adult', fightingStyle: 'balanced', behavior,
    colorScheme: {
      body: '#111111', hackle: '#c9a24f', wings: '#4c1708', tail: '#333333',
      comb: '#b8100f', beak: '#d9a83a', shanks: '#cc9e33', pattern: 'SOLID', patternColor: '#222222',
    },
    injured: false, createdAt: 0,
  };
}

const hybrid: BehavioralProfile = {
  aggression: 0.65, caution: 0.55, patience: 0.65, persistence: 0.7,
  riskTolerance: 0.55, counterPreference: 0.65, pressurePreference: 0.65, recoveryPreference: 0.65,
};
const identities: readonly [string, BehavioralProfile][] = [
  ['aggressive', ARCHETYPE_PROFILES.aggressive],
  ['counter', ARCHETYPE_PROFILES.counter],
  ['endurance', ARCHETYPE_PROFILES.endurance],
  ['balanced', ARCHETYPE_PROFILES.balanced],
  ['hybrid', hybrid],
];
const opponent = fighter('matched-opponent', ARCHETYPE_PROFILES.balanced);
const pairs: MatchedIdentityPair[] = identities.map(([name, behavior]) => ({
  name,
  fighter: fighter(`matched-${name}`, behavior),
  opponent,
}));

const report = verifyLaunchCommands(pairs, 500);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) throw new Error(`Launch command verification failed: ${report.failures.join(', ')}`);
