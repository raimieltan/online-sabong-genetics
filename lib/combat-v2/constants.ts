export const COMBAT_VERSION = '2.0.0';
export const COMBAT_TICK_RATE = 60;
export const COMBAT_DT = 1 / COMBAT_TICK_RATE;
export const COMMAND_COOLDOWN_TICKS = 120;
export const COMMAND_BUFFER_TICKS = 12;
export const TACTICAL_MODES = ['balanced', 'pressure', 'defensive', 'counter', 'recover', 'all_in'] as const;
export const quantize = (n: number) => Math.round(n * 100000) / 100000;
export const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
