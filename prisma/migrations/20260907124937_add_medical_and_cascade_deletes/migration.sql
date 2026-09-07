-- DropForeignKey
ALTER TABLE "Facility" DROP CONSTRAINT "Facility_playerId_fkey";

-- DropForeignKey
ALTER TABLE "PveProgress" DROP CONSTRAINT "PveProgress_playerId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingSession" DROP CONSTRAINT "TrainingSession_facilityId_fkey";

-- AlterTable
ALTER TABLE "Chicken" ADD COLUMN     "illnesses" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "morale" INTEGER NOT NULL DEFAULT 75,
ADD COLUMN     "stress" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MedicalTreatment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "chickenId" TEXT NOT NULL,
    "injuryId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effectiveness" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "clinicLevel" INTEGER NOT NULL DEFAULT 1,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicalTreatment_chickenId_status_idx" ON "MedicalTreatment"("chickenId", "status");

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PveProgress" ADD CONSTRAINT "PveProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
