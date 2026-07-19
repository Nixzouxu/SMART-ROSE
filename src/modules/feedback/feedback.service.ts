import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';

export class FeedbackService {
  async createFeedback(
    reportId: string,
    dariAdminId: string,
    payload: { catatan: string; jenis: 'ADVISORY' | 'MENGIKAT' },
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    return prisma.feedback.create({
      data: {
        reportId,
        dariAdminId,
        catatan: payload.catatan,
        jenis: payload.jenis,
      },
      include: {
        dariAdmin: { select: { id: true, nama: true, role: true } },
      },
    });
  }

  async getFeedbackByReportId(reportId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    return prisma.feedback.findMany({
      where: { reportId },
      include: {
        dariAdmin: { select: { id: true, nama: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const feedbackService = new FeedbackService();
