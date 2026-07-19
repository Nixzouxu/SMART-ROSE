-- CreateEnum
CREATE TYPE "JenisInvestigasi" AS ENUM ('SEDERHANA', 'RCA_LENGKAP');

-- CreateEnum
CREATE TYPE "JenisFeedback" AS ENUM ('ADVISORY', 'MENGIKAT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatusRca" ADD VALUE 'MENUNGGU_PERSETUJUAN';
ALTER TYPE "StatusRca" ADD VALUE 'DISETUJUI';
ALTER TYPE "StatusRca" ADD VALUE 'PERLU_REVISI';

-- AlterTable
ALTER TABLE "root_cause_analyses" ADD COLUMN     "catatan_revisi" TEXT,
ADD COLUMN     "jenis_investigasi" "JenisInvestigasi" NOT NULL DEFAULT 'RCA_LENGKAP';

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "dari_admin_id" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "jenis" "JenisFeedback" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedbacks_report_id_idx" ON "feedbacks"("report_id");

-- CreateIndex
CREATE INDEX "feedbacks_dari_admin_id_idx" ON "feedbacks"("dari_admin_id");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_dari_admin_id_fkey" FOREIGN KEY ("dari_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
