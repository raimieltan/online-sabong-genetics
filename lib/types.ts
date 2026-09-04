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

export type RoosterColorScheme = {
  body: string;
  head: string;
  comb: string;
  tail: string;
  feet: string;
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
  colorScheme: RoosterColorScheme;
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

export type ChickenSex = "rooster" | "hen";

export type ChickenStatus = "active" | "injured" | "retired" | "deceased";

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
  traits: Trait[];
  age: number;
  health: number;
  energy: number;
  record: CombatRecord;
  status: ChickenStatus;
  createdAt: number;
};

export type EggStatus = "incubating";

/**
 * Genetics are locked in at conception. An egg has no hatching mechanism
 * yet (that's a later roadmap item) — it simply records what a breeding
 * produced.
 */
export type Egg = {
  id: string;
  fatherId: string;
  motherId: string;
  bloodlineId: string;
  generation: number;
  sex: ChickenSex;
  iv: StatBlock;
  traits: Trait[];
  laidAt: number;
  status: EggStatus;
};
