import type { AnimState } from "../../animation/types";
import type { ProgramId } from "../../facilities/types";
import type { TrainingIntensity } from "../../types";

export type TrainingStationId =
  | "central_yard"
  | "strength_post"
  | "sprint_lane"
  | "footwork_markers"
  | "endurance_lane"
  | "target_pad"
  | "reaction_rig"
  | "discipline_post"
  | "recovery_corner"
  | "sparring_pen";

export type TrainingAnimationSequenceId =
  | "generic_technique"
  | "heavy_strikes"
  | "sprint_shuttles"
  | "footwork_circuit"
  | "endurance_loop"
  | "precision_target"
  | "counter_target"
  | "defensive_drill"
  | "pressure_drill"
  | "discipline_drill"
  | "recovery_drill"
  | "controlled_sparring"
  | "hard_sparring";

export type TrainingCameraPresetId =
  | "overview"
  | "fighter_close"
  | "physical_close"
  | "lane_wide"
  | "technique_close"
  | "sparring_wide"
  | "recovery_close";

export type TrainingVisualState =
  | "idle"
  | "approach_station"
  | "prepare"
  | "exercise"
  | "recover"
  | "repeat"
  | "complete";

export interface TrainingStationDefinition {
  id: TrainingStationId;
  label: string;
  programs: ProgramId[];
  position: [number, number, number];
  rotation: number;
  opponentPosition?: [number, number, number];
  minimumGymLevel: number;
  animationSequence: TrainingAnimationSequenceId;
  cameraPreset: TrainingCameraPresetId;
  prop: "post" | "lane" | "markers" | "bag" | "reaction" | "water" | "pen" | "none";
}

export interface TrainingAnimationStep {
  state: AnimState;
  visualState: TrainingVisualState;
  duration: number;
  move?: "forward" | "back" | "circle_left" | "circle_right" | "hold";
}

export interface TrainingVisualizationContext {
  chickenId: string;
  programId: ProgramId;
  intensity: Exclude<TrainingIntensity, "moderate">;
  startedAt: string;
  durationMinutes: number;
  station: TrainingStationDefinition;
  isSelected: boolean;
}

export type TrainingCameraMode =
  | "overview"
  | "fighter_focus"
  | "station_focus"
  | "active_training"
  | "completion"
  | "breakthrough";
