import type {
  AwakeningState,
  Chicken,
  CombatCareerFightDelta,
  CombatCareerState,
  CombatCareerTelemetry,
  CombatDevelopmentNotice,
  CombatEvolutionTrait,
  RivalryRecord,
  SignatureTechnique,
  Trait,
} from "../types";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const EMPTY_COMBAT_TELEMETRY: CombatCareerTelemetry = Object.freeze({
  heavyHitsTaken: 0, lightHitsTaken: 0, clashesWon: 0, clashesLost: 0,
  knockdownsTaken: 0, knockdownsRecovered: 0, fightsWon: 0, fightsLost: 0,
  comebackWins: 0, dominantWins: 0, closeLosses: 0,
  damageTakenWhilePressing: 0, damageTakenWhileRetreating: 0,
  successfulCounters: 0, failedCounters: 0, successfulChases: 0, punishedChases: 0,
  lowStaminaClashesWon: 0, retaliationDamageAfterHit: 0, successfulDisengagements: 0,
  timesIntimidated: 0, strongerOpponentsFaced: 0,
  openingClashesWon: 0, openingClashesLost: 0, lateFightPerformance: 0,
  playerCommandCompliance: 0, playerCommandSuccess: 0, playerCommandsIssued: 0,
});

const SIGNATURES: readonly Pick<SignatureTechnique, "id" | "name">[] = [
  { id: "relentless-rush", name: "Relentless Rush" },
  { id: "sky-counter", name: "Sky Counter" },
  { id: "ghost-step", name: "Ghost Step" },
  { id: "second-wind", name: "Second Wind" },
];

const AWAKENINGS: readonly Pick<AwakeningState, "id" | "name">[] = [
  { id: "unbreakable", name: "Unbreakable" },
  { id: "berserker", name: "Berserker" },
  { id: "flow-state", name: "Flow State" },
  { id: "second-wind", name: "Second Wind" },
  { id: "apex", name: "Apex" },
];

export function emptyCombatCareer(): CombatCareerState {
  return {
    version: 1,
    fightsProcessed: 0,
    telemetry: { ...EMPTY_COMBAT_TELEMETRY },
    evolutionTraits: [],
    signatures: SIGNATURES.map((signature) => ({ ...signature, progress: 0, developed: false, attempts: 0, successes: 0 })),
    rivalries: [],
    awakenings: AWAKENINGS.map((awakening) => ({ ...awakening, unlocked: false, triggerCount: 0 })),
    recentDevelopment: [],
  };
}

/** Normalizes old/partial JSON rows so adding career systems never invalidates
 * existing birds or hand-authored fixtures. */
export function normalizeCombatCareer(value?: Partial<CombatCareerState> | null): CombatCareerState {
  const empty = emptyCombatCareer();
  const signatures = SIGNATURES.map((definition) => {
    const saved = value?.signatures?.find((entry) => entry.id === definition.id);
    return { ...definition, progress: saved?.progress ?? 0, developed: saved?.developed ?? false, attempts: saved?.attempts ?? 0, successes: saved?.successes ?? 0 };
  });
  const awakenings = AWAKENINGS.map((definition) => {
    const saved = value?.awakenings?.find((entry) => entry.id === definition.id);
    return { ...definition, unlocked: saved?.unlocked ?? false, triggerCount: saved?.triggerCount ?? 0 };
  });
  return {
    version: 1,
    fightsProcessed: value?.fightsProcessed ?? 0,
    telemetry: { ...empty.telemetry, ...value?.telemetry },
    evolutionTraits: value?.evolutionTraits ?? [],
    signatures,
    rivalries: value?.rivalries ?? [],
    awakenings,
    recentDevelopment: value?.recentDevelopment ?? [],
  };
}

/** Gives a generated, non-persistent opponent one style-appropriate awakening.
 * NPCs use the same low-health trigger, duration, and modifiers as players. */
export function withNpcAwakening(chicken: Chicken, requested?: AwakeningState["id"]): Chicken {
  const label = `${chicken.id} ${chicken.name}`.toLowerCase();
  const type: AwakeningState["id"] = requested
    ?? (label.includes("apex") ? "apex"
      : label.includes("berserk") ? "berserker"
      : label.includes("phantom") || label.includes("counter-master") ? "flow-state"
      : chicken.fightingStyle === "aggressive" ? "berserker"
      : chicken.fightingStyle === "counter" ? "flow-state"
      : chicken.fightingStyle === "endurance" ? "unbreakable"
      : "second-wind");
  const career = normalizeCombatCareer(chicken.combatCareer);
  return {
    ...chicken,
    combatCareer: {
      ...career,
      awakenings: career.awakenings.map((awakening) => ({
        ...awakening,
        unlocked: awakening.id === type,
      })),
    },
  };
}

