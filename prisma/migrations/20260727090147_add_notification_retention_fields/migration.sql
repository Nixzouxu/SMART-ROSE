-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "read_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notifications_is_read_is_archived_idx" ON "notifications"("is_read", "is_archived");

-- CreateIndex
CREATE INDEX "notifications_is_archived_archived_at_idx" ON "notifications"("is_archived", "archived_at");
