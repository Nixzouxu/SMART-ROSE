-- CreateEnum
CREATE TYPE "StatusPasienSaatInsiden" AS ENUM ('RAWAT_INAP', 'RAWAT_JALAN', 'IGD', 'LAIN_LAIN');

-- CreateEnum
CREATE TYPE "KategoriPelapor" AS ENUM ('PASIEN_SENDIRI', 'KELUARGA', 'STAF', 'LAIN_LAIN');

-- CreateEnum
CREATE TYPE "AkibatPasien" AS ENUM ('SANGAT_RINGAN', 'RINGAN', 'SEDANG', 'BERAT', 'SANGAT_BERAT');

-- CreateEnum
CREATE TYPE "TipeFileRca" AS ENUM ('PDF', 'DOCX', 'XLSX');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "akibat_terhadap_pasien" "AkibatPasien",
ADD COLUMN     "apakah_kejadian_serupa_pernah_terjadi" BOOLEAN,
ADD COLUMN     "jenis_kelamin_pasien" TEXT,
ADD COLUMN     "kasus_spesialisasi" TEXT,
ADD COLUMN     "kategori_pelapor_pertama" "KategoriPelapor",
ADD COLUMN     "melibatkan_pasien" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nama_pasien" TEXT,
ADD COLUMN     "no_rekam_medis" TEXT,
ADD COLUMN     "penanggung_biaya" TEXT,
ADD COLUMN     "pihak_terlibat" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ruangan_pasien" TEXT,
ADD COLUMN     "status_pasien_saat_insiden" "StatusPasienSaatInsiden",
ADD COLUMN     "tanggal_jam_masuk_rs" TIMESTAMP(3),
ADD COLUMN     "umur_pasien" INTEGER;

-- CreateTable
CREATE TABLE "rca_attachments" (
    "id" TEXT NOT NULL,
    "rca_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "object_path" TEXT NOT NULL,
    "tipe_file" "TipeFileRca" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rca_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rca_attachments_rca_id_idx" ON "rca_attachments"("rca_id");

-- AddForeignKey
ALTER TABLE "rca_attachments" ADD CONSTRAINT "rca_attachments_rca_id_fkey" FOREIGN KEY ("rca_id") REFERENCES "root_cause_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