type TraitRule = {
  id: string; name: string; stages: readonly [string, string, string];
  advantages: readonly string[]; tradeoffs: readonly string[];
  score: (t: CombatCareerTelemetry) => number;
};

const TRAIT_RULES: readonly TraitRule[] = [
  {
    id: "battle-hardened", name: "Battle Hardened", stages: ["Shell Shocked", "Tempered", "Unbreakable"],
    advantages: ["Stronger retaliation", "More willing to re-engage after damage"],
    tradeoffs: ["Early levels flinch more", "Can become less predictable"],
    score: (t) => t.heavyHitsTaken * 1.5 + t.knockdownsRecovered * 6 + t.fightsLost * 2 + t.retaliationDamageAfterHit * .08,
  },
  {
    id: "counter-instinct", name: "Counter Instinct", stages: ["Watchful", "Punishing", "Flow Reader"],
    advantages: ["Reads committed attacks", "Prefers counter distance"],
    tradeoffs: ["Can surrender initiative", "Baits can leave openings"],
    score: (t) => t.successfulCounters * 3 + t.openingClashesWon * .8 - t.failedCounters * .35,
  },
  {
    id: "deep-reserves", name: "Deep Reserves", stages: ["Stubborn Lungs", "Deep Reserves", "Second Wind"],
    advantages: ["Calmer low-stamina choices", "Improved late-fight commitment"],
    tradeoffs: ["May remain engaged too long"],
    score: (t) => t.lowStaminaClashesWon * 6 + t.lateFightPerformance * .7 + t.comebackWins * 4,
  },
  {
    id: "comeback-fighter", name: "Comeback Fighter", stages: ["Still Standing", "Comeback Fighter", "Never Counted Out"],
    advantages: ["Confidence while behind", "Reduced late-fight panic"],
    tradeoffs: ["Can become comfortable conceding the opening"],
    score: (t) => t.comebackWins * 10 + t.knockdownsRecovered * 3 + t.lateFightPerformance * .45,
  },
  {
    id: "once-bitten", name: "Once Bitten", stages: ["Wary Chaser", "Once Bitten", "Chase Disciplined"],
    advantages: ["Safer pursuit", "Earlier bad-exchange disengagement"],
    tradeoffs: ["May abandon a legitimate chase"],
    score: (t) => t.punishedChases * 4 + t.successfulDisengagements * 1.5,
  },
  {
    id: "bully", name: "Bully", stages: ["Swagger", "Bully", "Ring Tyrant"],
    advantages: ["Confident pressure against weaker opposition"],
    tradeoffs: ["Careless when underestimating opponents", "Confidence can collapse when dominated"],
    score: (t) => t.dominantWins * 7 + t.successfulChases * 1.5 - t.strongerOpponentsFaced,
  },
  {
    id: "giant-killer", name: "Giant Killer", stages: ["Unafraid", "Giant Killer", "Titan Hunter"],
    advantages: ["Reduced intimidation", "Patient against physical advantages"],
    tradeoffs: ["Can overestimate itself against larger opponents"],
    score: (t) => t.strongerOpponentsFaced * 3 + t.comebackWins * 3 + t.successfulCounters,
  },
  {
    id: "slow-starter", name: "Slow Starter", stages: ["Measured", "Slow Starter", "Late-Fight Specialist"],
    advantages: ["Patient reads", "Strong late-fight composure"],
    tradeoffs: ["Lower opening commitment"],
    score: (t) => t.openingClashesLost * 2 + t.lateFightPerformance - t.openingClashesWon * .4,
  },
];

const LEVEL_THRESHOLDS = [18, 48, 92] as const;

function traitLevel(score: number): 0 | 1 | 2 | 3 {
  if (score >= LEVEL_THRESHOLDS[2]) return 3;
  if (score >= LEVEL_THRESHOLDS[1]) return 2;
  if (score >= LEVEL_THRESHOLDS[0]) return 1;
  return 0;
}

