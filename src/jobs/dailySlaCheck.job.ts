// src/jobs/dailySlaCheck.job.ts
// Cron job harian untuk pengecekan SLA laporan insiden.
//
// Job ini melakukan dua hal setiap hari:
//
// 1. INVESTIGASI_H3: Kirim notifikasi ke admin yang di-assign untuk laporan
//    yang deadlineInvestigasi <= 3 hari dari sekarang (dan belum OVERDUE/SELESAI/ARSIP).
//    Jendela 3 hari memberi admin waktu yang cukup untuk merespons sebelum terlambat.
//
// 2. AUTO_ESCALATE_OVERDUE: Ubah status laporan yang deadlineInvestigasi sudah
//    lewat menjadi OVERDUE dan catat ReportHistory dengan actorId = user sistem
//    (system@smartrose.internal). Juga kirim notifikasi INVESTIGASI_OVERDUE ke admin
//    yang di-assign.
//
// Jika user sistem tidak ditemukan saat job berjalan, error dicatat ke logger
// dan pencatatan ReportHistory dilewati untuk laporan itu - NAMUN perubahan
// status ke OVERDUE dan notifikasi TETAP dilakukan agar laporan tidak terabaikan.

import { db } from '@/config/db';
import { logger } from '@/utils/logger';
import { createNotification } from '@/modules/notifications/notifications.service';
import { TipeNotifikasi } from '@prisma/client';

const SYSTEM_USER_EMAIL = 'system@smartrose.internal';
const HARI_PERINGATAN_DEADLINE = 3;

/**
 * Jalankan pengecekan SLA harian.
 * Dipanggil oleh scheduler di src/jobs/index.ts.
 */
export async function runDailySlaCheck(): Promise<void> {
  logger.info('[SLA Job] Memulai pengecekan SLA harian...');

  const sekarang = new Date();

  await cekDeadlineMendekat(sekarang);
  await eskalasiBatasWaktuTerlampaui(sekarang);

  logger.info('[SLA Job] Pengecekan SLA harian selesai.');
}

/**
 * Kirim notifikasi INVESTIGASI untuk laporan yang deadlineInvestigasi
 * jatuh dalam <= 3 hari (RCA) atau <= 1 hari (Investigasi Sederhana).
 */
