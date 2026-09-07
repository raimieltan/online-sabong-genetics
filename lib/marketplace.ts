import { randomUUID } from "node:crypto";

import { generateRandomChicken } from "./chickenGenerator";
import { chickenValue } from "./valuation";
import type {
  Chicken,
  ChickenColorScheme,
  ChickenSex,
  FightingStyle,
  MutationGenome,
  PhysicalBlock,
  StatBlock,
  Trait,
} from "./types";

/** How many NPC listings the market keeps in stock at once. */
export const MARKET_STOCK_SIZE = 6;

/** Marketplace markup over the chicken's raw suggested value. */
const MARKET_MARKUP = 1.15;

/** What a player receives for selling a chicken back — below market value on purpose. */
const SELL_PAYOUT_RATE = 0.5;

export type MarketListingRow = {
  id: string;
  name: string;
  sex: ChickenSex;
  generation: number;
  fatherId: string | null;
  motherId: string | null;
  bloodlineId: string;
  breed?: string;
  iv: StatBlock;
  physical: PhysicalBlock;
  mutations: MutationGenome;
  traits: Trait[];
  fightingStyle: FightingStyle;
  colorScheme: ChickenColorScheme;
  price: number;
};

/** Generates a single random NPC chicken listing, priced above its base value. */
export function generateListing(): MarketListingRow {
  const chicken = generateRandomChicken();
  return {
    id: randomUUID(),
    name: chicken.name,
    sex: chicken.sex,
    generation: chicken.generation,
    fatherId: chicken.parents.fatherId,
    motherId: chicken.parents.motherId,
    bloodlineId: chicken.bloodlineId,
    breed: chicken.breed,
    iv: chicken.iv,
    physical: chicken.physical,
    mutations: chicken.mutations,
    traits: chicken.traits,
    fightingStyle: chicken.fightingStyle,
    colorScheme: chicken.colorScheme,
    price: Math.round(chickenValue(chicken) * MARKET_MARKUP),
  };
}

/** Converts a purchased listing into a fresh, owned Chicken ready to insert. */
export function listingToChicken(listing: MarketListingRow): Chicken {
  return {
    id: randomUUID(),
    name: listing.name,
    sex: listing.sex,
    generation: listing.generation,
    parents: { fatherId: listing.fatherId, motherId: listing.motherId },
    bloodlineId: listing.bloodlineId,
    breed: listing.breed,
    iv: listing.iv,
    ev: Object.fromEntries(Object.keys(listing.iv).map((key) => [key, 0])) as StatBlock,
    physical: listing.physical,
    mutations: listing.mutations,
    traits: listing.traits,
    age: 0,
    health: 100,
    energy: 100,
    record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
    status: "active",
    growthStage: "adult",
    fightingStyle: listing.fightingStyle,
    colorScheme: listing.colorScheme,
    injured: false,
    createdAt: Date.now(),
  };
}

/** What a player is paid for selling `chicken` back to the market. */
export function sellPrice(chicken: Chicken): number {
  return Math.round(chickenValue(chicken) * SELL_PAYOUT_RATE);
}
