import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { generateTrackingNumber } from '@/modules/reports/trackingNumber.util';
import { Prisma, StatusLaporan, JenisInsiden } from '@prisma/client';
import { regradeReport } from './regrade.service';
import { generateMassReportExcel, generateMassReportPdf } from '@/modules/reports/export.service';
import { decryptText, encryptText } from '@/utils/encryption';

export const listReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, jenisInsiden, unitKerja, startDate, endDate } = req.query;

    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {};

    if (status)
      where.status = status as any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
    if (jenisInsiden)
      where.jenisInsiden =
        jenisInsiden as any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
    if (unitKerja) where.unitKerja = unitKerja as string;

    if (startDate || endDate) {
      where.tanggalKejadian = {};
      if (startDate) where.tanggalKejadian.gte = new Date(startDate as string);
      if (endDate) where.tanggalKejadian.lte = new Date(endDate as string);
    }

    const [total, reports] = await Promise.all([
      db.report.count({ where }),
      db.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pelapor: {
            select: { id: true, nama: true, email: true, unitKerja: true },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar laporan untuk admin',
      data: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        data: reports.map((r) => ({
          ...r,
          kronologi: r.kronologi ? decryptText(r.kronologi) : r.kronologi,
        })), // Admin melihat semuanya, tidak di mask!
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getReportDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const report = await db.report.findUnique({
      where: { id },
      include: {
        pelapor: {
          select: { id: true, nama: true, email: true, noPegawai: true, unitKerja: true },
        },
        attachments: true,
        histories: {
          orderBy: { timestamp: 'desc' },
          include: {
            actor: { select: { id: true, nama: true } },
          },
        },
        assignedTo: {
          select: { id: true, nama: true },
        },
      },
    });

    if (!report) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    if (report.kronologi) {
      report.kronologi = decryptText(report.kronologi);
    }

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail laporan',
      data: report, // Tidak dimask untuk admin
    });
  } catch (error) {
    next(error);
  }
};

