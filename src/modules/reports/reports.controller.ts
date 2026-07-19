import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import * as reportsService from './reports.service';
import * as captchaService from '@/modules/captcha/captcha.service';
import { ApiError } from '@/utils/apiError';

export const createReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const report = await reportsService.createReport(userId, req.body);
    res.locals.entityId = report.id;

    res.status(201).json({
      success: true,
      message: 'Laporan berhasil dibuat',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /reports - Endpoint publik tanpa login.
 * Verifikasi captcha, lalu buat laporan anonim + SUBMITTED dengan pelaporId=null.
 */
export const createReportPublic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { captchaToken, captchaJawaban, ...reportData } = req.body;

    if (captchaToken || captchaJawaban) {
      if (!captchaToken || !captchaJawaban) {
        throw new ApiError(400, 'captchaToken dan captchaJawaban harus dikirim bersamaan');
      }
      // Validasi captcha (single-use, token dihapus setelah validasi)
      await captchaService.verifyCaptcha(captchaToken, captchaJawaban);
    }

    const report = await reportsService.createReport(null, {
      ...reportData,
      isAnonim: true, // Laporan publik selalu anonim
      status: 'SUBMITTED', // Laporan publik selalu langsung SUBMITTED
    });
    res.locals.entityId = report.id;

    res.status(201).json({
      success: true,
      message:
        'Laporan berhasil dibuat. Simpan nomor pelacakan ini untuk memantau status laporan Anda.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await reportsService.getMyReports(userId, page, limit);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar laporan',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReportDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string as string;

    const report = await reportsService.getMyReportDetail(userId, id);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail laporan',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDraftReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string as string;

    const updatedReport = await reportsService.updateDraftReport(userId, id, req.body);

    res.status(200).json({
      success: true,
      message: 'Laporan berhasil diubah',
      data: updatedReport,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDraftReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string as string;

    await reportsService.deleteDraftReport(userId, id);

    res.status(200).json({
      success: true,
      message: 'Laporan berhasil dihapus',
      // tidak ada data untuk DELETE umumnya, namun boleh null. Konsisten format:
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Route Publik
export const trackReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const trackingNumber = req.params.trackingNumber as string;
    const report = await reportsService.getPublicTrackingStatus(trackingNumber);

    res.status(200).json({
      success: true,
      message: 'Status laporan berhasil dilacak',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
