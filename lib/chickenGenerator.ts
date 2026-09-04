import {
  GENETIC_STAT_KEYS,
  type Chicken,
  type ChickenParentage,
  type ChickenSex,
  type CombatRecord,
  type StatBlock,
} from "./types";

const MIN_IV = 40;
const MAX_IV = 99;

const RANDOM_NAME_POOL: readonly string[] = [
  "Mayon",
  "Golden King",
  "Red Queen",
  "Sunset Hen",
  "Talon",
  "Ember",
  "Diablo",
  "Duke",
];

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

function pickRandomName(): string {
  return RANDOM_NAME_POOL[Math.floor(Math.random() * RANDOM_NAME_POOL.length)];
}

function pickRandomSex(): ChickenSex {
  return Math.random() < 0.5 ? "rooster" : "hen";
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

function randomStatBlock(min: number, max: number): StatBlock {
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
  iv: StatBlock;
};

/**
 * Builds a full Chicken record from its identity/genetics inputs, filling in
 * the fields every newly-created chicken starts with: zeroed EVs (training
 * has not happened yet), full health/energy, an empty record, no traits, and
 * "active" status.
 */
export function createChicken(input: CreateChickenInput): Chicken {
  return {
    id: input.id ?? cryptoSafeId(input.name),
    name: input.name,
    sex: input.sex,
    generation: input.generation,
    parents: input.parents,
    bloodlineId: input.bloodlineId,
    iv: input.iv,
    ev: zeroStatBlock(),
    traits: [],
    age: 0,
    health: 100,
    energy: 100,
    record: zeroRecord(),
    status: "active",
    createdAt: Date.now(),
  };
}

export type GenerateRandomChickenOptions = {
  name?: string;
  sex?: ChickenSex;
};

/**
 * Generates a generation-0 chicken with random IVs and no known parents.
 * A gen-0 bird founds its own bloodline, so its bloodlineId matches its id.
 */
export function generateRandomChicken(options: GenerateRandomChickenOptions = {}): Chicken {
  const id = cryptoSafeId(options.name ?? pickRandomName());
  return createChicken({
    id,
    name: options.name ?? pickRandomName(),
    sex: options.sex ?? pickRandomSex(),
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: id,
    iv: randomStatBlock(MIN_IV, MAX_IV),
  });
}
