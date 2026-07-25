-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "ada_korban" BOOLEAN,
ADD COLUMN     "kategori_fasilitas" TEXT,
ADD COLUMN     "kategori_kerusakan" TEXT,
ADD COLUMN     "kode_inventaris" TEXT,
ADD COLUMN     "kondisi_fasilitas" TEXT,
ADD COLUMN     "nama_fasilitas" TEXT,
ADD COLUMN     "penanggung_jawab_fasilitas" TEXT,
ADD COLUMN     "status_penanganan_awal" TEXT,
ADD COLUMN     "tindakan_darurat" TEXT;
