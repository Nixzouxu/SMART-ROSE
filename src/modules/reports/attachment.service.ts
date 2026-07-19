import { db } from '@/config/db';
import { getStorageProvider } from '@/modules/storage/storage.factory';
import { randomUUID } from 'crypto';
import { ApiError } from '@/utils/apiError';
import path from 'path';

export const uploadAttachment = async (reportId: string, file: Express.Multer.File) => {
  // Verifikasi laporan ada (tidak perlu cek kepemilikan karena endpoint ini publik)
  const report = await db.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  const ext = path.extname(file.originalname);
  const objectPath = `reports/${reportId}/${randomUUID()}${ext}`;

  const storageProvider = getStorageProvider();

  // upload() harus return { url, path }
  const result = await storageProvider.upload(objectPath, file.buffer, file.mimetype);

  let tipeFile: 'JPG' | 'PNG' | 'PDF' = 'JPG';
  if (file.mimetype === 'image/png') tipeFile = 'PNG';
  if (file.mimetype === 'application/pdf') tipeFile = 'PDF';

  const attachment = await db.reportAttachment.create({
    data: {
      reportId,
      fileUrl: result.url,
      objectPath: result.path,
      tipeFile,
    },
  });

  return attachment;
};

export const uploadRcaAttachment = async (reportId: string, file: Express.Multer.File) => {
  const rca = await db.rootCauseAnalysis.findUnique({
    where: { reportId: reportId },
  });

  if (!rca) {
    throw new ApiError(404, 'RCA tidak ditemukan untuk laporan ini');
  }

  const ext = path.extname(file.originalname);
  const objectPath = `rca/${rca.id}/${randomUUID()}${ext}`;

  const storageProvider = getStorageProvider();
  const result = await storageProvider.upload(objectPath, file.buffer, file.mimetype);

  let tipeFile: 'PDF' | 'DOCX' | 'XLSX' = 'PDF';
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    tipeFile = 'DOCX';
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    tipeFile = 'XLSX';

  const attachment = await db.rcaAttachment.create({
    data: {
      rcaId: rca.id,
      fileUrl: result.url,
      objectPath: result.path,
      tipeFile,
    },
  });

  return attachment;
};
