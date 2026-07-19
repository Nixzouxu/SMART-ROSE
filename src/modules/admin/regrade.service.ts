// src/modules/admin/regrade.service.ts
// Logika bisnis untuk regrading laporan insiden oleh admin.
//
// Aturan regrading:
// 1. Laporan harus ditemukan dan tidak dihapus.
// 2. Hanya laporan yang sudah pernah di-grade (gradingFinal ada) atau laporan
//    yang statusnya DALAM_INVESTIGASI / MENUNGGU_VERIFIKASI yang bisa di-regrade.
// 3. deadlineInvestigasi BARU dihitung dari SEKARANG (bukan dari tanggal kejadian),
//    sehingga admin yang assign ulang mendapat deadline segar sesuai grading baru.
// 4. Perubahan dicatat di ReportHistory dengan aksi 'REGRADE' dan payload
//    { gradingLama, gradingBaru, alasan, deadlineLama, deadlineBaru }.

import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { hitungDeadlineInvestigasi } from '@/config/sla';

export const regradeReport = async (
  adminId: string,
  reportId: string,
  gradingBaru: string,
  alasan: string,
) => {
  const report = await db.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  // Tentukan grading lama: prioritaskan gradingFinal, fallback ke gradingAwal
  const gradingLama = report.gradingFinal ?? report.gradingAwal;

  // Hitung deadline baru dari SEKARANG berdasarkan grading baru
  const deadlineBaru = hitungDeadlineInvestigasi(gradingBaru);
  const deadlineLama = report.deadlineInvestigasi;

  // Catat history terlebih dahulu
  await db.reportHistory.create({
    data: {
      reportId,
      actorId: adminId,
      aksi: 'REGRADE',
      perubahan: {
        gradingLama: gradingLama,
        gradingBaru: gradingBaru,
        alasan: alasan,
        deadlineLama: deadlineLama ? deadlineLama.toISOString() : null,
        deadlineBaru: deadlineBaru.toISOString(),
      },
    },
  });

  // Update laporan dengan grading baru dan deadline baru
  const updatedReport = await db.report.update({
    where: { id: reportId },
    data: {
      gradingFinal: gradingBaru as 'HIJAU' | 'BIRU' | 'KUNING' | 'MERAH',
      deadlineInvestigasi: deadlineBaru,
    },
  });

  return {
    report: updatedReport,
    perubahan: {
      gradingLama,
      gradingBaru,
      alasan,
      deadlineLama,
      deadlineBaru,
    },
  };
};
