import { BREED_PRESETS, pickRandomBreed, type BreedId } from "./breeds";
import { deriveBehaviorProfile } from "./combat/behavior";
import { emptyExperience } from "./combat/experience";
import { emptyCombatCareer } from "./combat/evolution";
import { inheritPhysicalTrait, jitterColorScheme } from "./genetics";
import { defaultTrainingState } from "./training/limits";
import {
  FIGHTING_STYLES,
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  PHYSICAL_TRAIT_RANGE,
  type Chicken,
  type ChickenColorScheme,
  type ChickenParentage,
  type ChickenSex,
  type CombatRecord,
  type FightingStyle,
  type GrowthStage,
  type MutationGenome,
  type PhysicalBlock,
  type StatBlock,
  type Trait,
} from "./types";
import { COLOR_PALETTES } from "./roosterGenerator";

const MIN_IV = 40;
const MAX_IV = 99;

/** Standalone names — breed/culture flavor, gamefowl slang, and one-word monikers. */
const SINGLE_NAME_POOL: readonly string[] = [
  "Mayon", "Golden King", "Red Queen", "Sunset Hen", "Talon", "Ember", "Diablo",
  "Duke", "Kelso", "Hatch", "Sweater", "Shamo", "Asil", "Sumatra", "Malay",
  "Claret", "Radio", "McRae", "Sid Taylor", "Whitehackle", "Brown Red", "Cornish",
  "Peruvian", "Spaniard", "Thai Fury", "Old English", "Roundhead", "Twister",
  "Grey Ghost", "Blackjack", "Crimson Spur", "Ironclaw", "Warlord", "Firecrest",
  "Stormcock", "Bantam Blitz", "Copperhead", "Vanguard", "Ridgeback", "Wildfire",
  "Steelwing", "Matador", "Bolo", "Sultan", "Rajah", "Kalabaw", "Ligaw", "Tigre",
  "Agila", "Bagwis", "Kidlat", "Bulkan", "Tornado", "Sablay", "Barako",
  "Kampeon", "Datu", "Lakan", "Bathala", "Sinag", "Alon", "Yabang", "Sigwa",
  "Bagyo", "Apoy", "Bituin", "Dagitab", "Lipad", "Bangis", "Alipin", "Hari",
  "Basagulero", "Berdugo", "Bantay", "Silakbo", "Sungkit", "Tapang", "Digmaan",
  "Lakas", "Bala", "Bagsik", "Sindak", "Ngitngit", "Poot", "Init", "Gitgit",
];

/** Combinatorial pool: PREFIX + SUFFIX gives thousands of unique two-word names. */
const NAME_PREFIXES: readonly string[] = [
  "Golden", "Crimson", "Shadow", "Iron", "Storm", "Blazing", "Midnight", "Silver",
  "Copper", "Obsidian", "Emerald", "Sapphire", "Scarlet", "Ashen", "Rusty", "Bronze",
  "Ghost", "Thunder", "Lightning", "Savage", "Feral", "Wild", "Royal", "Noble",
  "Mighty", "Fierce", "Grim", "Dark", "Bright", "Blood", "Frost", "Steel", "Stone",
  "Rogue", "Vicious", "Brutal", "Swift", "Sly", "Cunning", "Proud", "Ancient",
  "Wise", "Bold", "Reckless", "Silent", "Howling", "Rising", "Burning", "Cursed",
  "Blessed", "Divine", "Sacred", "Wicked", "Vengeful", "Restless", "Untamed",
  "Loyal", "Fearless", "Raging", "Prowling", "Lurking", "Menacing", "Deadly",
  "Lethal", "Toxic", "Venomous", "Electric", "Radiant", "Molten", "Frozen",
];
const NAME_SUFFIXES: readonly string[] = [
  "King", "Queen", "Duke", "Baron", "Warlord", "Champion", "Fury", "Fang", "Talon",
  "Claw", "Spur", "Blade", "Storm", "Hawk", "Falcon", "Viper", "Cobra", "Dragon",
  "Phoenix", "Wolf", "Tiger", "Lion", "Bear", "Shark", "Ghost", "Reaper",
  "Executioner", "Assassin", "Gladiator", "Warrior", "Knight", "Titan", "Colossus",
  "Legend", "Wraith", "Specter", "Demon", "Devil", "Angel", "Saint", "Sinner",
  "Outlaw", "Bandit", "Renegade", "Marauder", "Berserker", "Brawler", "Slayer",
  "Crusher", "Breaker", "Hunter", "Predator", "Stalker", "Ranger", "Scout",
  "Sentinel", "Guardian", "Vanguard", "Rebel", "Maverick", "Butcher", "Avenger",
];

