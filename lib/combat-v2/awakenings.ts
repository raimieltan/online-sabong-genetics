import type { AwakeningType } from "./types";

export const AWAKENING_DURATION_SECONDS = 30;
export const AWAKENING_DURATION_TICKS = AWAKENING_DURATION_SECONDS * 60;

export interface AwakeningModifiers {
  /** Multiplies outgoing strike damage. */
  power: number;
  /** Multiplies damage received after defense is applied. */
  incomingDamage: number;
  /** Multiplies ground movement speed. */
  speed: number;
  /** Multiplies action stamina costs. */
  staminaCost: number;
  /** Flat stamina restored on every simulation tick. */
  staminaRecovery: number;
  /** Flat balance restored on every simulation tick. */
  balanceRecovery: number;
  /** Chance to phase-dodge an otherwise valid hit. */
  evadeChance: number;
  /** Flat resolve added when checking whether a strike interrupts an action. */
  resolve: number;
}

export const AWAKENING_MODIFIERS: Record<AwakeningType, AwakeningModifiers> = {
  unbreakable: {
    power: 1.1,
    incomingDamage: 0.62,
    speed: 0.98,
    staminaCost: 0.9,
    staminaRecovery: 0.08,
    balanceRecovery: 0.22,
    evadeChance: 0,
    resolve: 32,
  },
  berserker: {
    power: 1.28,
    incomingDamage: 1.12,
    speed: 1.12,
    staminaCost: 1.22,
    staminaRecovery: 0.02,
    balanceRecovery: 0.05,
    evadeChance: 0,
    resolve: 14,
  },
  "flow-state": {
    power: 1.15,
    incomingDamage: 0.9,
    speed: 1.2,
    staminaCost: 0.86,
    staminaRecovery: 0.07,
    balanceRecovery: 0.12,
    evadeChance: 0.3,
    resolve: 20,
  },
  "second-wind": {
    power: 1.13,
    incomingDamage: 0.86,
    speed: 1.13,
    staminaCost: 0.72,
    staminaRecovery: 0.3,
    balanceRecovery: 0.14,
    evadeChance: 0,
    resolve: 18,
  },
  apex: {
    power: 1.35,
    incomingDamage: 0.68,
    speed: 1.25,
    staminaCost: 0.76,
    staminaRecovery: 0.2,
    balanceRecovery: 0.24,
    evadeChance: 0.12,
    resolve: 36,
  },
};

export const awakeningModifiers = (type?: AwakeningType): AwakeningModifiers | null =>
  type ? AWAKENING_MODIFIERS[type] : null;
