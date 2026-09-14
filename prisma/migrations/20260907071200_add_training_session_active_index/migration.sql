-- Concurrency guard: only one ACTIVE training session per chicken at a time.
CREATE UNIQUE INDEX "TrainingSession_active_chicken_idx"
  ON "TrainingSession" ("chickenId")
  WHERE "status" = 'ACTIVE';
