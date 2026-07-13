// src/modules/notifications/notifications.service.ts
// Helper untuk membuat notifikasi di database.

import { db } from '@/config/db';

type TipeNotifikasi =
  | 'LAPORAN_BARU'
  | 'STATUS_BERUBAH'
  | 'DEADLINE_MENDEKAT'
  | 'DEADLINE_LEWAT'
  | 'CHATBOT_DIJAWAB'
  | 'PENGUMUMAN';

/**
 * Membuat satu notifikasi untuk satu user.
 */
export const createNotification = async (
  userId: string,
  tipe: TipeNotifikasi,
  pesan: string,
): Promise<void> => {
  await db.notification.create({
    data: {
      userId,
      tipe,
      pesan,
      isRead: false,
    },
  });
};

/**
 * Membuat notifikasi untuk banyak user sekaligus.
 */
export const createNotificationBatch = async (
  userIds: string[],
  tipe: TipeNotifikasi,
  pesan: string,
): Promise<void> => {
  if (userIds.length === 0) return;

  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      tipe,
      pesan,
      isRead: false,
    })),
  });
};