function evaluateTraits(telemetry: CombatCareerTelemetry, previous: readonly CombatEvolutionTrait[], fights: number, notices: CombatDevelopmentNotice[]): CombatEvolutionTrait[] {
  const evaluated = TRAIT_RULES.flatMap((rule) => {
    const score = Math.max(0, rule.score(telemetry));
    const prior = previous.find((entry) => entry.id === rule.id);
    const earnedLevel = traitLevel(score);
    const cappedLevel = Math.min(earnedLevel, fights >= 20 ? 3 : fights >= 10 ? 2 : fights >= 3 ? 1 : 0);
    const level = Math.max(cappedLevel, prior?.level ?? 0) as 0 | 1 | 2 | 3;
    if (!level) return [];
    if (!prior || level > prior.level) notices.push({ kind: prior ? "trait_level" : "trait", id: rule.id, title: `${rule.name}${level > 1 ? ` ${level}` : ""}`, detail: rule.stages[level - 1] });
    const lower = LEVEL_THRESHOLDS[level - 1];
    const upper = LEVEL_THRESHOLDS[level] ?? lower + 50;
    return [{ id: rule.id, name: rule.name, level, stage: rule.stages[level - 1], progress: clamp((score - lower) / (upper - lower) * 100), active: true, advantages: [...rule.advantages], tradeoffs: [...rule.tradeoffs] }];
  });
  const suppress = (a: string, b: string) => {
    const left = evaluated.find((entry) => entry.id === a), right = evaluated.find((entry) => entry.id === b);
    if (left && right) (left.level >= right.level ? right : left).active = false;
  };
  suppress("bully", "giant-killer");
  suppress("slow-starter", "counter-instinct");
  return evaluated;
}

function updateRivalry(previous: readonly RivalryRecord[], delta: CombatCareerFightDelta, weight: number, notices: CombatDevelopmentNotice[]): RivalryRecord[] {
  const current = previous.find((entry) => entry.opponentId === delta.opponentId);
  const next: RivalryRecord = {
    opponentId: delta.opponentId, opponentName: delta.opponentName,
    fights: (current?.fights ?? 0) + 1,
    wins: (current?.wins ?? 0) + (delta.won ? 1 : 0), losses: (current?.losses ?? 0) + (delta.won ? 0 : 1),
    familiarity: clamp((current?.familiarity ?? 0) + 9 * weight, 0, 100),
    counterSuccesses: (current?.counterSuccesses ?? 0) + (delta.telemetry.successfulCounters ?? 0),
  };
  if (next.fights === 3) notices.push({ kind: "rivalry", id: next.opponentId, title: `Rivalry: ${next.opponentName}`, detail: "Repeated battles are becoming familiar." });
  return [...previous.filter((entry) => entry.opponentId !== delta.opponentId), next].sort((a, b) => b.fights - a.fights).slice(0, 24);
}

function updateSignatures(career: CombatCareerState, delta: CombatCareerFightDelta, weight: number, notices: CombatDevelopmentNotice[]): SignatureTechnique[] {
  return career.signatures.map((signature) => {
    const attempts = delta.signatureAttempts[signature.id] ?? 0;
    const successes = delta.signatureSuccesses[signature.id] ?? 0;
    const progress = clamp(signature.progress + (successes * 4 + Math.max(0, attempts - successes) * .35) * weight);
    const developed = signature.developed || (career.fightsProcessed >= 7 && progress >= 100);
    if (developed && !signature.developed) notices.push({ kind: "signature", id: signature.id, title: signature.name, detail: "A repeated successful pattern became a signature technique." });
    return { ...signature, progress, developed, attempts: signature.attempts + attempts, successes: signature.successes + successes };
  });
}

