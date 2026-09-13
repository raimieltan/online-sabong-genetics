-- CreateTable
CREATE TABLE "PveEncounterEvent" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bossId" TEXT,
    "headline" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PveEncounterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PveEncounterEvent_playerId_createdAt_idx" ON "PveEncounterEvent"("playerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PveEncounterEvent" ADD CONSTRAINT "PveEncounterEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
