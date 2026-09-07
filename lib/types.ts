export type StatKey =
  | "speed"
  | "stamina"
  | "damage"
  | "aggression"
  | "defense"
  | "luck";

/** Canonical display/iteration order for the six base stats. */
export const STAT_KEYS: readonly StatKey[] = [
  "speed",
  "stamina",
  "damage",
  "aggression",
  "defense",
  "luck",
];

/** Feather pattern gene — drives the shader-based pattern on the M_Feathers material. */
export const FEATHER_PATTERNS = ["SOLID", "BARRED", "LACED", "MOTTLED", "SPANGLED"] as const;
export type FeatherPattern = (typeof FEATHER_PATTERNS)[number];

/** Color genes, mapped 1:1 onto rooster_rigged.glb's 7 materials plus a shader pattern. */
export type ChickenColorScheme = {
  body: string; // M_Feathers
  hackle: string; // M_Hackle
  wings: string; // M_Wing
  tail: string; // M_Tail
  comb: string; // M_Comb (comb + wattle share one material)
  beak: string; // M_Beak
  shanks: string; // M_Legs
  pattern: FeatherPattern;
  patternColor: string;
};

export type Rooster = {
  id: string;
  name: string;
  type: string;
  speed: number;
  stamina: number;
  damage: number;
  aggression: number;
  defense: number;
  luck: number;
  maxHp: number;
  hp: number;
  fatigued: boolean;
  colorScheme: ChickenColorScheme;
};

export type BattleLogEntry = {
  turn: number;
  attacker: string;
  defender: string;
  attackerId: string;
  defenderId: string;
  damage: number;
  defenderHp: number;
  isMiss: boolean;
  isCrit: boolean;
  isFatigueTriggered: boolean;
  timestamp: number;
};

export type BattleResult = {
  winner: Rooster;
  loser: Rooster;
  logs: BattleLogEntry[];
  totalTurns: number;
  r1FinalHp: number;
  r2FinalHp: number;
  outcomeReason: "ko" | "timeout";
};

export type Bet = {
  amount: number;
  roosterId: string;
  roosterName: string;
  odds: number;
};

// ---------------------------------------------------------------------------
// Chicken data model / genetics (Gamefowl Dynasty foundation)
// ---------------------------------------------------------------------------

/** The five genetic stats from the mechanics spec, plus Agility as a sixth. */
export type GeneticStatKey =
  | "power"
  | "speed"
  | "stamina"
  | "defense"
  | "accuracy"
  | "agility";

/** Canonical display/iteration order for the six genetic stats. */
export const GENETIC_STAT_KEYS: readonly GeneticStatKey[] = [
  "power",
  "speed",
  "stamina",
  "defense",
  "accuracy",
  "agility",
];

/** A full set of values across all genetic stats (used for both IV and EV). */
export type StatBlock = Record<GeneticStatKey, number>;

/**
 * The 18 body-proportion genes rooster_rigged.glb's 21-bone skeleton can
 * render (per-bone world scale, see roosterGenome.ts's TRAIT_RANGE). A single
 * genetic block — proportions aren't trained, so there's no IV/EV split like
 * the combat stats.
 */
export type PhysicalTraitKey =
  | "scale"
  | "bodyGirth"
  | "bodyLength"
  | "chest"
  | "neckLength"
  | "neckThick"
  | "headSize"
  | "combSize"
  | "wattleSize"
  | "beakLength"
  | "wingSpan"
  | "wingSize"
  | "legLength"
  | "legThick"
  | "footSize"
  | "tailLength"
  | "tailSpread"
  | "tailArc";

export const PHYSICAL_TRAIT_KEYS: readonly PhysicalTraitKey[] = [
  "scale",
  "bodyGirth",
  "bodyLength",
  "chest",
  "neckLength",
  "neckThick",
  "headSize",
  "combSize",
  "wattleSize",
  "beakLength",
  "wingSpan",
  "wingSize",
  "legLength",
  "legThick",
  "footSize",
  "tailLength",
  "tailSpread",
  "tailArc",
];

