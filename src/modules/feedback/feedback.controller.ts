import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { feedbackService } from './feedback.service';
import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';

const checkAuthorization = async (reportId: string, userId: string, role: string) => {
  if (role === 'ADMIN_UTAMA' || role === 'ADMIN') return true;

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new ApiError(404, 'Laporan tidak ditemukan');
  if (report.pelaporId !== userId && report.assignedToId !== userId) {
    throw new ApiError(403, 'Akses ditolak: Anda tidak memiliki akses ke laporan ini');
  }
  return true;
};

export const createFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    const adminId = req.user!.userId;
    const feedback = await feedbackService.createFeedback(reportId, adminId, req.body);
    res.status(201).json({
      success: true,
      message: 'Feedback berhasil ditambahkan',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!.userId, req.user!.role);
    const feedbacks = await feedbackService.getFeedbackByReportId(reportId);
    res.status(200).json({
      success: true,
      message: 'Feedback berhasil diambil',
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};
