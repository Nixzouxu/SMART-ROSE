// src/jobs/index.ts
// Scheduler untuk semua background job menggunakan node-cron.
//
// Jadwal: setiap hari pukul 01:00 WIB (UTC+7 = 18:00 UTC hari sebelumnya).
// Ekspresi cron: '0 1 * * *' (menit=0, jam=1, setiap hari, setiap bulan, setiap hari minggu)
//
// Job juga dijalankan sekali saat startup untuk menangkap laporan yang
// terlewat jika server restart di atas jam 01:00.

import cron from 'node-cron';
import { logger } from '@/utils/logger';
import { runDailySlaCheck } from './dailySlaCheck.job';

// Jadwal cron: setiap hari pukul 01:00 (server timezone = WIB/Asia/Jakarta)
const CRON_JADWAL = '0 1 * * *';

/**
 * Inisialisasi semua background jobs.
 * Dipanggil dari src/server.ts setelah server berhasil listen.
 */
export function initJobs(): void {
  logger.info('[Jobs] Menginisialisasi background jobs...');

  // Jalankan sekali saat startup untuk menangkap laporan yang terlewat
  // (misalnya server restart setelah jam 01:00 dan job belum berjalan hari ini)
  runDailySlaCheckSafe();

  // Jadwalkan dengan node-cron: setiap hari pukul 01:00
  cron.schedule(CRON_JADWAL, () => {
    runDailySlaCheckSafe();
  });

  logger.info(
    `[Jobs] Background jobs berhasil dijadwalkan (cron: "${CRON_JADWAL}" = setiap hari pukul 01:00).`,
  );
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
