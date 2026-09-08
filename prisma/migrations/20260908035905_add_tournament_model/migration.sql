-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "chickenId" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL,
    "entrants" JSONB NOT NULL,
    "history" JSONB NOT NULL DEFAULT '[]',
    "placement" INTEGER,
    "tokensAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_playerId_chickenId_status_idx" ON "Tournament"("playerId", "chickenId", "status");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
