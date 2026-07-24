-- AlterEnum
BEGIN;
CREATE TYPE "TipeNotifikasi_new" AS ENUM ('LAPORAN', 'SENTINEL', 'CHATBOT', 'INVESTIGASI', 'UPDATE');

ALTER TABLE "notifications" ALTER COLUMN "tipe" TYPE "TipeNotifikasi_new" 
  USING (
    CASE "tipe"::text
      WHEN 'LAPORAN_BARU' THEN 'LAPORAN'::"TipeNotifikasi_new"
      WHEN 'STATUS_BERUBAH' THEN 'UPDATE'::"TipeNotifikasi_new"
      WHEN 'DEADLINE_MENDEKAT' THEN 'INVESTIGASI'::"TipeNotifikasi_new"
      WHEN 'DEADLINE_LEWAT' THEN 'INVESTIGASI'::"TipeNotifikasi_new"
      WHEN 'CHATBOT_DIJAWAB' THEN 'CHATBOT'::"TipeNotifikasi_new"
      WHEN 'PENGUMUMAN' THEN 'CHATBOT'::"TipeNotifikasi_new"
      ELSE "tipe"::text::"TipeNotifikasi_new"
    END
  );

ALTER TYPE "TipeNotifikasi" RENAME TO "TipeNotifikasi_old";
ALTER TYPE "TipeNotifikasi_new" RENAME TO "TipeNotifikasi";
DROP TYPE "TipeNotifikasi_old";
COMMIT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "referensi_id" TEXT;
