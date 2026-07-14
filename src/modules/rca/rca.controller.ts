import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { TokenPayload } from '@/utils/token';
import { rcaService } from './rca.service';
import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';

const checkAuthorization = async (reportId: string, user: TokenPayload) => {
  if (user.role === 'ADMIN_UTAMA' || user.role === 'ADMIN') {
    return true;
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  if (report.assignedToId !== user.userId) {
    throw new ApiError(403, 'Akses ditolak: Anda tidak memiliki akses ke RCA laporan ini');
  }

  return true;
};

export const createRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const rca = await rcaService.createRca(reportId, req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'RCA berhasil dibuat',
      data: rca,
    });
  } catch (error) {
    next(error);
  }
};

export const getRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const rca = await rcaService.getRcaByReportId(reportId);
    res.status(200).json({
      success: true,
      message: 'RCA berhasil diambil',
      data: rca,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const rca = await rcaService.updateRca(reportId, req.body);
    res.status(200).json({
      success: true,
      message: 'RCA berhasil diperbarui',
      data: rca,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    // Hanya ADMIN_UTAMA yang diijinkan sampai ke endpoint ini (diatur via rbac)
    await rcaService.deleteRca(reportId);
    res.status(200).json({
      success: true,
      message: 'RCA berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
