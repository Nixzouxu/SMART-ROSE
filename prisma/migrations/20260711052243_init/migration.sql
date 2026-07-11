-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('USER', 'ADMIN', 'ADMIN_UTAMA');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JenisInsiden" AS ENUM ('KTD', 'KNC', 'KTC', 'KPC', 'SENTINEL');

-- CreateEnum
CREATE TYPE "GradingRisiko" AS ENUM ('HIJAU', 'BIRU', 'KUNING', 'MERAH');

-- CreateEnum
CREATE TYPE "StatusLaporan" AS ENUM ('DRAFT', 'SUBMITTED', 'DALAM_INVESTIGASI', 'MENUNGGU_VERIFIKASI', 'SELESAI', 'OVERDUE', 'ARSIP');

-- CreateEnum
CREATE TYPE "TipeFile" AS ENUM ('JPG', 'PNG', 'PDF');

-- CreateEnum
CREATE TYPE "TipeMedia" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('LAPORAN_BARU', 'STATUS_BERUBAH', 'DEADLINE_MENDEKAT', 'DEADLINE_LEWAT', 'CHATBOT_DIJAWAB', 'PENGUMUMAN');

-- CreateEnum
CREATE TYPE "StatusEskalasiChatbot" AS ENUM ('TERJAWAB_OTOMATIS', 'MENUNGGU_ADMIN', 'DIJAWAB_ADMIN');

-- CreateEnum
CREATE TYPE "TargetRole" AS ENUM ('SEMUA', 'USER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "no_pegawai" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "RoleType" NOT NULL DEFAULT 'USER',
    "unit_kerja" TEXT NOT NULL,
    "foto_profil" TEXT,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "tracking_number" TEXT,
    "jenis_insiden" "JenisInsiden" NOT NULL,
    "tanggal_kejadian" TIMESTAMP(3) NOT NULL,
    "lokasi" TEXT NOT NULL,
    "unit_kerja" TEXT NOT NULL,
    "kronologi" TEXT NOT NULL,
    "dampak" TEXT NOT NULL,
    "grading_awal" "GradingRisiko" NOT NULL,
    "grading_final" "GradingRisiko",
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "is_anonim" BOOLEAN NOT NULL DEFAULT false,
    "catatan_investigasi" TEXT,
    "deadline_investigasi" TIMESTAMP(3),
    "assigned_to_id" TEXT,
    "pelapor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_attachments" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "object_path" TEXT NOT NULL,
    "tipe_file" "TipeFile" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_histories" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "perubahan" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "tipe_media" "TipeMedia" NOT NULL DEFAULT 'TEXT',
    "media_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_knowledges" (
    "id" TEXT NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "jawaban" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "kata_kunci" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_knowledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "jawaban" TEXT,
    "status_eskalasi" "StatusEskalasiChatbot" NOT NULL DEFAULT 'TERJAWAB_OTOMATIS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipe" "TipeNotifikasi" NOT NULL,
    "pesan" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "target_role" "TargetRole" NOT NULL DEFAULT 'SEMUA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_no_pegawai_key" ON "users"("no_pegawai");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_no_pegawai_idx" ON "users"("no_pegawai");

-- CreateIndex
CREATE UNIQUE INDEX "reports_tracking_number_key" ON "reports"("tracking_number");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_jenis_insiden_idx" ON "reports"("jenis_insiden");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "reports_status_unit_kerja_idx" ON "reports"("status", "unit_kerja");

-- CreateIndex
CREATE INDEX "report_attachments_report_id_idx" ON "report_attachments"("report_id");

-- CreateIndex
CREATE INDEX "report_histories_report_id_idx" ON "report_histories"("report_id");

-- CreateIndex
CREATE INDEX "report_histories_actor_id_idx" ON "report_histories"("actor_id");

-- CreateIndex
CREATE INDEX "chatbot_logs_status_eskalasi_idx" ON "chatbot_logs"("status_eskalasi");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_pelapor_id_fkey" FOREIGN KEY ("pelapor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_attachments" ADD CONSTRAINT "report_attachments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_histories" ADD CONSTRAINT "report_histories_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_histories" ADD CONSTRAINT "report_histories_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_logs" ADD CONSTRAINT "chatbot_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
