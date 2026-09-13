ALTER TABLE "Chicken" ADD COLUMN "activeCombatSessionId" TEXT;
CREATE UNIQUE INDEX "Chicken_activeCombatSessionId_key" ON "Chicken"("activeCombatSessionId");

CREATE TABLE "CombatEncounter" (
  "id" TEXT NOT NULL, "ownerPlayerId" TEXT NOT NULL, "fighterId" TEXT NOT NULL,
  "mode" TEXT NOT NULL, "modeContextId" TEXT, "opponentSnapshot" JSONB NOT NULL,
  "ruleset" JSONB NOT NULL, "consumedBySessionId" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CombatEncounter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CombatEncounter_consumedBySessionId_key" ON "CombatEncounter"("consumedBySessionId");
CREATE INDEX "CombatEncounter_ownerPlayerId_fighterId_expiresAt_idx" ON "CombatEncounter"("ownerPlayerId", "fighterId", "expiresAt");

CREATE TABLE "CombatSessionRecord" (
  "id" TEXT NOT NULL, "ownerPlayerId" TEXT NOT NULL, "fighterId" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL, "createIdempotencyKey" TEXT NOT NULL, "mode" TEXT NOT NULL,
  "modeContextId" TEXT, "engineVersion" TEXT NOT NULL, "rulesetVersion" TEXT NOT NULL,
  "snapshotSchemaVersion" TEXT NOT NULL, "seed" TEXT NOT NULL,
  "fighterASnapshot" JSONB NOT NULL, "fighterBSnapshot" JSONB NOT NULL,
  "coachingMode" TEXT NOT NULL, "disconnectPolicy" TEXT NOT NULL, "activeCommand" TEXT NOT NULL,
  "status" TEXT NOT NULL, "phase" TEXT, "exchangeIndex" INTEGER NOT NULL DEFAULT 0,
  "logicalTick" INTEGER NOT NULL DEFAULT 0, "revision" INTEGER NOT NULL DEFAULT 0,
  "latestEventCursor" INTEGER NOT NULL DEFAULT 0, "engineCheckpoint" JSONB NOT NULL,
  "terminalResult" JSONB, "postFightPayload" JSONB, "settlementKey" TEXT NOT NULL,
  "voidReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3), "lastAdvancedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL,
  "terminalAt" TIMESTAMP(3), "settledAt" TIMESTAMP(3),
  CONSTRAINT "CombatSessionRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CombatSessionRecord_encounterId_key" ON "CombatSessionRecord"("encounterId");
CREATE UNIQUE INDEX "CombatSessionRecord_settlementKey_key" ON "CombatSessionRecord"("settlementKey");
CREATE UNIQUE INDEX "CombatSessionRecord_ownerPlayerId_createIdempotencyKey_key" ON "CombatSessionRecord"("ownerPlayerId", "createIdempotencyKey");
CREATE INDEX "CombatSessionRecord_ownerPlayerId_status_idx" ON "CombatSessionRecord"("ownerPlayerId", "status");
CREATE INDEX "CombatSessionRecord_fighterId_status_idx" ON "CombatSessionRecord"("fighterId", "status");

CREATE TABLE "CombatEventRecord" (
  "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "cursor" INTEGER NOT NULL,
  "logicalTick" INTEGER NOT NULL, "exchangeIndex" INTEGER NOT NULL, "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL, CONSTRAINT "CombatEventRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CombatEventRecord_sessionId_cursor_key" ON "CombatEventRecord"("sessionId", "cursor");
CREATE INDEX "CombatEventRecord_sessionId_cursor_idx" ON "CombatEventRecord"("sessionId", "cursor");

CREATE TABLE "CombatCommandRecord" (
  "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "commandId" TEXT NOT NULL,
  "command" TEXT NOT NULL, "receipt" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CombatCommandRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CombatCommandRecord_sessionId_commandId_key" ON "CombatCommandRecord"("sessionId", "commandId");

CREATE TABLE "CombatSettlementRecord" (
  "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "settlementKey" TEXT NOT NULL,
  "resultDigest" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CombatSettlementRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CombatSettlementRecord_sessionId_key" ON "CombatSettlementRecord"("sessionId");
CREATE UNIQUE INDEX "CombatSettlementRecord_settlementKey_key" ON "CombatSettlementRecord"("settlementKey");
