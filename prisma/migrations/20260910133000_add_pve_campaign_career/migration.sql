CREATE TABLE "PveCampaignState" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "reputation" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PveCampaignState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PveOpponentHistory" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "bossId" TEXT NOT NULL,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "kosFor" INTEGER NOT NULL DEFAULT 0,
  "kosAgainst" INTEGER NOT NULL DEFAULT 0,
  "lastFightAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PveOpponentHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PveCampaignState_playerId_key" ON "PveCampaignState"("playerId");
CREATE UNIQUE INDEX "PveOpponentHistory_playerId_bossId_key" ON "PveOpponentHistory"("playerId", "bossId");
CREATE INDEX "PveOpponentHistory_playerId_lastFightAt_idx" ON "PveOpponentHistory"("playerId", "lastFightAt");
ALTER TABLE "PveCampaignState" ADD CONSTRAINT "PveCampaignState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PveOpponentHistory" ADD CONSTRAINT "PveOpponentHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
