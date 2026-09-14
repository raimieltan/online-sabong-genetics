import type { ProgramId } from "@/lib/facilities/types";
import type { Chicken, RoosterTrainingState, TrainingCategory, TrainingIntensity } from "@/lib/types";
import type { TrainingPreview, TrainingResult } from "@/lib/training/types";

export type FacilityViewDTO = {
  id: string;
  level: number;
  capacity: number;
  efficiency: number;
  fatigueMultiplier: number;
  injuryMultiplier: number;
  experienceMultiplier: number;
  breakthroughMultiplier: number;
  potentialDiscoveryMultiplier: number;
  unlockedPrograms: ProgramId[];
};

export type SessionDTO = {
  id: string;
  chickenId: string;
  programId: ProgramId;
  category: TrainingCategory;
  intensity: Exclude<TrainingIntensity, "moderate">;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startedAt: string;
  durationMinutes: number;
  energyCost: number;
  fatigueCost: number;
  stressCost: number;
  trainingPointCost: number;
  completedAt?: string | null;
  adaptationResult?: TrainingResult | null;
};

export type TrainingChickenDevelopment = RoosterTrainingState;
export type TrainingChicken = Chicken & { trainingDevelopment?: TrainingChickenDevelopment | null };
export type TrainingPreviewDTO = TrainingPreview;

export function remainingMilliseconds(session: Pick<SessionDTO, "startedAt" | "durationMinutes">, now = Date.now()): number {
  return Math.max(0, new Date(session.startedAt).getTime() + session.durationMinutes * 60_000 - now);
}

export function formatRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
