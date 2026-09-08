import type {
  BehavioralProfile,
  CombatExperience,
  FightingStyle,
  StatBlock,
} from "../types";

export type PveBossId =
  | "rookie"
  | "scrapper"
  | "brawler"
  | "charger"
  | "wall"
  | "striker"
  | "grinder"
  | "feint-master"
  | "pressure-king"
  | "veteran"
  | "iron-rooster"
  | "phantom"
  | "executioner"
  | "champion"
  | "challenger"
  | "tactician"
  | "berserker"
  | "counter-master"
  | "warlord"
  | "apex";

export const PVE_BOSS_ORDER: readonly PveBossId[] = [
  "rookie",
  "scrapper",
  "brawler",
  "charger",
  "wall",
  "striker",
  "grinder",
  "feint-master",
  "pressure-king",
  "veteran",
  "iron-rooster",
  "phantom",
  "executioner",
  "champion",
  "challenger",
  "tactician",
  "berserker",
  "counter-master",
  "warlord",
  "apex",
];

/** Coarse 0–10 bars shown on the boss preview (§14) — authored intent, not derived from IVs. */
export type BossPreviewBars = {
  strength: number;
  speed: number;
  endurance: number;
};

export type BossRewardConfig = {
  /** Battle Credits granted the first time this boss is cleared. */
  firstClearCredits: number;
  /** Battle Credits granted on every subsequent clear. */
  repeatCredits: number;
  /** Multiplier applied to the combat experience the fight already produces for the player's chicken (§20). */
  experienceMultiplier: number;
};

export type PveBossDefinition = {
  id: PveBossId;
  order: number;
  name: string;
  /** 1–5 stars. */
  difficulty: number;
  styleLabel: string;
  behaviorLabel: string;
  description: string;
  fightingStyle: FightingStyle;
  /** Fixed genetic stats — bosses never scale to the player (§24). */
  iv: StatBlock;
  ev: StatBlock;
  behaviorOverrides?: Partial<BehavioralProfile>;
  experienceBaseline?: Partial<CombatExperience>;
  /** 0–100 battle condition; defaults to 100. */
  condition?: number;
  preview: BossPreviewBars;
  recommendation: string;
  rewards: BossRewardConfig;
};

export type BossProgressView = {
  bossId: PveBossId;
  unlocked: boolean;
  completed: boolean;
  clearCount: number;
  firstClearedAt: string | null;
  firstClearChickenId: string | null;
};

export type BossListEntry = {
  boss: Omit<PveBossDefinition, "iv" | "ev" | "behaviorOverrides" | "experienceBaseline" | "condition">;
  progress: BossProgressView;
};