/** Inheritance/randomization clamp range per physical trait, matching the rig's slider bounds (roosterGenome.ts TRAIT_RANGE). */
export const PHYSICAL_TRAIT_RANGE: Record<PhysicalTraitKey, { min: number; max: number }> = {
  scale: { min: 0.7, max: 1.4 },
  bodyGirth: { min: 0.7, max: 1.6 },
  bodyLength: { min: 0.75, max: 1.45 },
  chest: { min: 0.75, max: 1.5 },
  neckLength: { min: 0.6, max: 2.0 },
  neckThick: { min: 0.6, max: 1.7 },
  headSize: { min: 0.65, max: 1.7 },
  combSize: { min: 0.2, max: 2.6 },
  wattleSize: { min: 0.2, max: 2.2 },
  beakLength: { min: 0.7, max: 1.9 },
  wingSpan: { min: 0.7, max: 2.0 },
  wingSize: { min: 0.7, max: 1.6 },
  legLength: { min: 0.55, max: 1.9 },
  legThick: { min: 0.6, max: 1.8 },
  footSize: { min: 0.7, max: 1.6 },
  tailLength: { min: 0.5, max: 1.8 },
  tailSpread: { min: 0.6, max: 1.8 },
  tailArc: { min: 0.6, max: 1.8 },
};

export type PhysicalBlock = Record<PhysicalTraitKey, number>;

/** How a mutation gene resolves between two alleles into an offspring's expressed trait. */
export type MutationInheritance = "dominant" | "recessive" | "codominant" | "random";

export type MutationRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "anomalous";

/** A chicken's state for one mutation gene: does it carry an allele, and is it expressed? */
export type MutationGeneState = { carrier: boolean; expressed: boolean };

/** Keyed by MutationDefinition.id (see lib/mutations.ts) — only genes the chicken carries/expresses are present. */
export type MutationGenome = Record<string, MutationGeneState>;

export type ChickenSex = "rooster" | "hen";

export type ChickenStatus = "active" | "injured" | "retired" | "deceased";

export type GrowthStage =
  | "chick"
  | "juvenile"
  | "young_adult"
  | "adult"
  | "prime"
  | "senior"
  | "retired";

/** Canonical lifecycle order, from the baseline mechanics spec (section 11). */
export const GROWTH_STAGES: readonly GrowthStage[] = [
  "chick",
  "juvenile",
  "young_adult",
  "adult",
  "prime",
  "senior",
  "retired",
];

export type TraitRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type Trait = {
  id: string;
  name: string;
  rarity: TraitRarity;
  description: string;
};

export type ChickenParentage = {
  fatherId: string | null;
  motherId: string | null;
};

export type CombatRecord = {
  wins: number;
  losses: number;
  championships: number;
  koTko: number;
  decisions: number;
};

/** A chicken's combat fighting style — persistent, set once at creation. */
export type FightingStyle = "aggressive" | "counter" | "endurance" | "balanced";

export const FIGHTING_STYLES: readonly FightingStyle[] = [
  "aggressive",
  "counter",
  "endurance",
  "balanced",
];

/**
 * A single chicken: an individual digital asset tracking genetics, lineage,
 * and career history. IV is fixed genetic potential set at creation; EV
 * accumulates through training and starts at zero for every stat.
 */
export type Chicken = {
  id: string;
  name: string;
  sex: ChickenSex;
  generation: number;
  parents: ChickenParentage;
  bloodlineId: string;
  /** Named breed archetype (see lib/breeds.ts), or undefined for "mixed". Cosmetic/flavor only — never read by combat. */
  breed?: string;
  iv: StatBlock;
  ev: StatBlock;
  physical: PhysicalBlock;
  mutations: MutationGenome;
  traits: Trait[];
  age: number;
  health: number;
  energy: number;
  record: CombatRecord;
  status: ChickenStatus;
  growthStage: GrowthStage;
  fightingStyle: FightingStyle;
  colorScheme: ChickenColorScheme;
  injured: boolean;
  createdAt: number;
  /**
   * V2 gameplay layer (decision tendencies, battle-earned experience, career
   * readiness/injuries, training capacity) — optional so pre-V2 fixtures and
   * rows still type-check; every reader falls back to a fresh default via the
   * respective lib/combat|training|career module instead of assuming presence.
   */
  behavior?: BehavioralProfile;
  experience?: CombatExperience;
  condition?: number;
  injuries?: InjuryRecord[];
  trainingState?: TrainingState;
};

