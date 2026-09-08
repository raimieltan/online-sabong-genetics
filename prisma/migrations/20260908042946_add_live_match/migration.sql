-- CreateTable
CREATE TABLE "LiveMatch" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "chickenA" JSONB NOT NULL,
    "chickenB" JSONB NOT NULL,
    "oddsA" DOUBLE PRECISION NOT NULL,
    "oddsB" DOUBLE PRECISION NOT NULL,
    "betSide" TEXT,
    "betAmount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveMatch_playerId_status_idx" ON "LiveMatch"("playerId", "status");
