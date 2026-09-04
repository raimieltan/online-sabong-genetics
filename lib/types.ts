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
