import type { TrainingAnimationSequenceId, TrainingAnimationStep } from "./types";
import type { ProgramId } from "../../facilities/types";

const step = (
  state: TrainingAnimationStep["state"],
  visualState: TrainingAnimationStep["visualState"],
  duration: number,
  move?: TrainingAnimationStep["move"],
): TrainingAnimationStep => ({ state, visualState, duration, move });

export const TRAINING_ANIMATION_SEQUENCES: Record<TrainingAnimationSequenceId, readonly TrainingAnimationStep[]> = {
  generic_technique: [step("ready", "prepare", 1), step("peck_attack", "exercise", .65), step("backstep", "recover", .55), step("idle", "repeat", .8)],
  heavy_strikes: [step("ready", "prepare", .8), step("heavy_kick", "exercise", 1.15, "forward"), step("backstep", "recover", .65, "back"), step("recovery", "repeat", .65)],
  sprint_shuttles: [step("ready", "prepare", .6), step("run", "exercise", 1.35, "forward"), step("idle_alert", "recover", .45), step("run", "repeat", 1.35, "back")],
  footwork_circuit: [step("walk", "prepare", .8, "circle_left"), step("run", "exercise", .75, "circle_right"), step("backstep", "exercise", .45, "back"), step("ready", "recover", .65)],
  endurance_loop: [step("walk", "prepare", 1.2, "circle_left"), step("run", "exercise", 1.1, "forward"), step("walk", "repeat", 1.4, "circle_right"), step("recovery", "recover", .8)],
  precision_target: [step("idle_alert", "prepare", 1.05), step("peck_attack", "exercise", .6, "forward"), step("backstep", "recover", .5, "back"), step("ready", "repeat", .75)],
  counter_target: [step("tell_patience", "prepare", 1.15), step("backstep", "exercise", .42, "back"), step("quick_kick", "exercise", .72, "forward"), step("recovery", "recover", .62)],
  defensive_drill: [step("ready", "prepare", .9), step("backstep", "exercise", .48, "back"), step("wing_strike", "exercise", .62), step("recovery", "recover", .7)],
  pressure_drill: [step("tell_aggression", "prepare", .75), step("charge_attack", "exercise", .88, "forward"), step("wing_strike", "repeat", .62), step("recovery", "recover", .55)],
  discipline_drill: [step("ready", "prepare", 1.35), step("tell_patience", "exercise", 1.25), step("quick_kick", "exercise", .72), step("idle", "recover", 1.1)],
  recovery_drill: [step("walk", "prepare", 1.4, "circle_left"), step("idle", "recover", 1.6), step("walk", "repeat", 1.2, "circle_right"), step("recovery", "recover", 1)],
  controlled_sparring: [step("walk", "prepare", 1, "circle_left"), step("quick_kick", "exercise", .75, "forward"), step("backstep", "recover", .65, "back"), step("walk", "repeat", 1, "circle_right")],
  hard_sparring: [step("tell_aggression", "prepare", .65), step("charge_attack", "exercise", .85, "forward"), step("double_kick", "exercise", .92), step("backstep", "recover", .48, "back")],
};

export const TRAINING_INTENSITY_PACE = { light: .84, normal: 1, hard: 1.14, extreme: 1.24 } as const;

const PROGRAM_SEQUENCE_OVERRIDES: Partial<Record<ProgramId, TrainingAnimationSequenceId>> = {
  DEFENSIVE_DRILLS: "defensive_drill",
  PRESSURE_DRILLS: "pressure_drill",
  DISCIPLINE_TRAINING: "discipline_drill",
  CONTROLLED_SPARRING: "controlled_sparring",
  HARD_SPARRING: "hard_sparring",
};

export function resolveTrainingSequence(programId: ProgramId | undefined, fallback: TrainingAnimationSequenceId) {
  return programId ? PROGRAM_SEQUENCE_OVERRIDES[programId] ?? fallback : fallback;
}