function updateAwakenings(chicken: Chicken, career: CombatCareerState, delta: CombatCareerFightDelta, notices: CombatDevelopmentNotice[]): AwakeningState[] {
  const level = (id: string) => career.evolutionTraits.find((entry) => entry.id === id && entry.active)?.level ?? 0;
  const signature = (id: SignatureTechnique["id"]) => career.signatures.some((entry) => entry.id === id && entry.developed);
  const rareGenome = Object.values(chicken.mutations).filter((gene) => gene.expressed).length >= 2;
  const qualifies: Partial<Record<AwakeningState["id"], boolean>> = {
    unbreakable: level("battle-hardened") >= 3 && level("comeback-fighter") >= 1 && career.fightsProcessed >= 20,
    berserker: signature("relentless-rush") && level("bully") >= 2,
    "flow-state": signature("sky-counter") && level("counter-instinct") >= 3,
    "second-wind": signature("second-wind") && level("deep-reserves") >= 3,
    apex: rareGenome && chicken.record.championships >= 3 && career.evolutionTraits.filter((entry) => entry.active && entry.level === 3).length >= 3,
  };
  return career.awakenings.map((awakening) => {
    const unlocked = awakening.unlocked || Boolean(qualifies[awakening.id]);
    if (unlocked && !awakening.unlocked) notices.push({ kind: "awakening", id: awakening.id, title: awakening.name, detail: "Career, genetics and combat identity aligned." });
    return { ...awakening, unlocked, triggerCount: awakening.triggerCount + (delta.awakeningTriggered === awakening.id ? 1 : 0) };
  });
}

/** Merge one fight into a career. Same-opponent evidence diminishes and weak
 * opposition is discounted, so trivial rematches cannot manufacture legends. */
export function evolveCombatCareer(chicken: Chicken, delta?: CombatCareerFightDelta): { career: CombatCareerState; newTraits: Trait[] } {
  const previous = normalizeCombatCareer(chicken.combatCareer);
  if (!delta) return { career: previous, newTraits: [] };
  const priorRivalry = previous.rivalries.find((entry) => entry.opponentId === delta.opponentId);
  const quality = clamp(delta.opponentStrength / Math.max(1, delta.ownStrength), .35, 1.4);
  const repetition = 1 / (1 + Math.max(0, (priorRivalry?.fights ?? 0) - 1) * .2);
  const weight = quality * repetition;
  const telemetry = { ...previous.telemetry };
  for (const key of Object.keys(EMPTY_COMBAT_TELEMETRY) as (keyof CombatCareerTelemetry)[]) {
    telemetry[key] += (delta.telemetry[key] ?? 0) * weight;
  }
  const notices: CombatDevelopmentNotice[] = [];
  const evolutionTraits = evaluateTraits(telemetry, previous.evolutionTraits, previous.fightsProcessed + 1, notices);
  let career: CombatCareerState = {
    ...previous,
    fightsProcessed: previous.fightsProcessed + 1,
    telemetry,
    evolutionTraits,
    rivalries: updateRivalry(previous.rivalries, delta, weight, notices),
    signatures: previous.signatures, awakenings: previous.awakenings, recentDevelopment: notices,
  };
  career.signatures = updateSignatures(career, delta, weight, notices);
  career.awakenings = updateAwakenings(chicken, career, delta, notices);
  career.recentDevelopment = notices;
  const rarity = (level: number): Trait["rarity"] => level >= 3 ? "legendary" : level === 2 ? "epic" : "rare";
  const newTraits = evolutionTraits
    .filter((entry) => !previous.evolutionTraits.some((old) => old.id === entry.id && old.level >= entry.level))
    .map((entry) => ({ id: entry.id, name: `${entry.name}${entry.level > 1 ? ` ${entry.level}` : ""}`, rarity: rarity(entry.level), description: `${entry.stage}. ${entry.advantages.join("; ")} — ${entry.tradeoffs.join("; ")}.` }));
  return { career, newTraits };
}

export type CombatEvolutionSnapshot = {
  traitLevels: Readonly<Record<string, number>>;
  signatures: readonly SignatureTechnique["id"][];
  awakenings: readonly AwakeningState["id"][];
  rivalryFamiliarity: number;
};

export function combatEvolutionSnapshot(chicken: Chicken, opponentId: string): CombatEvolutionSnapshot {
  const career = normalizeCombatCareer(chicken.combatCareer);
  return {
    traitLevels: Object.fromEntries(career.evolutionTraits.filter((entry) => entry.active).map((entry) => [entry.id, entry.level])),
    signatures: career.signatures.filter((entry) => entry.developed).map((entry) => entry.id),
    awakenings: career.awakenings.filter((entry) => entry.unlocked).map((entry) => entry.id),
    rivalryFamiliarity: career.rivalries.find((entry) => entry.opponentId === opponentId)?.familiarity ?? 0,
  };
}

export function fighterStrength(chicken: Chicken): number {
  const stats = [...Object.values(chicken.iv), ...Object.values(chicken.ev)];
  return stats.reduce((sum, value) => sum + value, 0) / Math.max(1, stats.length) + chicken.record.wins * .4 + chicken.record.championships * 4;
}
