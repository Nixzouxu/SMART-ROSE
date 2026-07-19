// src/modules/notifications/notifications.service.ts
// Helper untuk membuat notifikasi di database.
// Setelah simpan ke DB, emit event Socket.io ke room yang sesuai.

import { db } from '@/config/db';
import { logger } from '@/utils/logger';

type TipeNotifikasi =
  | 'LAPORAN_BARU'
  | 'STATUS_BERUBAH'
  | 'DEADLINE_MENDEKAT'
  | 'DEADLINE_LEWAT'
  | 'CHATBOT_DIJAWAB'
  | 'PENGUMUMAN';

// Lazy-load socket config untuk menghindari circular dependency saat startup.
// Menggunakan require() supaya TypeScript module resolution tidak komplain
// pada dynamic import path dengan alias @/.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emitToSocket = (room: string, event: string, payload: Record<string, any>): void => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getIO } = require('@/config/socket') as {
      getIO: () => import('socket.io').Server;
    };
    getIO().to(room).emit(event, payload);
  } catch {
    logger.warn(`[Notification] Socket.io emit ke room "${room}" gagal atau belum diinisialisasi`);
  }
};

/**
 * Membuat satu notifikasi untuk satu user.
 * Signature TIDAK berubah supaya semua caller (chatbot, SLA job) tidak perlu dimodifikasi.
 * Setelah simpan ke DB, emit event notification:new via Socket.io ke room user:{userId}.
 */
export const createNotification = async (
  userId: string,
  tipe: TipeNotifikasi,
  pesan: string,
): Promise<void> => {
  const notification = await db.notification.create({
    data: {
      userId,
      tipe,
      pesan,
      isRead: false,
    },
  });

  emitToSocket(`user:${userId}`, 'notification:new', {
    id: notification.id,
    userId: notification.userId,
    tipe: notification.tipe,
    pesan: notification.pesan,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  });
};

/**
 * Membuat notifikasi untuk banyak user sekaligus.
 * Emit event notification:new ke masing-masing room user.
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

  const payload = { tipe, pesan, isRead: false, createdAt: new Date() };
  for (const userId of userIds) {
    emitToSocket(`user:${userId}`, 'notification:new', { ...payload, userId });
  }
};

/**
 * Membuat notifikasi dan emit ke room admins (semua admin yang sedang online).
 * Gunakan fungsi ini untuk notifikasi yang ditujukan ke semua admin.
 */
export const createAdminNotification = async (
  tipe: TipeNotifikasi,
  pesan: string,
): Promise<void> => {
  emitToSocket('admins', 'notification:new', {
    tipe,
    pesan,
    isRead: false,
    createdAt: new Date(),
    targetRoom: 'admins',
  });
};