// ---------------------------------------------------------------------------
// Combat V2 — actions, behavior, experience, fatigue, momentum, position
// (see docs/superpowers/specs/2026-09-07-rooster-game-v2.md). Genetics/IV/EV
// stay authoritative; everything here is a decision/experience/readiness layer
// on top, per that spec's non-negotiable rules.
// ---------------------------------------------------------------------------

/** Discrete server-side combat actions (V2 spec §11). */
export type CombatAction =
  | "LIGHT_ATTACK"
  | "HEAVY_ATTACK"
  | "PRESSURE"
  | "EVADE"
  | "COUNTER"
  | "GUARD"
  | "RECOVER"
  | "REPOSITION";

export const COMBAT_ACTIONS: readonly CombatAction[] = [
  "LIGHT_ATTACK",
  "HEAVY_ATTACK",
  "PRESSURE",
  "EVADE",
  "COUNTER",
  "GUARD",
  "RECOVER",
  "REPOSITION",
];

export type CombatActionDefinition = {
  id: CombatAction;
  staminaCost: number;
  commitment: number;
  recovery: number;
  damagePotential: number;
  staggerPotential: number;
  positionalEffect: number;
};

/** Abstract server-side distance band (V2 spec §7) — the 3D client translates this into physical blocking, it is never simulated as literal coordinates. */
export type CombatDistance = "CLOSE" | "MID" | "FAR";

export type CombatContextState =
  | "NEUTRAL"
  | "ADVANTAGE"
  | "DISADVANTAGE"
  | "PRESSURING"
  | "PRESSURED"
  | "EXHAUSTED"
  | "STAGGERED"
  | "RECOVERING"
  | "VULNERABLE"
  | "DOMINANT";

/** Decision-weighting tendencies (V2 spec §16) — read only by lib/combat/behavior.ts's action scorer, never a flat combat bonus. */
export type BehavioralProfile = {
  aggression: number;
  caution: number;
  patience: number;
  riskTolerance: number;
  pressurePreference: number;
  counterPreference: number;
  recoveryPreference: number;
  persistence: number;
};

export type CombatExperienceCategory =
  | "offensive"
  | "defensive"
  | "evasion"
  | "counter"
  | "pressure"
  | "recovery"
  | "adaptation";

export const COMBAT_EXPERIENCE_CATEGORIES: readonly CombatExperienceCategory[] = [
  "offensive",
  "defensive",
  "evasion",
  "counter",
  "pressure",
  "recovery",
  "adaptation",
];

/** Earned only from actual battles (V2 spec §19) — never feeds effectiveStat() directly, only decision quality/prediction. */
export type CombatExperience = Record<CombatExperienceCategory, number>;

/** A rolling, imperfect read on one specific opponent (V2 spec §20) — built up during a single battle, not persisted across battles. */
export type OpponentModel = {
  aggressionRead: number;
  counterLikelihood: number;
  preferredDistance: CombatDistance;
  staminaTendency: number;
  pressureTendency: number;
  recentActions: CombatAction[];
  sampleSize: number;
};

// ---------------------------------------------------------------------------
// Career — condition, injuries, training limits (V2 spec §22-34)
// ---------------------------------------------------------------------------

export type InjurySeverity = "minor" | "serious" | "career_altering";

export type InjuryRecord = {
  id: string;
  severity: InjurySeverity;
  label: string;
  incurredAt: number;
  /** Battles/rest cycles remaining before this heals; 0 for a permanent (career_altering) injury. */
  recoveryRemaining: number;
  permanent: boolean;
  statPenalty?: Partial<StatBlock>;
};

