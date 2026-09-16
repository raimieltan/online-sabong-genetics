/*
  Warnings:

  - Made the column `authUserId` on table `Player` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "authUserId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Player"
  ADD CONSTRAINT "Player_authUserId_fkey"
  FOREIGN KEY ("authUserId") REFERENCES "auth"."users"("id")
  ON DELETE RESTRICT;
