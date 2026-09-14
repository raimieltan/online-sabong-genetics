import test from "node:test";
import assert from "node:assert/strict";

import { TRAINING_PROGRAMS } from "../facilities/config";
import { TRAINING_CAMERA_PRESETS } from "../training/visuals/cameraPresets";
import { resolveTrainingSequence, TRAINING_ANIMATION_SEQUENCES } from "../training/visuals/sequences";
import { resolveTrainingStation, visibleTrainingStations } from "../training/visuals/stations";

test("every V3 program resolves to a complete visual station", () => {
  for (const program of Object.values(TRAINING_PROGRAMS)) {
    const station = resolveTrainingStation(program.id);
    assert.ok(station, `${program.id} needs a station`);
    assert.ok(station.programs.includes(program.id), `${program.id} must be explicitly mapped`);
    assert.ok(TRAINING_CAMERA_PRESETS[station.cameraPreset]);
    assert.ok(TRAINING_ANIMATION_SEQUENCES[resolveTrainingSequence(program.id, station.animationSequence)].length >= 4);
  }
});

test("distinct tactical and sparring programs retain distinct drill choreography", () => {
  assert.equal(resolveTrainingSequence("DEFENSIVE_DRILLS", "discipline_drill"), "defensive_drill");
  assert.equal(resolveTrainingSequence("PRESSURE_DRILLS", "discipline_drill"), "pressure_drill");
  assert.equal(resolveTrainingSequence("HARD_SPARRING", "controlled_sparring"), "hard_sparring");
});

test("camera presets keep one fixed navigation distance and FOV", () => {
  const overview = TRAINING_CAMERA_PRESETS.overview;
  for (const preset of Object.values(TRAINING_CAMERA_PRESETS)) {
    assert.deepEqual(preset.offset, overview.offset);
    assert.equal(preset.fov, overview.fov);
  }
});

test("facility levels progressively reveal stations in one camp", () => {
  let previous = 0;
  for (let level = 1; level <= 5; level += 1) {
    const visible = visibleTrainingStations(level);
    assert.ok(visible.length >= previous);
    assert.ok(visible.every((station) => station.minimumGymLevel <= level));
    previous = visible.length;
  }
});

test("sparring programs use the opponent-capable sparring pen", () => {
  for (const id of ["CONTROLLED_SPARRING", "HARD_SPARRING"] as const) {
    const station = resolveTrainingStation(id);
    assert.equal(station.id, "sparring_pen");
    assert.equal(station.prop, "pen");
    assert.ok(station.opponentPosition);
  }
});