function pickFrom<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function cryptoSafeId(seed: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to deterministic fallback below
  }
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "chicken"}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Draws from the standalone-name pool a third of the time, and otherwise
 * composes a PREFIX + SUFFIX name (69 * 63 ≈ 4,300 combinations), so the
 * total addressable name space is large enough that collisions stay rare
 * even with hundreds of chickens in play.
 */
function pickRandomName(): string {
  if (Math.random() < 1 / 3) {
    return pickFrom(SINGLE_NAME_POOL);
  }
  return `${pickFrom(NAME_PREFIXES)} ${pickFrom(NAME_SUFFIXES)}`;
}

/** Picks a random name from the same pool used for gen-0 chickens, for hatched chicks. */
export function generateChickName(): string {
  return pickRandomName();
}

export type NameExistsChecker = (name: string) => Promise<boolean>;

/**
 * Rolls names until one isn't already taken (checked via `exists`, e.g. a DB
 * lookup). Falls back to appending an incrementing numeral suffix if the
 * random pool keeps colliding, so a unique name is always returned.
 */
export async function generateUniqueChickName(
  exists: NameExistsChecker,
  maxAttempts = 20,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = pickRandomName();
    if (!(await exists(candidate))) {
      return candidate;
    }
  }
  const base = pickRandomName();
  let suffix = 2;
  let candidate = `${base} ${suffix}`;
  while (await exists(candidate)) {
    suffix += 1;
    candidate = `${base} ${suffix}`;
  }
  return candidate;
}

function pickRandomSex(): ChickenSex {
  return Math.random() < 0.5 ? "rooster" : "hen";
}

function pickRandomFightingStyle(): FightingStyle {
  return FIGHTING_STYLES[Math.floor(Math.random() * FIGHTING_STYLES.length)];
}

/**
 * Picks a base palette (or breed preset colors layered on top), then jitters every material color
 * per-individual so two chickens sharing a palette/breed don't end up with byte-identical colors —
 * same hue/lightness drift shape breeding uses in inheritColorScheme.
 */
function pickRandomColorScheme(breedId?: BreedId): ChickenColorScheme {
  const base = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
  const overrides = breedId ? BREED_PRESETS[breedId].colors : undefined;
  return jitterColorScheme({ ...base, ...overrides });
}

/** Baseline (all-1) physical block — gen-0 stock and any input that doesn't specify physique. */
function defaultPhysicalBlock(): PhysicalBlock {
  const block = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => (block[key] = 1));
  return block;
}

/**
 * Uniform-random physical block across each trait's full rig-supported range,
 * for gen-0 chickens. When `breedId` is set, each trait the breed's preset
 * specifies is blended toward that preset value (same weighted-blend-plus-
 * noise shape as breeding inheritance) instead of pure uniform-random;
 * unspecified traits stay fully random.
 */
function randomPhysicalBlock(breedId?: BreedId): PhysicalBlock {
  const block = {} as PhysicalBlock;
  const preset = breedId ? BREED_PRESETS[breedId].traits : undefined;
  PHYSICAL_TRAIT_KEYS.forEach((key) => {
    const range = PHYSICAL_TRAIT_RANGE[key];
    const rolled = range.min + Math.random() * (range.max - range.min);
    const presetValue = preset?.[key];
    block[key] =
      presetValue !== undefined
        ? inheritPhysicalTrait(presetValue, rolled, range)
        : Number(rolled.toFixed(2));
  });
  return block;
}

