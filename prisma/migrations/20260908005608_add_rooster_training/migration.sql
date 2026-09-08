-- CreateTable
CREATE TABLE "RoosterTraining" (
    "id" TEXT NOT NULL,
    "chickenId" TEXT NOT NULL,
    "physicalXP" INTEGER NOT NULL DEFAULT 0,
    "combatXP" INTEGER NOT NULL DEFAULT 0,
    "tacticalXP" INTEGER NOT NULL DEFAULT 0,
    "disciplineXP" INTEGER NOT NULL DEFAULT 0,
    "recoveryXP" INTEGER NOT NULL DEFAULT 0,
    "effortSpent" JSONB NOT NULL DEFAULT '{"power":0,"speed":0,"agility":0,"defense":0,"stamina":0,"accuracy":0}',
    "trainingPotential" JSONB NOT NULL,
    "discovered" JSONB NOT NULL DEFAULT '{}',
    "traits" JSONB NOT NULL DEFAULT '[]',
    "breakthroughs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoosterTraining_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoosterTraining_chickenId_key" ON "RoosterTraining"("chickenId");
