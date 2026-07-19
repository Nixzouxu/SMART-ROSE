// src/modules/admin/adminJobs.controller.ts
// Controller untuk trigger background jobs secara manual (hanya untuk admin).
// Berguna untuk testing dan emergency re-run.

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { runDailySlaCheck } from '@/jobs/dailySlaCheck.job';
import { logger } from '@/utils/logger';

/**
 * POST /admin/jobs/sla-check
 * Trigger daily SLA check secara manual (untuk testing atau emergency).
 * Hanya ADMIN_UTAMA yang bisa mengakses.
 */
export const triggerSlaCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    logger.info(`[Admin Jobs] SLA check di-trigger manual oleh admin ${req.user!.userId}`);

    // Jalankan secara async, tidak block response terlalu lama
    // Tapi tunggu hingga selesai agar test bisa verifikasi hasilnya
    await runDailySlaCheck();

    res.status(200).json({
      success: true,
      message: 'SLA check berhasil dijalankan',
      data: {
        triggeredBy: req.user!.userId,
        triggeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
