-- DropForeignKey
ALTER TABLE "chatbot_logs" DROP CONSTRAINT "chatbot_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_pelapor_id_fkey";

-- AlterTable
ALTER TABLE "chatbot_logs" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reports" ALTER COLUMN "pelapor_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_pelapor_id_fkey" FOREIGN KEY ("pelapor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_logs" ADD CONSTRAINT "chatbot_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
