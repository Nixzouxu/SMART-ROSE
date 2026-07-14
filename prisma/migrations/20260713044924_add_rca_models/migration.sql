-- CreateEnum
CREATE TYPE "StatusRca" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "KategoriFishbone" AS ENUM ('MAN', 'METHOD', 'MATERIAL', 'MACHINE', 'MEASUREMENT', 'ENVIRONMENT');

-- CreateEnum
CREATE TYPE "StatusRencanaPerbaikan" AS ENUM ('BELUM_MULAI', 'BERJALAN', 'SELESAI');

-- CreateTable
CREATE TABLE "root_cause_analyses" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "tim_ketua" TEXT,
    "tim_sekretaris" TEXT,
    "tim_anggota" TEXT[],
    "observasi" TEXT,
    "dokumentasi" TEXT,
    "kronologi_singkat" TEXT NOT NULL,
    "tipe_sub_insiden" TEXT,
    "tindakan_sesuai_bands" TEXT,
    "daftar_interviewee" TEXT[],
    "masalah_awal_5_why" TEXT NOT NULL,
    "status" "StatusRca" NOT NULL DEFAULT 'DRAFT',
    "disusun_oleh_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "root_cause_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rca_timeline_entries" (
    "id" TEXT NOT NULL,
    "rca_id" TEXT NOT NULL,
    "waktu" TEXT NOT NULL,
    "kejadian" TEXT NOT NULL,
    "informasi_tambahan" TEXT,
    "good_practice" TEXT,
    "masalah_pelayanan" TEXT,
    "urutan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rca_timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rca_time_person_grid_entries" (
    "id" TEXT NOT NULL,
    "rca_id" TEXT NOT NULL,
    "staf" TEXT NOT NULL,
    "waktu" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rca_time_person_grid_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rca_five_whys" (
    "id" TEXT NOT NULL,
    "rca_id" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "jawaban" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rca_five_whys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rca_fishbone_entries" (
    "id" TEXT NOT NULL,
    "rca_id" TEXT NOT NULL,
    "kategori" "KategoriFishbone" NOT NULL,
    "penyebab" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rca_fishbone_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rca_rencana_perbaikan" (
    "id" TEXT NOT NULL,
    "rca_id" TEXT NOT NULL,
    "akar_masalah" TEXT NOT NULL,
    "rekomendasi_solusi" TEXT NOT NULL,
    "tindakan_perbaikan" TEXT NOT NULL,
    "pelaksana" TEXT NOT NULL,
    "target_waktu" TEXT NOT NULL,
    "status" "StatusRencanaPerbaikan" NOT NULL DEFAULT 'BELUM_MULAI',
    "urutan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rca_rencana_perbaikan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "root_cause_analyses_report_id_key" ON "root_cause_analyses"("report_id");

-- CreateIndex
CREATE INDEX "root_cause_analyses_report_id_idx" ON "root_cause_analyses"("report_id");

-- CreateIndex
CREATE INDEX "root_cause_analyses_disusun_oleh_id_idx" ON "root_cause_analyses"("disusun_oleh_id");

-- CreateIndex
CREATE INDEX "rca_timeline_entries_rca_id_idx" ON "rca_timeline_entries"("rca_id");

-- CreateIndex
CREATE INDEX "rca_time_person_grid_entries_rca_id_idx" ON "rca_time_person_grid_entries"("rca_id");

-- CreateIndex
CREATE INDEX "rca_five_whys_rca_id_idx" ON "rca_five_whys"("rca_id");

-- CreateIndex
CREATE INDEX "rca_fishbone_entries_rca_id_idx" ON "rca_fishbone_entries"("rca_id");

-- CreateIndex
CREATE INDEX "rca_rencana_perbaikan_rca_id_idx" ON "rca_rencana_perbaikan"("rca_id");

-- AddForeignKey
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_disusun_oleh_id_fkey" FOREIGN KEY ("disusun_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rca_timeline_entries" ADD CONSTRAINT "rca_timeline_entries_rca_id_fkey" FOREIGN KEY ("rca_id") REFERENCES "root_cause_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rca_time_person_grid_entries" ADD CONSTRAINT "rca_time_person_grid_entries_rca_id_fkey" FOREIGN KEY ("rca_id") REFERENCES "root_cause_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rca_five_whys" ADD CONSTRAINT "rca_five_whys_rca_id_fkey" FOREIGN KEY ("rca_id") REFERENCES "root_cause_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rca_fishbone_entries" ADD CONSTRAINT "rca_fishbone_entries_rca_id_fkey" FOREIGN KEY ("rca_id") REFERENCES "root_cause_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rca_rencana_perbaikan" ADD CONSTRAINT "rca_rencana_perbaikan_rca_id_fkey" FOREIGN KEY ("rca_id") REFERENCES "root_cause_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