function zeroStatBlock(): StatBlock {
  const stats = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => {
    stats[key] = 0;
  });
  return stats;
}

function zeroRecord(): CombatRecord {
  return { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 };
}

export function randomStatBlock(min: number, max: number): StatBlock {
  const stats = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => {
    stats[key] = min + Math.floor(Math.random() * (max - min + 1));
  });
  return stats;
}

export type CreateChickenInput = {
  id?: string;
  name: string;
  sex: ChickenSex;
  generation: number;
  parents: ChickenParentage;
  bloodlineId: string;
  breed?: string;
  iv: StatBlock;
  /** Pre-trained effort values — only used to spawn already-"trained" NPCs (e.g. tournament/PvE opponents); real player chickens always hatch at zero. */
  ev?: StatBlock;
  physical?: PhysicalBlock;
  colorScheme?: ChickenColorScheme;
  mutations?: MutationGenome;
  growthStage?: GrowthStage;
  traits?: Trait[];
};

/**
 * Builds a full Chicken record from its identity/genetics inputs, filling in
 * the fields every newly-created chicken starts with: zeroed EVs by default
 * (training has not happened yet — unless `input.ev` simulates a pre-trained
 * NPC), full health/energy, an empty record, no traits, and "active" status.
 */
export function createChicken(input: CreateChickenInput): Chicken {
  const fightingStyle = pickRandomFightingStyle();
  const traits = input.traits ?? [];
  return {
    id: input.id ?? cryptoSafeId(input.name),
    name: input.name,
    sex: input.sex,
    generation: input.generation,
    parents: input.parents,
    bloodlineId: input.bloodlineId,
    breed: input.breed,
    iv: input.iv,
    ev: input.ev ?? zeroStatBlock(),
    physical: input.physical ?? defaultPhysicalBlock(),
    mutations: input.mutations ?? {},
    traits,
    age: 0,
    health: 100,
    energy: 100,
    record: zeroRecord(),
    status: "active",
    growthStage: input.growthStage ?? "chick",
    fightingStyle,
    colorScheme: input.colorScheme ?? pickRandomColorScheme(),
    injured: false,
    createdAt: Date.now(),
    behavior: deriveBehaviorProfile(fightingStyle, traits),
    experience: emptyExperience(),
    condition: 100,
    injuries: [],
    combatCareer: emptyCombatCareer(),
    trainingState: defaultTrainingState(),
  };
}

export type GenerateRandomChickenOptions = {
  name?: string;
  sex?: ChickenSex;
  breedId?: BreedId;
  /** Defaults to "chick" (a freshly-hatched bird). Opponent generators should pass a battle-ready stage — see `generateMatchedOpponent`. */
  growthStage?: GrowthStage;
  /** Defaults to untrained (all zero). Opponent generators can pass a rolled block to simulate a "trained" NPC. */
  ev?: StatBlock;
};

/**
 * Generates a generation-0 chicken with random IVs and no known parents.
 * A gen-0 bird founds its own bloodline, so its bloodlineId matches its id.
 * Rolls a breed archetype (see lib/breeds.ts) unless one is given explicitly.
 */
export function generateRandomChicken(options: GenerateRandomChickenOptions = {}): Chicken {
  const id = cryptoSafeId(options.name ?? pickRandomName());
  const breedId = "breedId" in options ? options.breedId : pickRandomBreed();
  return createChicken({
    id,
    name: options.name ?? pickRandomName(),
    sex: options.sex ?? pickRandomSex(),
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: id,
    breed: breedId,
    iv: randomStatBlock(MIN_IV, MAX_IV),
    ev: options.ev,
    physical: randomPhysicalBlock(breedId),
    colorScheme: pickRandomColorScheme(breedId),
    growthStage: options.growthStage,
  });
}

/** Same as {@link generateRandomChicken}, but resolves a name not already taken (via `exists`) first. */
export async function generateUniqueRandomChicken(
  options: GenerateRandomChickenOptions,
  exists: NameExistsChecker,
): Promise<Chicken> {
  const name = options.name ?? (await generateUniqueChickName(exists));
  return generateRandomChicken({ ...options, name });
}
