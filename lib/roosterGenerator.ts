import {
  STAT_KEYS,
  type ChickenColorScheme,
  type Rooster,
  type StatKey,
} from "./types";

const MIN_STAT = 20;
const MAX_STAT = 100;
const MIN_TOTAL_POINTS = 300;
const TOTAL_POINTS_SPREAD = 51; // yields totalPoints in [300, 350]

const RANDOM_NAME_POOL: readonly string[] = [
  "Thunder",
  "Blaze",
  "Diablo",
  "Ranger",
  "Turbo",
  "Ghost",
  "Cyclone",
  "Duke",
  "Ace",
  "Reaper",
  "Talon",
  "Ember",
];

/** Dark-neon palette families from the design spec (reds / greens / browns), remapped onto the new rig's materials. */
export const COLOR_PALETTES: readonly ChickenColorScheme[] = [
  { feathers: "#d4514f", details: "#ff0000", eyes: "#050505", tail: "#ff4444", pattern: "SOLID", patternColor: "#5c1f1d" },
  { feathers: "#4a7c59", details: "#ff0000", eyes: "#050505", tail: "#66cc88", pattern: "BARRED", patternColor: "#1c3a26" },
  { feathers: "#8b6f47", details: "#ff0000", eyes: "#050505", tail: "#a0826d", pattern: "MOTTLED", patternColor: "#4a3521" },
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
  return `${slug || "rooster"}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pickRandomName(): string {
  return RANDOM_NAME_POOL[Math.floor(Math.random() * RANDOM_NAME_POOL.length)];
}

function pickRandomPalette(): ChickenColorScheme {
  return { ...COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)] };
}

/**
 * Distributes `totalPoints` across the six stats using random positive
 * weights, clamps each stat to the 20-100 "playable" range, then rebalances
 * any rounding drift so the pool sums back to exactly `totalPoints` whenever
 * the clamp bounds allow it (they always do for totalPoints in [300, 350]).
 */
function generateStatPool(totalPoints: number): Record<StatKey, number> {
  const weights = STAT_KEYS.map(() => Math.random() + 0.05);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  const rawValues = weights.map((weight) => (weight / weightSum) * totalPoints);
  const values = rawValues.map((value) => clamp(Math.round(value), MIN_STAT, MAX_STAT));

  let drift = totalPoints - values.reduce((sum, value) => sum + value, 0);
  let guard = 0;
  const maxGuard = 10_000;
  while (drift !== 0 && guard < maxGuard) {
    const index = Math.floor(Math.random() * values.length);
    if (drift > 0 && values[index] < MAX_STAT) {
      values[index] += 1;
      drift -= 1;
    } else if (drift < 0 && values[index] > MIN_STAT) {
      values[index] -= 1;
      drift += 1;
    }
    guard += 1;
  }

  const stats = {} as Record<StatKey, number>;
  STAT_KEYS.forEach((key, index) => {
    stats[key] = values[index];
  });
  return stats;
}

export function createRooster(
  input: Omit<Rooster, "id" | "maxHp" | "hp" | "fatigued"> & { id?: string }
): Rooster {
  const maxHp = 50 + input.stamina * 1.5;
  return { ...input, id: input.id ?? cryptoSafeId(input.name), maxHp, hp: maxHp, fatigued: false };
}

export function getStatTotal(rooster: Pick<Rooster, StatKey>): number {
  return STAT_KEYS.reduce((total, key) => total + rooster[key], 0);
}

export function calculateOdds(selected: Rooster, opponent: Rooster): number {
  return Math.max(
    1.05,
    Number(((getStatTotal(opponent) / getStatTotal(selected)) * 1.8).toFixed(2))
  );
}

export function generateRandomRooster(name?: string): Rooster {
  const totalPoints = MIN_TOTAL_POINTS + Math.floor(Math.random() * TOTAL_POINTS_SPREAD);
  const stats = generateStatPool(totalPoints);
  return createRooster({
    name: name ?? pickRandomName(),
    type: "Custom",
    ...stats,
    colorScheme: pickRandomPalette(),
  });
}

export const PRESET_ROOSTERS: Rooster[] = [
  createRooster({
    id: "preset-lightning",
    name: "Lightning",
    type: "Speed Demon",
    speed: 85,
    stamina: 40,
    damage: 70,
    aggression: 80,
    defense: 20,
    luck: 50,
    colorScheme: COLOR_PALETTES[0],
  }),
  createRooster({
    id: "preset-fortress",
    name: "Fortress",
    type: "Tank",
    speed: 40,
    stamina: 90,
    damage: 50,
    aggression: 30,
    defense: 85,
    luck: 30,
    colorScheme: COLOR_PALETTES[1],
  }),
  createRooster({
    id: "preset-champion",
    name: "Champion",
    type: "Balanced",
    speed: 65,
    stamina: 70,
    damage: 65,
    aggression: 60,
    defense: 60,
    luck: 50,
    colorScheme: COLOR_PALETTES[2],
  }),
];
