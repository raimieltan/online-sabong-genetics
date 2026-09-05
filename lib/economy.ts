/**
 * Battle Credits are the purchasable, spendable in-game currency (training,
 * breeding, marketplace, cosmetics). Tournament Tokens are earned only
 * through competition and are never purchasable — this separation is
 * deliberate per the mechanics spec (§30 Battle Credits): mixing a
 * real-money-purchasable currency with tournament wagering creates
 * Philippine gambling/regulatory risk, even if credits can't be cashed out.
 */

export const STARTING_CREDITS = 500;

/** Battle Credits awarded to the winner of a fight. */
export const BATTLE_WIN_CREDITS = 25;

export function canAfford(balance: number, amount: number): boolean {
  return balance >= amount;
}

/** Spends `amount` from `balance`, never going below zero. */
export function spendCredits(balance: number, amount: number): number {
  return Math.max(0, balance - amount);
}

export function earnCredits(balance: number, amount: number): number {
  return balance + amount;
}
