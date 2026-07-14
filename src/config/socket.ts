// src/config/socket.ts
// Inisialisasi Socket.io server, attach ke HTTP server yang sama dari src/server.ts.
// Middleware autentikasi: baca JWT dari socket.handshake.auth.token.
// Setelah berhasil, join room user:{userId} dan (jika admin) room admins.

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@/utils/token';
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
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      logger.warn('[Socket.io] Koneksi ditolak: token tidak ada');
      return next(new Error('Autentikasi gagal: token tidak ditemukan'));
    }

    try {
      const payload = verifyAccessToken(token);
      // Simpan payload ke socket.data supaya bisa diakses di event handler
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      logger.warn('[Socket.io] Koneksi ditolak: token tidak valid');
      next(new Error('Autentikasi gagal: token tidak valid atau kadaluarsa'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId as string;
    const role: string = socket.data.role as string;

    // Setiap user join room personal
    void socket.join(`user:${userId}`);
    logger.info(`[Socket.io] User ${userId} (${role}) terhubung, join room user:${userId}`);

    // Admin join room admins
    if (role === 'ADMIN' || role === 'ADMIN_UTAMA') {
      void socket.join('admins');
      logger.info(`[Socket.io] User ${userId} (${role}) join room admins`);
    }

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.io] User ${userId} terputus: ${reason}`);
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
