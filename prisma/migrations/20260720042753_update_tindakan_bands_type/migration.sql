/*
  Warnings:

  - The `tindakan_bands` column on the `root_cause_analyses` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "root_cause_analyses" DROP COLUMN "tindakan_bands",
ADD COLUMN     "tindakan_bands" "GradingRisiko";
