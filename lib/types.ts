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

/** Color/pattern genes, mapped onto the new rig's 4 recolorable materials plus a shader pattern. */
export type ChickenColorScheme = {
  feathers: string;
  details: string;
  eyes: string;
  tail: string;
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
 * The 5 body-proportion genes the 3D rig can actually render (bone scales on
 * Chest/Neck/ThighL,R/Tail/WingL,R). A single genetic block — proportions
 * aren't trained, so there's no IV/EV split like the combat stats.
 */
export type PhysicalTraitKey = "body" | "neck" | "legs" | "tail" | "wings";

export const PHYSICAL_TRAIT_KEYS: readonly PhysicalTraitKey[] = [
  "body",
  "neck",
  "legs",
  "tail",
  "wings",
];

/** Inheritance/randomization clamp range per physical trait, matching the rig's slider bounds. */
export const PHYSICAL_TRAIT_RANGE: Record<PhysicalTraitKey, { min: number; max: number }> = {
  body: { min: 0.7, max: 1.4 },
  neck: { min: 0.6, max: 2.2 },
  legs: { min: 0.6, max: 2.0 },
  tail: { min: 0.4, max: 2.2 },
  wings: { min: 0.5, max: 2.0 },
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
};

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
};

export type CombatResult = {
  winnerId: string;
  loserId: string;
  log: CombatLogEntry[];
  totalTurns: number;
  outcomeReason: "ko" | "timeout" | "critical_injury";
  injuredChickenId: string | null;
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
  generation: number;
  sex: ChickenSex;
  iv: StatBlock;
  physical: PhysicalBlock;
  mutations: MutationGenome;
  traits: Trait[];
  laidAt: number;
  status: EggStatus;
};