export const createManualReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { status, ...rest } = req.body;
    let trackingNumber: string | null = null;
    const finalStatus = status || 'DRAFT';

    if (finalStatus === 'SUBMITTED') {
      trackingNumber = await generateTrackingNumber();
    }

    const report = await db.report.create({
      data: {
        ...rest,
        kronologi: encryptText(rest.kronologi),
        status: finalStatus,
        pelaporId: userId,
        trackingNumber,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Laporan manual berhasil dibuat',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const id = req.params.id as string;
    const updateData = req.body;

    const existingReport = await db.report.findUnique({ where: { id } });
    if (!existingReport) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    if (existingReport.status === 'SELESAI') {
      throw new ApiError(409, 'Laporan sudah selesai dan terkunci, tidak dapat diubah lagi');
    }

    let trackingNumber = existingReport.trackingNumber;
    if (updateData.status === 'SUBMITTED' && !trackingNumber) {
      trackingNumber = await generateTrackingNumber();
    }

    // Rekam history
    await db.reportHistory.create({
      data: {
        reportId: id,
        actorId: adminId,
        aksi: 'UPDATE',
        perubahan: updateData, // Prisma json tipe data
      },
    });

    const updatedData: Record<string, unknown> = { ...updateData, trackingNumber };
    if (updateData.kronologi) {
      updatedData.kronologi = encryptText(updateData.kronologi);
    }

    const updatedReport = await db.report.update({
      where: { id },
      data: updatedData,
    });

    res.status(200).json({
      success: true,
      message: 'Laporan berhasil diupdate',
      data: updatedReport,
    });
  } catch (error) {
    next(error);
  }
};

export const assignReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const id = req.params.id as string;
    const { assignedToId } = req.body;

    const existingReport = await db.report.findUnique({ where: { id } });
    if (!existingReport) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    if (assignedToId) {
      const assignee = await db.user.findUnique({ where: { id: assignedToId } });
      if (!assignee) {
        throw new ApiError(404, 'User yang akan di-assign tidak ditemukan');
      }
      if (assignee.role !== 'ADMIN' && assignee.role !== 'ADMIN_UTAMA') {
        throw new ApiError(400, 'User yang di-assign harus memiliki role ADMIN atau ADMIN_UTAMA');
      }
    }

    await db.reportHistory.create({
      data: {
        reportId: id,
        actorId: adminId,
        aksi: 'ASSIGN',
        perubahan: { assignedToId },
      },
    });

    const updatedReport = await db.report.update({
      where: { id },
      data: { assignedToId },
      include: {
        assignedTo: { select: { id: true, nama: true } },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Admin penanggung jawab berhasil ditugaskan',
      data: updatedReport,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const id = req.params.id as string;

    const existingReport = await db.report.findUnique({ where: { id } });
    if (!existingReport) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    await db.reportHistory.create({
      data: {
        reportId: id,
        actorId: adminId,
        aksi: 'ARCHIVE',
        perubahan: { status: 'ARSIP' },
      },
    });

    // Soft delete is handled by Prisma extension if we call delete, but here we just update status to ARSIP
    // The requirement says "soft delete, ubah status ke ARSIP"
    // Since we have soft delete extension on DB level, calling delete() will set deletedAt and hide it from normal queries.
    // If we want it to still be queryable as 'ARSIP', we might just update status and let Prisma soft-delete it.
    // However, if Prisma soft-delete hides it from findMany, we might not want to delete() it.
    // Let's explicitly set status to ARSIP and use delete() to trigger soft-delete.

    // Update status to ARSIP first
    await db.report.update({
      where: { id },
      data: { status: 'ARSIP' },
    });

    // Soft delete
    await db.report.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Laporan berhasil diarsipkan (soft delete)',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const hardDeleteReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // TODO: Middleware confirmPassword akan ditambahkan di Fase 7
    // untuk mengunci endpoint ini lebih lanjut.
    // Saat ini cukup dilindungi oleh requireRole('ADMIN_UTAMA') pada router.

    // Bypass soft delete dengan menghapus langsung dari raw query atau membiarkan Prisma jika tidak dihalangi extension
    // Prisma client with soft delete extension overrides delete() and deleteMany().
    // We can bypass it by using raw SQL, or updating the extension logic.
    // Let's use raw SQL to hard delete the report.

    await db.$executeRawUnsafe(`DELETE FROM reports WHERE id = $1`, id);

    res.status(200).json({
      success: true,
      message: 'Laporan berhasil dihapus permanen',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const regradeReportHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const reportId = req.params.id as string;
    const { gradingBaru, alasan } = req.body as { gradingBaru: string; alasan: string };

    const existingReport = await db.report.findUnique({ where: { id: reportId } });
    if (!existingReport) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    if (existingReport.status === 'SELESAI') {
      throw new ApiError(409, 'Laporan sudah selesai dan terkunci, tidak dapat diubah lagi');
    }

    const result = await regradeReport(adminId, reportId, gradingBaru, alasan);

    res.status(200).json({
      success: true,
      message: 'Grading laporan berhasil diubah',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const exportReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { format, status, jenisInsiden, unitKerja, startDate, endDate } = req.query;

    const where: Prisma.ReportWhereInput = {};
    if (status) where.status = status as StatusLaporan;
    if (jenisInsiden) where.jenisInsiden = jenisInsiden as JenisInsiden;
    if (unitKerja) where.unitKerja = unitKerja as string;
    if (startDate || endDate) {
      where.tanggalKejadian = {};
      if (startDate) where.tanggalKejadian.gte = new Date(startDate as string);
      if (endDate) where.tanggalKejadian.lte = new Date(endDate as string);
    }

    const reports = await db.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const decryptedReports = reports.map((r) => ({
      ...r,
      kronologi: r.kronologi ? decryptText(r.kronologi) : r.kronologi,
    }));

    if (format === 'excel') {
      const buffer = await generateMassReportExcel(decryptedReports);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="export-laporan.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = await generateMassReportPdf(decryptedReports);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="export-laporan.pdf"');
      return res.send(buffer);
    } else {
      throw new ApiError(400, 'Format tidak valid. Gunakan excel atau pdf');
    }
  } catch (error) {
    next(error);
  }
};
