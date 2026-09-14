import type { AwakeningType } from "@/lib/combat-v2/types";

export type AwakeningParticleMotion = "mirage" | "flame" | "embers" | "grounded" | "updraft";

/** Shared presentation tuning for an awakening's plumage, aura, and particles. */
export interface AwakeningVisual {
  tint: string;
  glow: string;
  glowIntensity: number;
  particleColor: string;
  particleColor2: string;
  particleCount: number;
  particleMotion: AwakeningParticleMotion;
  particleSpeed: number;
  particleSize: number;
  auraRadius: number;
  auraHeight: number;
  pulseSpeed: number;
  ringCount: number;
  lightIntensity: number;
}

export const AWAKENING_VISUALS: Record<AwakeningType, AwakeningVisual> = {
  // Cold, nearly weightless motion. Fast lateral wisps and refracted echoes
  // make the fighter appear half a step away from its real position.
  "flow-state": {
    tint: "#e9f7ff", glow: "#59c7ff", glowIntensity: 1.25,
    particleColor: "#d9f7ff", particleColor2: "#5277ff", particleCount: 48,
    particleMotion: "mirage", particleSpeed: 1.55, particleSize: 0.8,
    auraRadius: 0.48, auraHeight: 1.35, pulseSpeed: 2.8, ringCount: 2,
    lightIntensity: 0.75,
  },
  // Endgame, Super-Saiyan-like gold: a dense upward flame column, crackling
  // yellow sparks, concentric power rings, and the brightest light bloom.
  apex: {
    tint: "#fff7a8", glow: "#ffd21f", glowIntensity: 1.8,
    particleColor: "#fffbd1", particleColor2: "#ff9f0a", particleCount: 64,
    particleMotion: "flame", particleSpeed: 1.45, particleSize: 1.35,
    auraRadius: 0.6, auraHeight: 1.75, pulseSpeed: 4.4, ringCount: 3,
    lightIntensity: 1.8,
  },
  // Violent red embers kick out from the body instead of orbiting cleanly.
  berserker: {
    tint: "#420707", glow: "#ff2418", glowIntensity: 1.55,
    particleColor: "#ffb02e", particleColor2: "#c60000", particleCount: 54,
    particleMotion: "embers", particleSpeed: 1.8, particleSize: 1.15,
    auraRadius: 0.56, auraHeight: 1.4, pulseSpeed: 6.5, ringCount: 1,
    lightIntensity: 1.15,
  },
  // Dense stone-and-brass energy hugs the ground and sheds heavy dust.
  unbreakable: {
    tint: "#8d887b", glow: "#e2bd72", glowIntensity: 0.95,
    particleColor: "#e8d2a0", particleColor2: "#625746", particleCount: 46,
    particleMotion: "grounded", particleSpeed: 0.65, particleSize: 1.55,
    auraRadius: 0.68, auraHeight: 0.75, pulseSpeed: 1.35, ringCount: 3,
    lightIntensity: 0.7,
  },
  // Renewed life spirals upward in a clean mint-and-teal updraft.
  "second-wind": {
    tint: "#c9ffe5", glow: "#32f0a0", glowIntensity: 1.15,
    particleColor: "#dcfff0", particleColor2: "#20c98b", particleCount: 50,
    particleMotion: "updraft", particleSpeed: 1.2, particleSize: 1,
    auraRadius: 0.52, auraHeight: 1.55, pulseSpeed: 2.15, ringCount: 2,
    lightIntensity: 0.9,
  },
};
