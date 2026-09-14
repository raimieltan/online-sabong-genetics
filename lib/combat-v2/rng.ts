/** Serializable 32-bit LCG. Zero is a valid seed; all arithmetic is specified integer arithmetic. */
export function createCombatRng(seed: number) {
  let state = seed >>> 0;
  const next = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  return { next, nextInt: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)), chance: (p: number) => next() < p, get state() { return state; } };
}
