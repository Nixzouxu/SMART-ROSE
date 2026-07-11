import { db } from '@/config/db';
import { generateTrackingNumber } from './trackingNumber.util';
import { ApiError } from '@/utils/apiError';

// Fungsi bantuan untuk menutupi (mask) pelaporId jika laporan bersifat anonim.
// IsAnonim pada database TIDAK menghapus pelaporId. Ini penting agar tim investigasi internal
// (jika ada otorisasi khusus di kemudian hari atau di database secara fisik) tetap memiliki jejak audit
// yang valid tentang siapa pembuat laporannya. Namun, bagi publik dan pengguna biasa (atau endpoint ini),
// identitas akan disembunyikan.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const maskAnonimReport = (report: any) => {
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

export const createReport = async (pelaporId: string, data: CreateReportInput) => {
  const { status, ...rest } = data;
  let trackingNumber: string | null = null;
  const finalStatus = status || 'DRAFT';

  if (finalStatus === 'SUBMITTED') {
    trackingNumber = await generateTrackingNumber();
  }

  const report = await db.report.create({
    data: {
      ...rest,
      status: finalStatus,
      pelaporId,
      trackingNumber,
    },
  });

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

  const updatedReport = await db.report.update({
    where: { id: reportId },
    data: {
      ...data,
      trackingNumber,
    },
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
    data: reports.map(maskAnonimReport),
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
