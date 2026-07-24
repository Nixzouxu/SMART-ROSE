import { db } from '../src/config/db';
import { runDailySlaCheck } from '../src/jobs/dailySlaCheck.job';

async function main() {
  console.log('--- PERSIAPAN DATA TEST ---');
  // Ambil sembarang admin
  const admin = await db.user.findFirst();
  if (!admin) throw new Error('Tidak ada user');

  // Buat laporan 1: SLA Mendekat (H-2 untuk RCA)
  const now = new Date();
  const dMendekat = new Date(now);
  dMendekat.setDate(dMendekat.getDate() + 2); // Sisa 2 hari

  const rep1 = await db.report.create({
    data: {
      trackingNumber: 'TEST-SLA-MENDEKAT',
      jenisInsiden: 'KTD',
      tanggalKejadian: now,
      lokasi: 'Test',
      unitKerja: 'Test',
      kronologi: 'test',
      dampak: 'test',
      gradingAwal: 'MERAH', // RCA
      status: 'DALAM_INVESTIGASI',
      deadlineInvestigasi: dMendekat,
      assignedToId: admin.id,
    }
  });

  // Buat laporan 2: SLA Overdue (H-1 dari sekarang)
  const dOverdue = new Date(now);
  dOverdue.setDate(dOverdue.getDate() - 1); // Sudah lewat 1 hari

  const rep2 = await db.report.create({
    data: {
      trackingNumber: 'TEST-SLA-OVERDUE',
      jenisInsiden: 'KTD',
      tanggalKejadian: now,
      lokasi: 'Test',
      unitKerja: 'Test',
      kronologi: 'test',
      dampak: 'test',
      gradingAwal: 'MERAH', // RCA
      status: 'DALAM_INVESTIGASI',
      deadlineInvestigasi: dOverdue,
      assignedToId: admin.id,
    }
  });

  console.log('Laporan berhasil dibuat.');

  console.log('\n--- RUN 1 (Memicu Notifikasi) ---');
  await runDailySlaCheck();
  
  // Cek notifikasi rep1
  const notif1 = await db.notification.findMany({ where: { referensiId: rep1.id } });
  console.log(`Notifikasi rep1 (Mendekat): ${notif1.length} found`);
  notif1.forEach(n => console.log(' ->', n.pesan));

  // Cek notifikasi rep2
  const notif2 = await db.notification.findMany({ where: { referensiId: rep2.id } });
  console.log(`Notifikasi rep2 (Overdue): ${notif2.length} found`);
  notif2.forEach(n => console.log(' ->', n.pesan));

  // Reset status rep2 kembali ke DALAM_INVESTIGASI agar bisa "tertangkap" query lagi
  // (karena cron mengubahnya menjadi OVERDUE yang notIn 'OVERDUE')
  // Ini mensimulasikan kegagalan ubah status atau hal serupa.
  await db.report.update({
    where: { id: rep2.id },
    data: { status: 'DALAM_INVESTIGASI' }
  });

  console.log('\n--- RUN 2 (Menguji Anti-Duplikat) ---');
  await runDailySlaCheck();

  const notif1_2 = await db.notification.findMany({ where: { referensiId: rep1.id } });
  console.log(`Notifikasi rep1 (Mendekat) pada Run 2: ${notif1_2.length} found`);
  
  const notif2_2 = await db.notification.findMany({ where: { referensiId: rep2.id } });
  console.log(`Notifikasi rep2 (Overdue) pada Run 2: ${notif2_2.length} found`);

  console.log('\n--- CLEANUP ---');
  await db.notification.deleteMany({ where: { referensiId: { in: [rep1.id, rep2.id] } } });
  await db.reportHistory.deleteMany({ where: { reportId: { in: [rep1.id, rep2.id] } } });
  await db.report.deleteMany({ where: { id: { in: [rep1.id, rep2.id] } } });
  console.log('Selesai.');
}

main().catch(console.error);
