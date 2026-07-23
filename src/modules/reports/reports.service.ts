import { Prisma } from '@prisma/client';
import { db } from '@/config/db';
import { generateTrackingNumber } from './trackingNumber.util';
import { ApiError } from '@/utils/apiError';
import { encryptText, decryptText } from '@/utils/encryption';
import { refreshAttachmentUrls } from './attachment.helper';

// Fungsi bantuan untuk menutupi (mask) pelaporId jika laporan bersifat anonim.
// IsAnonim pada database TIDAK menghapus pelaporId. Ini penting agar tim investigasi internal
// (jika ada otorisasi khusus di kemudian hari atau di database secara fisik) tetap memiliki jejak audit
// yang valid tentang siapa pembuat laporannya. Namun, bagi publik dan pengguna biasa (atau endpoint ini),
// identitas akan disembunyikan.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const maskAnonimReport = (report: any) => {
  if (report.kronologi) {
    report.kronologi = decryptText(report.kronologi);
  }
  if (report.isAnonim) {
    return {
      ...report,
      pelaporId: null,
      pelapor: undefined, // Jika menggunakan include pelapor
    };
  }
  return report;
};

type CreateReportInput = {
  jenisInsiden: 'KTD' | 'KNC' | 'KTC' | 'KPC' | 'SENTINEL';
  tanggalKejadian: Date;
  lokasi: string;
  unitKerja: string;
  kronologi: string;
  dampak: string;
  gradingAwal: 'HIJAU' | 'BIRU' | 'KUNING' | 'MERAH';
  isAnonim?: boolean;
  status?: 'DRAFT' | 'SUBMITTED';
};

export const createReport = async (pelaporId: string | null, data: CreateReportInput) => {
  const { status, ...rest } = data;
  let trackingNumber: string | null = null;
  const finalStatus = status || 'DRAFT';

  if (finalStatus === 'SUBMITTED') {
    trackingNumber = await generateTrackingNumber();
  }

  const reportData: Prisma.ReportUncheckedCreateInput = {
    ...rest,
    kronologi: encryptText(rest.kronologi),
    status: finalStatus,
    pelaporId: pelaporId ?? null,
    trackingNumber,
  };

  const report = await db.report.create({ data: reportData });

  return maskAnonimReport(report);
};

export const updateDraftReport = async (
  userId: string,
  reportId: string,
  data: Partial<CreateReportInput>,
) => {
  const existingReport = await db.report.findUnique({
    where: { id: reportId },
  });

  if (!existingReport) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  if (existingReport.pelaporId !== userId) {
    throw new ApiError(403, 'Anda tidak berhak mengubah laporan ini');
  }

  if (existingReport.status !== 'DRAFT') {
    throw new ApiError(400, 'Hanya laporan dengan status DRAFT yang bisa diubah');
  }

  let trackingNumber = existingReport.trackingNumber;

  if (data.status === 'SUBMITTED' && !trackingNumber) {
    trackingNumber = await generateTrackingNumber();
  }

  const updatedData: Record<string, unknown> = { ...data, trackingNumber };
  if (data.kronologi) {
    updatedData.kronologi = encryptText(data.kronologi);
  }

  const updatedReport = await db.report.update({
    where: { id: reportId },
    data: updatedData,
  });

  return maskAnonimReport(updatedReport);
};

export const deleteDraftReport = async (userId: string, reportId: string) => {
  const existingReport = await db.report.findUnique({
    where: { id: reportId },
  });

  if (!existingReport) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  if (existingReport.pelaporId !== userId) {
    throw new ApiError(403, 'Anda tidak berhak menghapus laporan ini');
  }

  if (existingReport.status !== 'DRAFT') {
    throw new ApiError(400, 'Hanya laporan dengan status DRAFT yang bisa dihapus');
  }

  await db.report.delete({
    where: { id: reportId },
  });
};

export const getMyReports = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [total, reports] = await Promise.all([
    db.report.count({ where: { pelaporId: userId } }),
    db.report.findMany({
      where: { pelaporId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        attachments: true,
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: await Promise.all(
      reports.map(async (r) => {
        if (r.attachments && r.attachments.length > 0) {
          r.attachments = (await refreshAttachmentUrls(r.attachments)) as any;
        }
        return maskAnonimReport(r);
      }),
    ),
  };
};

export const getMyReportDetail = async (userId: string, reportId: string) => {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      attachments: true,
      histories: { orderBy: { timestamp: 'desc' } },
    },
  });

  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  if (report.pelaporId !== userId) {
    throw new ApiError(403, 'Anda tidak berhak mengakses laporan ini');
  }

  if (report.attachments && report.attachments.length > 0) {
    report.attachments = (await refreshAttachmentUrls(report.attachments)) as any;
  }

  return maskAnonimReport(report);
};

export const getPublicTrackingStatus = async (trackingNumber: string) => {
  const report = await db.report.findUnique({
    where: { trackingNumber },
    select: {
      trackingNumber: true,
      status: true,
      jenisInsiden: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!report) {
    throw new ApiError(404, 'Laporan dengan nomor pelacakan tersebut tidak ditemukan');
  }

  return report;
};
