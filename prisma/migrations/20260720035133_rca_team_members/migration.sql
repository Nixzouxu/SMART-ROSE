/*
  Warnings:

  - You are about to drop the column `nama` on the `rca_team_members` table. All the data in the column will be lost.
  - You are about to drop the column `tim_anggota` on the `root_cause_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `tim_ketua` on the `root_cause_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `tim_sekretaris` on the `root_cause_analyses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rca_team_members" DROP COLUMN "nama",
ADD COLUMN     "nama_legacy_text" TEXT,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "root_cause_analyses" DROP COLUMN "tim_anggota",
DROP COLUMN "tim_ketua",
DROP COLUMN "tim_sekretaris",
ADD COLUMN     "tim_anggota_legacy_text" TEXT[],
ADD COLUMN     "tim_ketua_legacy_text" TEXT,
ADD COLUMN     "tim_sekretaris_legacy_text" TEXT;

-- CreateIndex
CREATE INDEX "rca_team_members_user_id_idx" ON "rca_team_members"("user_id");

-- AddForeignKey
ALTER TABLE "rca_team_members" ADD CONSTRAINT "rca_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
