// src/jobs/notificationRetention.job.ts
// Job harian untuk retensi dan pengarsipan otomatis notifikasi.

import { db } from '@/config/db';
import { logger } from '@/utils/logger';

/**
 * Jalankan retensi notifikasi secara aman (dibungkus try/catch agar tidak crash server).
 * Dipanggil oleh scheduler di src/jobs/index.ts.
 */
export async function runNotificationRetentionSafe(): Promise<{
  archived: number;
  deleted: number;
}> {
  logger.info('[Retention Job] Memulai job retensi notifikasi...');

  let archived = 0;
  let deleted = 0;

  try {
    archived = await archiveReadNotifications();
  } catch (err) {
    logger.error({ err }, '[Retention Job] Terjadi error saat mengarsipkan notifikasi.');
  }

  try {
    deleted = await deleteExpiredArchivedNotifications();
  } catch (err) {
    logger.error({ err }, '[Retention Job] Terjadi error saat menghapus notifikasi kadaluarsa.');
  }

  logger.info('[Retention Job] Job retensi notifikasi selesai.');
  return { archived, deleted };
}

/**
 * Archive notifikasi yang isRead: true, isArchived: false, dan readAt > 30 hari yang lalu.
 */
async function archiveReadNotifications(): Promise<number> {
  const sekarang = new Date();
  const batasArchive = new Date(sekarang);
  batasArchive.setDate(batasArchive.getDate() - 30); // 30 hari yang lalu

  // Kita gunakan updateMany untuk batch update
  const result = await db.notification.updateMany({
    where: {
      isRead: true,
      isArchived: false,
      readAt: {
        lte: batasArchive,
      },
    },
    data: {
      isArchived: true,
      archivedAt: sekarang,
    },
  });

  if (result.count > 0) {
    logger.info(
      `[Retention Job] Berhasil mengarsipkan ${result.count} notifikasi lama yang sudah dibaca.`,
    );
  } else {
    logger.info('[Retention Job] Tidak ada notifikasi yang perlu diarsipkan.');
  }

  return result.count;
}

/**
 * Hard delete permanen notifikasi yang isArchived: true dan archivedAt > 1 tahun yang lalu.
 */
async function deleteExpiredArchivedNotifications(): Promise<number> {
  const sekarang = new Date();
  const batasDelete = new Date(sekarang);
  batasDelete.setFullYear(batasDelete.getFullYear() - 1); // 1 tahun yang lalu

  // Kita gunakan deleteMany untuk batch hard delete
  const result = await db.notification.deleteMany({
    where: {
      isArchived: true,
      archivedAt: {
        lte: batasDelete,
      },
    },
  });

  if (result.count > 0) {
    logger.info(
      `[Retention Job] Berhasil menghapus permanen ${result.count} notifikasi kadaluarsa yang sudah diarsipkan.`,
    );
  } else {
    logger.info('[Retention Job] Tidak ada notifikasi yang perlu dihapus permanen.');
  }

  return result.count;
}
