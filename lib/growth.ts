import { GROWTH_STAGES, type Chicken, type GrowthStage } from "./types";

const TRAINABLE_STAGES: readonly GrowthStage[] = ["young_adult", "adult", "prime", "senior"];
const BREEDABLE_STAGES: readonly GrowthStage[] = ["adult", "prime", "senior", "retired"];

/**
 * Visual growth stops at adulthood. Prime/senior/retired birds keep their
 * adult frame; those stages describe career maturity, not another size jump.
 */
const GROWTH_VISUAL_SCALE: Record<GrowthStage, number> = {
  chick: 0.46,
  juvenile: 0.66,
  young_adult: 0.84,
  adult: 1,
  prime: 1,
  senior: 1,
  retired: 1,
};

/** Minimum coherent age for a bird currently in each growth stage. */
const MIN_STAGE_AGE: Record<GrowthStage, number> = {
  chick: 0,
  juvenile: 1,
  young_adult: 1,
  adult: 2,
  prime: 3,
  senior: 4,
  retired: 4,
};

export type AgeUpRequirement = {
  id: "stage_age" | "active" | "healthy" | "condition" | "energy";
  label: string;
  met: boolean;
};

type AgeUpChicken = Pick<Chicken, "age" | "condition" | "energy" | "growthStage" | "health" | "injured" | "status">;

export function growthVisualScale(stage: GrowthStage): number {
  return GROWTH_VISUAL_SCALE[stage] ?? 1;
}

/**
 * Readiness checks shared by the API and UI. These are intentionally
 * recoverable requirements: rest and medical care can make a bird ready.
 */
export function ageUpRequirements(chicken: AgeUpChicken): AgeUpRequirement[] {
  const minimumAge = MIN_STAGE_AGE[chicken.growthStage];
  return [
    {
      id: "stage_age",
      label: `Age ${minimumAge}+ for ${chicken.growthStage.replace("_", " ")} stage`,
      met: chicken.age >= minimumAge,
    },
    { id: "active", label: "Active career status", met: chicken.status === "active" },
    { id: "healthy", label: "Healthy and free of injury", met: !chicken.injured && chicken.health >= 80 },
    { id: "condition", label: "Condition at least 60", met: (chicken.condition ?? 100) >= 60 },
    { id: "energy", label: "Energy at least 40", met: chicken.energy >= 40 },
  ];
}

export function canChickenAgeUp(chicken: AgeUpChicken): boolean {
  return canAgeUp(chicken.growthStage) && ageUpRequirements(chicken).every((requirement) => requirement.met);
}

/**
 * Continuous developmental multiplier (V2 lifecycle spec §3-8): IV/EV stay
 * immutable genetic potential — growth determines how much of that potential
 * is physically realized yet. Applied at effectiveStat(), never to stored
 * iv/ev. Prime is the ceiling (1.0); decline tapers gradually rather than
 * cratering (spec §22 — a veteran keeps most of its physical capability).
 */
const GROWTH_FACTOR: Record<GrowthStage, number> = {
  chick: 0.35,
  juvenile: 0.55,
  young_adult: 0.8,
  adult: 0.95,
  prime: 1.0,
  senior: 0.85,
  retired: 0.7,
};

export function growthFactor(stage: GrowthStage): number {
  return GROWTH_FACTOR[stage] ?? 1;
}

export function nextGrowthStage(stage: GrowthStage): GrowthStage {
  const index = GROWTH_STAGES.indexOf(stage);
  if (index === -1 || index >= GROWTH_STAGES.length - 2) return stage;
  return GROWTH_STAGES[index + 1];
}

export function canAgeUp(stage: GrowthStage): boolean {
  return stage !== "senior" && stage !== "retired";
}

export function canRetire(stage: GrowthStage): boolean {
  return stage === "senior";
}

export function canTrain(stage: GrowthStage): boolean {
  return TRAINABLE_STAGES.includes(stage);
}

export function canBattle(stage: GrowthStage): boolean {
  return TRAINABLE_STAGES.includes(stage);
}

export function canBreed(stage: GrowthStage): boolean {
  return BREEDABLE_STAGES.includes(stage);
}
