import type { TrainingCameraPresetId } from "./types";

export type TrainingCameraPreset = {
  offset: [number, number, number];
  lookOffset: [number, number, number];
  fov: number;
};

export const TRAINING_CAMERA_PRESETS: Record<TrainingCameraPresetId, TrainingCameraPreset> = {
  // The rig is displayed at the same ~1.5 world scale used elsewhere in the
  // game. Keep every interactive shot at a safe, near-constant radius so
  // navigation reads as a pan/reframe, never a camera dolly into the model.
  overview: { offset: [0, 8.5, 15], lookOffset: [0, .45, 0], fov: 42 },
  fighter_close: { offset: [0, 8.5, 15], lookOffset: [0, .7, 0], fov: 42 },
  physical_close: { offset: [0, 8.5, 15], lookOffset: [0, .7, 0], fov: 42 },
  lane_wide: { offset: [0, 8.5, 15], lookOffset: [0, .5, 0], fov: 42 },
  technique_close: { offset: [0, 8.5, 15], lookOffset: [0, .72, 0], fov: 42 },
  sparring_wide: { offset: [0, 8.5, 15], lookOffset: [0, .58, 0], fov: 42 },
  recovery_close: { offset: [0, 8.5, 15], lookOffset: [0, .58, 0], fov: 42 },
};