async function cekDeadlineMendekat(sekarang: Date): Promise<void> {
  const batasAtasRca = new Date(sekarang);
  batasAtasRca.setDate(batasAtasRca.getDate() + 3);

  // Ambil laporan yang:
  // - deadlineInvestigasi ada
  // - deadlineInvestigasi > sekarang (belum terlampaui)
  // - deadlineInvestigasi <= sekarang + 3 hari (batas max untuk query RCA)
  // - statusnya masih aktif
  // - ada admin yang di-assign
  const laporan = await db.report.findMany({
    where: {
      deadlineInvestigasi: {
        gt: sekarang,
        lte: batasAtasRca,
      },
      status: {
        notIn: ['SELESAI', 'OVERDUE', 'ARSIP'],
      },
      assignedToId: {
        not: null,
      },
    },
    select: {
      id: true,
      trackingNumber: true,
      assignedToId: true,
      deadlineInvestigasi: true,
      status: true,
      gradingFinal: true,
      gradingAwal: true,
    },
  });

  // Filter based on grading
  const laporanMendekat = laporan.filter((lap) => {
    const grading = lap.gradingFinal ?? lap.gradingAwal;
    const isRca = grading === null || grading === 'MERAH' || grading === 'KUNING';
    const sisaHari = Math.ceil(
      (lap.deadlineInvestigasi!.getTime() - sekarang.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (isRca) {
      return sisaHari <= 3;
    } else {
      return sisaHari <= 1;
    }
  });

  if (laporanMendekat.length === 0) {
    logger.info('[SLA Job] Tidak ada laporan dengan deadline mendekat.');
    return;
  }

  logger.info(`[SLA Job] Ditemukan ${laporanMendekat.length} laporan dengan deadline mendekat.`);

  for (const lap of laporanMendekat) {
    try {
      // Pengecekan anti-duplikat menggunakan keyword
      const existingNotif = await db.notification.findFirst({
        where: {
          referensiId: lap.id,
          tipe: TipeNotifikasi.INVESTIGASI,
          pesan: {
            contains: 'akan melampaui deadline',
          },
        },
      });

      if (existingNotif) {
        logger.info(
          `[SLA Job] Laporan ${lap.id} sudah pernah dikirimi notifikasi deadline mendekat. Dilewati.`,
        );
        continue;
      }

      const sisaHari = Math.ceil(
        (lap.deadlineInvestigasi!.getTime() - sekarang.getTime()) / (1000 * 60 * 60 * 24),
      );

      const pesan =
        `Laporan ${lap.trackingNumber ?? lap.id} akan melampaui deadline investigasi` +
        ` dalam ${sisaHari} hari (${lap.deadlineInvestigasi!.toLocaleDateString('id-ID')}).` +
        ` Segera selesaikan investigasi.`;

      await createNotification(lap.assignedToId!, TipeNotifikasi.INVESTIGASI, pesan, lap.id);

      logger.info(
        `[SLA Job] Notifikasi INVESTIGASI (Mendekat) dikirim untuk laporan ${lap.id} ` +
          `ke admin ${lap.assignedToId}.`,
      );
    } catch (err) {
      logger.error(
        { err, reportId: lap.id },
        '[SLA Job] Gagal kirim notifikasi INVESTIGASI (Mendekat) untuk laporan.',
      );
    }
  }
}

/**
 * Eskalasi laporan yang sudah melampaui deadline menjadi OVERDUE.
 * Catat ReportHistory dengan actorId = user sistem.
 */
async function eskalasiBatasWaktuTerlampaui(sekarang: Date): Promise<void> {
  // Cari user sistem terlebih dahulu
  // Gunakan findFirst karena soft-delete extension mencegah findUnique pada akun sistem
  // (akun sistem tidak pernah di-soft-delete, jadi ini aman)
  const systemUser = await db.user.findFirst({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });

  if (!systemUser) {
    logger.error(
      `[SLA Job] KRITIS: User sistem dengan email "${SYSTEM_USER_EMAIL}" tidak ditemukan.` +
        ' Pastikan seed database sudah dijalankan (npm run db:seed).' +
        ' ReportHistory untuk AUTO_ESCALATE_OVERDUE TIDAK akan dicatat, tetapi' +
        ' status laporan TETAP akan diubah ke OVERDUE dan notifikasi TETAP dikirim.',
    );
  }

  // Ambil laporan yang:
  // - deadlineInvestigasi ada dan sudah lewat
  // - status masih aktif (bukan OVERDUE, SELESAI, ARSIP)
  const laporan = await db.report.findMany({
    where: {
      deadlineInvestigasi: {
        lte: sekarang,
      },
      status: {
        notIn: ['SELESAI', 'OVERDUE', 'ARSIP'],
      },
    },
    select: {
      id: true,
      trackingNumber: true,
      assignedToId: true,
      status: true,
      deadlineInvestigasi: true,
    },
  });

  if (laporan.length === 0) {
    logger.info('[SLA Job] Tidak ada laporan yang melampaui deadline.');
    return;
  }

  logger.info(
    `[SLA Job] Ditemukan ${laporan.length} laporan yang melampaui deadline, eskalasi ke OVERDUE.`,
  );

  for (const lap of laporan) {
    try {
      // 1. Ubah status ke OVERDUE
      await db.report.update({
        where: { id: lap.id },
        data: { status: 'OVERDUE' },
      });

      // 2. Catat ReportHistory jika user sistem tersedia
      if (systemUser) {
        await db.reportHistory.create({
          data: {
            reportId: lap.id,
            actorId: systemUser.id,
            aksi: 'AUTO_ESCALATE_OVERDUE',
            perubahan: {
              statusLama: lap.status,
              statusBaru: 'OVERDUE',
              deadlineInvestigasi: lap.deadlineInvestigasi
                ? lap.deadlineInvestigasi.toISOString()
                : null,
              keterangan: 'Eskalasi otomatis oleh sistem: deadline investigasi telah terlampaui.',
            },
          },
        });

        logger.info(
          `[SLA Job] ReportHistory AUTO_ESCALATE_OVERDUE dicatat untuk laporan ${lap.id}` +
            ` (actorId: ${systemUser.id}).`,
        );
      } else {
        logger.warn(
          `[SLA Job] ReportHistory dilewati untuk laporan ${lap.id} karena user sistem tidak ditemukan.`,
        );
      }

      // 3. Kirim notifikasi ke admin yang di-assign (jika ada)
      if (lap.assignedToId) {
        // Pengecekan anti-duplikat menggunakan keyword
        const existingNotif = await db.notification.findFirst({
          where: {
            referensiId: lap.id,
            tipe: TipeNotifikasi.INVESTIGASI,
            pesan: {
              contains: 'telah OVERDUE',
            },
          },
        });

        if (!existingNotif) {
          const pesan =
            `Laporan ${lap.trackingNumber ?? lap.id} telah OVERDUE.` +
            ` Deadline investigasi (${lap.deadlineInvestigasi?.toLocaleDateString('id-ID') ?? '-'})` +
            ` telah terlampaui. Status diubah otomatis menjadi OVERDUE oleh sistem.`;

          await createNotification(lap.assignedToId, TipeNotifikasi.INVESTIGASI, pesan, lap.id);

          logger.info(
            `[SLA Job] Notifikasi INVESTIGASI (Lewat) dikirim untuk laporan ${lap.id}` +
              ` ke admin ${lap.assignedToId}.`,
          );
        } else {
          logger.info(
            `[SLA Job] Laporan ${lap.id} sudah pernah dikirimi notifikasi overdue. Dilewati.`,
          );
        }
      }
    } catch (err) {
      logger.error(
        { err, reportId: lap.id },
        '[SLA Job] Gagal memproses eskalasi OVERDUE untuk laporan.',
      );
    }
  }
}
