import { db } from '@/config/db';
import { getStorageProvider } from '@/modules/storage/storage.factory';
import { randomUUID } from 'crypto';
import { ApiError } from '@/utils/apiError';
import path from 'path';

export const uploadAttachment = async (
  reportId: string,
  userId: string,
  file: Express.Multer.File,
) => {
  // Verifikasi report milik user
  const report = await db.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  // Admin dan Admin Utama juga berhak melihat/menambah? Pada saat ini kita batasi untuk pelapor dulu.
  // Tapi untuk kebutuhan pelaporan, cukup pastikan dia pemilik laporan.
  // Jika admin ingin upload, bisa dipisah ke route admin.
  if (report.pelaporId !== userId) {
    throw new ApiError(403, 'Anda tidak berhak menambah lampiran pada laporan ini');
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
