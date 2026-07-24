// src/config/socket.ts
// Inisialisasi Socket.io server, attach ke HTTP server yang sama dari src/server.ts.
// Middleware autentikasi: baca JWT dari socket.handshake.auth.token.
// Setelah berhasil, join room user:{userId} dan (jika admin) room admins.

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAuthToken } from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';

let io: SocketIOServer;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware autentikasi Socket.io
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      logger.warn('[Socket.io] Koneksi ditolak: token tidak ada');
      return next(new Error('Autentikasi gagal: token tidak ditemukan'));
    }

    try {
      const payload = await verifyAuthToken(token);

      // Role Validation (Non-Admin)
      if (payload.role !== 'ADMIN' && payload.role !== 'ADMIN_UTAMA') {
        logger.warn(`[Socket.io] Koneksi ditolak: user ${payload.userId} bukan admin`);
        return next(new Error('Autentikasi gagal: Socket ini khusus untuk admin'));
      }

      // Simpan payload ke socket.data supaya bisa diakses di event handler
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch (err) {
      logger.warn(
        `[Socket.io] Koneksi ditolak: ${err instanceof Error ? err.message : 'token tidak valid'}`,
      );
      next(
        new Error(
          err instanceof Error
            ? err.message
            : 'Autentikasi gagal: token tidak valid atau kadaluarsa',
        ),
      );
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId as string;
    const role: string = socket.data.role as string;

    // Join room khusus admin
    void socket.join(`admin:${userId}`);
    logger.info(`[Socket.io] Admin ${userId} (${role}) terhubung, join room admin:${userId}`);

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.io] Admin ${userId} terputus: ${reason}`);
    });
  });

  return io;
}

/**
 * Ambil instance Socket.io yang sudah diinisialisasi.
 * Lempar error jika dipanggil sebelum initSocket.
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io belum diinisialisasi. Panggil initSocket() terlebih dahulu.');
  }
  return io;
}
