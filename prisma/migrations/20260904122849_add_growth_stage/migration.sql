/*
  Warnings:

  - Added the required column `growthStage` to the `Chicken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chicken" ADD COLUMN     "growthStage" TEXT NOT NULL;
