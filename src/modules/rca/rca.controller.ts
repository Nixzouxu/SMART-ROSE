import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { TokenPayload } from '@/utils/token';
import { rcaService } from './rca.service';
import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { exportRcaToExcel, exportRcaToPdf } from '@/modules/reports/export.service';

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

export const exportRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    const format = req.query.format as string | undefined;

    if (!format || (format !== 'excel' && format !== 'pdf')) {
      throw new ApiError(400, "Parameter format harus 'excel' atau 'pdf'");
    }

    // Otorisasi sama seperti GET RCA: admin atau assignedTo
    await checkAuthorization(reportId, req.user!);

    if (format === 'excel') {
      const buffer = await exportRcaToExcel(reportId);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="rca-${reportId}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } else {
      const buffer = await exportRcaToPdf(reportId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="rca-${reportId}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    }
  } catch (error) {
    next(error);
  }
};

export const addTeamMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const member = await rcaService.addTeamMember(reportId, req.body);
    res.status(201).json({
      success: true,
      message: 'Anggota tim berhasil ditambahkan',
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const removeTeamMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    const memberId = req.params.memberId as string;
    await checkAuthorization(reportId, req.user!);
    await rcaService.removeTeamMember(reportId, memberId);
    res.status(200).json({
      success: true,
      message: 'Anggota tim berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
