// src/jobs/index.ts
// Scheduler untuk semua background job.
//
// Menggunakan native setInterval bawaan Node.js agar tidak perlu dependency
// tambahan (node-cron). Job SLA dijalankan sekali saat server start dan
// kemudian setiap 24 jam sekali (run-at-startup + interval harian).
//
// Untuk deployment production, pertimbangkan menggunakan dedicated scheduler
// seperti pg_cron, BullMQ, atau node-cron.

import { logger } from '@/utils/logger';
import { runDailySlaCheck } from './dailySlaCheck.job';

const INTERVAL_24_JAM = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik

/**
 * Inisialisasi semua background jobs.
 * Dipanggil dari src/server.ts setelah server berhasil listen.
 */
export function initJobs(): void {
  logger.info('[Jobs] Menginisialisasi background jobs...');

  // Jalankan sekali langsung setelah startup (misalnya, server restart tengah malam)
  runDailySlaCheckSafe();

  // Jadwalkan ulang setiap 24 jam
  setInterval(() => {
    runDailySlaCheckSafe();
  }, INTERVAL_24_JAM);

  logger.info('[Jobs] Background jobs berhasil dijadwalkan (interval: 24 jam).');
}

/**
 * Wrapper aman untuk runDailySlaCheck agar error tidak crash server.
 */
async function runDailySlaCheckSafe(): Promise<void> {
  try {
    await runDailySlaCheck();
  } catch (err) {
    logger.error({ err }, '[Jobs] Terjadi error tidak tertangani di runDailySlaCheck.');
  }
}
