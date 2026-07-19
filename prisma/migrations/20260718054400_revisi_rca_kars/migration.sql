-- CreateEnum
CREATE TYPE "PeranTim" AS ENUM ('KETUA', 'SEKRETARIS', 'ANGGOTA');

-- CreateEnum
CREATE TYPE "JenisPengisian" AS ENUM ('TEMPLATE', 'CUSTOM');

-- AlterTable
ALTER TABLE "root_cause_analyses" ADD COLUMN     "jenis_pengisian" "JenisPengisian",
ADD COLUMN     "tindakan_bands" TEXT;

-- CreateTable
CREATE TABLE "rca_team_members" (
    "id" TEXT NOT NULL,
    "rca_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "peran" "PeranTim" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rca_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rca_team_members_rca_id_idx" ON "rca_team_members"("rca_id");

-- AddForeignKey
ALTER TABLE "rca_team_members" ADD CONSTRAINT "rca_team_members_rca_id_fkey" FOREIGN KEY ("rca_id") REFERENCES "root_cause_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