export type TrainingCategory =
  | "strength"
  | "speed"
  | "agility"
  | "defense"
  | "stamina"
  | "technique"
  | "recovery"
  | "discipline";

export const TRAINING_CATEGORIES: readonly TrainingCategory[] = [
  "strength",
  "speed",
  "agility",
  "defense",
  "stamina",
  "technique",
  "recovery",
  "discipline",
];

export type TrainingState = {
  /** Remaining finite session capacity before overtraining risk kicks in (V2 spec §23); regenerates with rest. */
  trainingPoints: number;
  /** Accumulated overtraining load, 0-100 — pushes effectiveness down the diminishing-returns curve. */
  trainingFatigue: number;
  history: { category: TrainingCategory; at: number }[];
};

/** Derived, never stored directly — emerges from growthStage + condition + experience + training (V2 spec §30). */
export type CareerLifeStage = "developing" | "prime" | "veteran" | "decline";

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export type HitZone =
  | "head"
  | "neck"
  | "body"
  | "left_wing"
  | "right_wing"
  | "left_leg"
  | "right_leg";

export const HIT_ZONES: readonly HitZone[] = [
  "head",
  "neck",
  "body",
  "left_wing",
  "right_wing",
  "left_leg",
  "right_leg",
];

/**
 * How hard a hit rocks the defender — server-decided, the 3D layer only renders it (V2 battle spec §28).
 * "stumble" shares "medium"'s damage-severity band but is rolled instead of it specifically for leg-zone
 * hits against low-agility defenders — a trip/loss-of-footing reaction distinct from a generic flinch.
 */
export type StaggerLevel = "none" | "light" | "stumble" | "medium" | "heavy" | "knockdown";

export const STAGGER_LEVELS: readonly StaggerLevel[] = [
  "none",
  "light",
  "stumble",
  "medium",
  "heavy",
  "knockdown",
];

export type CombatLogEntry = {
  turn: number;
  attackerId: string;
  defenderId: string;
  damage: number;
  hitZone: HitZone | null;
  isMiss: boolean;
  isCrit: boolean;
  isCounter: boolean;
  isCritical: boolean;
  defenderHp: number;
  stagger: StaggerLevel;
  timestamp: number;
  /**
   * V2 turn-loop metadata (spec §11-13, §42) — additive and optional so any
   * existing reader of CombatLogEntry (3D replay, UI) that only looks at the
   * fields above keeps working unchanged.
   */
  attackerAction?: CombatAction;
  defenderAction?: CombatAction;
  attackerState?: CombatContextState;
  defenderState?: CombatContextState;
  momentum?: { attacker: number; defender: number };
  position?: number;
  distance?: CombatDistance;
  fatigue?: { attacker: number; defender: number };
};

export type CombatResult = {
  winnerId: string;
  loserId: string;
  log: CombatLogEntry[];
  totalTurns: number;
  outcomeReason: "ko" | "timeout" | "critical_injury";
  injuredChickenId: string | null;
  /** V2 per-fighter deltas earned from this fight (spec §19, §27, §49) — additive, optional for back-compat. */
  experienceGained?: Record<string, CombatExperience>;
  newInjuries?: Record<string, InjuryRecord[]>;
  conditionDelta?: Record<string, number>;
  /** Human-readable "why you won/lost" breakdown (spec §49), keyed by chicken id. */
  analysis?: Record<string, string>;
};

export type EggStatus = "incubating";

/**
 * Genetics are locked in at conception. Hatching (POST /api/eggs/[id]/hatch)
 * consumes an incubating egg and produces a chick-stage Chicken.
 */
export type Egg = {
  id: string;
  fatherId: string;
  motherId: string;
  bloodlineId: string;
  breed?: string;
  generation: number;
  sex: ChickenSex;
  iv: StatBlock;
  physical: PhysicalBlock;
  colorScheme: ChickenColorScheme;
  mutations: MutationGenome;
  traits: Trait[];
  laidAt: number;
  status: EggStatus;
};
