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

/** Presentation-only campaign metadata. It deliberately never feeds combat. */
export type PveNodeType = "standard" | "gatekeeper" | "rival" | "challenge" | "qualifier" | "championship" | "special" | "invitational";

export type PveOpponentPresentation = {
  title: string;
  tagline: string;
  quote?: string;
  reputation: string;
  scoutReport: string;
  knownFor: string[];
  tendencies: Array<{ label: string; value: "low" | "moderate" | "high" | "very high" }>;
  record: { wins: number; losses: number; kos: number };
  venue: { name: string; location: string; environmentId: string };
  circuitId: string;
  nodeType: PveNodeType;
};

export type PveCircuit = {
  id: string;
  order: number;
  name: string;
  chapter: string;
  subtitle: string;
  description: string;
  environmentId: string;
  bossIds: PveBossId[];
  championshipBossId: PveBossId;
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
  presentation?: PveOpponentPresentation;
};

export type BossProgressView = {
  bossId: PveBossId;
  unlocked: boolean;
  completed: boolean;
  clearCount: number;
  firstClearedAt: string | null;
  firstClearChickenId: string | null;
};

export type PublicPveBoss = Omit<PveBossDefinition, "iv" | "ev" | "behaviorOverrides" | "experienceBaseline" | "condition" | "presentation"> & { presentation: PveOpponentPresentation };

export type BossListEntry = {
  boss: PublicPveBoss;
  progress: BossProgressView;
  rivalry: import("./rivalry").RivalryStatus;
  escalationDeltas: import("./escalation").EscalationDelta[];
};

export type CampaignProgressView = {
  completedCount: number;
  totalCount: number;
  reputation: number;
  rank: number;
  unlockedCircuitIds: string[];
};

/** Phase 3 — Optional Challenges / Invitationals / Special Encounters. These
 * fights live outside the fixed 20-boss ladder (§35 Phase 3) but reuse the
 * exact same PveBossDefinition shape so they flow through the same
 * fighter-build/session/finish pipeline as ladder bosses. */
export type SideEncounterKind = "challenge" | "invitational" | "special";

export type SideEncounterRequirement =
  | { type: "reputation"; min: number }
  | { type: "circuitCompleted"; circuitId: string }
  | { type: "cleanRecord"; maxLosses: number }
  | { type: "rivalryDecider"; bossId: PveBossId };

export type SideEncounterDefinition = Omit<PveBossDefinition, "id"> & {
  id: string;
  kind: SideEncounterKind;
  circuitId: string;
  requirement: SideEncounterRequirement;
};

export type CampaignEventView = {
  id: string;
  kind: "callout" | "rivalry_decider" | "invitational_unlocked" | "special_encounter_unlocked" | "milestone";
  bossId: string | null;
  headline: string;
  detail: string;
  seen: boolean;
  createdAt: string;
};
