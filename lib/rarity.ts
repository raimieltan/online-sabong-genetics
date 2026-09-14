import type { Trait, TraitRarity } from "./types";

/** Canonical worst-to-best ordering, shared by every rarity-aware display. */
export const RARITY_ORDER: readonly TraitRarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

export const RARITY_LABEL: Record<TraitRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_GEM: Record<TraitRarity, string> = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  epic: "🟣",
  legendary: "⭐",
};

export const RARITY_GLOW: Record<TraitRarity, string> = {
  common: "rgba(120, 113, 98, 0.28)",
  uncommon: "rgba(16, 185, 129, 0.32)",
  rare: "rgba(14, 165, 233, 0.32)",
  epic: "rgba(217, 70, 239, 0.32)",
  legendary: "rgba(240, 198, 116, 0.5)",
};

export const RARITY_BORDER: Record<TraitRarity, string> = {
  common: "border-neutral-600",
  uncommon: "border-emerald-600",
  rare: "border-sky-600",
  epic: "border-fuchsia-600",
  legendary: "border-(--color-gold)",
};

export const RARITY_COLOR: Record<TraitRarity, string> = {
  common: "border-neutral-600 text-neutral-300",
  uncommon: "border-emerald-600 text-emerald-300",
  rare: "border-sky-600 text-sky-300",
  epic: "border-fuchsia-600 text-fuchsia-300",
  legendary: "border-(--color-gold) text-(--color-gold-bright)",
};

/** The highest rarity among a chicken's traits, or "common" if it has none. */
export function topRarity(traits: readonly Trait[]): TraitRarity {
  return traits.reduce<TraitRarity>((best, trait) => {
    return RARITY_ORDER.indexOf(trait.rarity) > RARITY_ORDER.indexOf(best) ? trait.rarity : best;
  }, "common");
}
