/*
  Warnings:

  - You are about to drop the column `foto_profil` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "foto_profil",
ADD COLUMN     "foto_profil_path" TEXT;
