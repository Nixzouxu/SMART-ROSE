// src/server.ts
// Entry point yang membuat HTTP server eksplisit dari Express app,
// attach Socket.io ke HTTP server yang sama, lalu listen.

import 'dotenv/config';
import { createServer } from 'http';
import { env } from '@/config/env';
import { createApp } from '@/app';
import { logger } from '@/utils/logger';
import { initJobs } from '@/jobs';
import { initSocket } from '@/config/socket';

const app = createApp();

// Buat HTTP server eksplisit supaya Socket.io bisa di-attach ke server yang sama
const httpServer = createServer(app);

// Inisialisasi Socket.io - attach ke HTTP server yang sama (bukan port terpisah)
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`🚀 SMART-ROSE API berjalan di ${env.APP_URL} (port ${env.PORT})`);
  logger.info(`📄 Swagger docs: ${env.APP_URL}/api/docs`);
  logger.info(`🔌 Socket.io aktif di port ${env.PORT}`);

  // Inisialisasi background jobs setelah server ready
  initJobs();
});
