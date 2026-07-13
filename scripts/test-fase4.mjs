/**
 * scripts/test-fase4.mjs
 * Script pengujian untuk Fase 4: Regrading, Kalkulasi Deadline SLA, Cron Job Harian.
 *
 * Menguji:
 * 1. Setup: buat admin dan laporan uji coba dengan deadline sudah set
 * 2. Endpoint regrade: HIJAU -> KUNING, verifikasi deadline baru dari sekarang
 * 3. Simulasi job SLA:
 *    a. DEADLINE_MENDEKAT: laporan dengan deadline 2 hari dari sekarang
 *       -> notifikasi DEADLINE_MENDEKAT muncul di tabel Notification untuk admin yang di-assign
 *    b. AUTO_ESCALATE_OVERDUE: laporan dengan deadline kemarin
 *       -> status berubah jadi OVERDUE
 *       -> ReportHistory dengan actorId = system user (bukan admin biasa)
 *       -> notifikasi DEADLINE_LEWAT muncul di tabel Notification
 * 4. Verifikasi database langsung via query SQL
 */

import pg from 'pg';
import Redis from 'ioredis';

const { Client } = pg;

const API_URL = 'http://localhost:4000/api';
const DB_URL = 'postgresql://smartrose:smartrosedev123@127.0.0.1:5433/smartrose_dev';
const timestamp = Date.now();

let dbClient;
let tokenAdmin;
let adminId;
let reportDeadlineMendekatId;
let reportOverdueId;
let adminAssignedId; // ID admin yang di-assign ke laporan

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
}

function fail(msg) {
  console.error(`  [FAIL] ${msg}`);
  process.exitCode = 1;
}

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

async function setup() {
  section('SETUP: Koneksi Database dan Register Admin');

  dbClient = new Client({ connectionString: DB_URL });
  await dbClient.connect();
  console.log('  Database terkoneksi.');

  // Verifikasi user sistem ada di database
  const sysUserResult = await dbClient.query(
    `SELECT id, nama, email FROM users WHERE email = 'system@smartrose.internal'`
  );
  if (sysUserResult.rows.length === 0) {
    fail('User sistem "system@smartrose.internal" TIDAK DITEMUKAN di database! Jalankan: npx prisma db seed');
    process.exit(1);
  }
  const systemUserId = sysUserResult.rows[0].id;
  pass(`User sistem ditemukan: id=${systemUserId}, nama="${sysUserResult.rows[0].nama}"`);

  // Register admin utama untuk tes
  const emailAdmin = `admin_fase4_${timestamp}@test.com`;
  console.log(`\n  Registrasi admin: ${emailAdmin}`);

  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama: 'Admin Fase 4',
      email: emailAdmin,
      password: 'Password123!',
      noPegawai: `AF4-${timestamp}`,
      unitKerja: 'DIREKSI',
    }),
  });
  const regData = await regRes.json();
  if (regRes.status !== 201) {
    fail(`Register admin gagal: ${JSON.stringify(regData)}`);
    process.exit(1);
  }

  // Set role ADMIN_UTAMA dan APPROVED langsung di DB
  await dbClient.query(
    `UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN_UTAMA' WHERE email = $1`,
    [emailAdmin]
  );

  // Ambil adminId
  const adminRow = await dbClient.query(`SELECT id FROM users WHERE email = $1`, [emailAdmin]);
  adminId = adminRow.rows[0].id;
  adminAssignedId = adminId; // Gunakan admin ini juga sebagai assigned admin

  // Login admin (akan minta OTP karena ADMIN_UTAMA)
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailAdmin, password: 'Password123!' }),
  });
  const loginData = await loginRes.json();

  if (loginData.data?.requiresOtp) {
    console.log('  Admin membutuhkan OTP, ambil dari Redis...');
    const redis = new Redis({ host: '127.0.0.1', port: 6379, password: 'redisdev123' });
    const otp = await redis.get(`otp:${emailAdmin}`);
    await redis.quit();

    if (!otp) {
      fail(`OTP tidak ditemukan di Redis untuk ${emailAdmin}`);
      process.exit(1);
    }

    const otpRes = await fetch(`${API_URL}/auth/login/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAdmin, otp }),
    });
    const otpData = await otpRes.json();
    tokenAdmin = otpData.data?.accessToken;
  } else {
    tokenAdmin = loginData.data?.accessToken;
  }

  if (!tokenAdmin) {
    fail(`Login admin gagal. Data: ${JSON.stringify(loginData)}`);
    process.exit(1);
  }
  pass(`Admin login berhasil. Token tersedia.`);

  return systemUserId;
}

async function buatLaporanDenganDeadline(label, deadlineDate, gradingFinal) {
  // Buat laporan via API dengan status SUBMITTED (valid di schema)
  const createRes = await fetch(`${API_URL}/admin/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
    body: JSON.stringify({
      jenisInsiden: 'KTD',
      tanggalKejadian: new Date('2026-01-15').toISOString(),
      lokasi: 'Lantai 3',
      unitKerja: 'ICU',
      kronologi: `Tes otomatis Fase 4 - ${label}: kronologi insiden test minimal sepuluh karakter`,
      dampak: 'Dampak tes',
      gradingAwal: gradingFinal,
      status: 'SUBMITTED',
    }),
  });
  const createData = await createRes.json();

  if (createRes.status !== 201 || !createData.data?.id) {
    fail(`Buat laporan "${label}" gagal: ${JSON.stringify(createData)}`);
    process.exit(1);
  }

  const reportId = createData.data.id;

  // Set deadline, gradingFinal, status, dan assigned_to_id langsung di DB
  await dbClient.query(
    `UPDATE reports SET deadline_investigasi = $1, grading_final = $2, assigned_to_id = $3, status = 'DALAM_INVESTIGASI' WHERE id = $4`,
    [deadlineDate, gradingFinal, adminAssignedId, reportId],
  );

  console.log(
    `  Laporan "${label}" dibuat: id=${reportId}, deadline=${deadlineDate.toISOString().split('T')[0]}`,
  );
  return reportId;
}


async function testRegrading(systemUserId) {
  section('TES 1: Endpoint Regrade (HIJAU -> KUNING)');

  // Buat laporan untuk di-regrade (deadline lama tidak relevan, akan diganti)
  const deadlineLama = new Date();
  deadlineLama.setDate(deadlineLama.getDate() + 90); // Asumsi HIJAU = 90 hari

  const reportId = await buatLaporanDenganDeadline('Regrade Test', deadlineLama, 'HIJAU');

  // Ambil deadline sebelum regrade untuk perbandingan
  const beforeRow = await dbClient.query(
    `SELECT deadline_investigasi, grading_final FROM reports WHERE id = $1`,
    [reportId]
  );
  const deadlineSebelum = beforeRow.rows[0].deadline_investigasi;
  const gradingSebelum = beforeRow.rows[0].grading_final ?? 'HIJAU';

  console.log(`\n  Grading sebelum  : ${gradingSebelum}`);
  console.log(`  Deadline sebelum : ${deadlineSebelum ? new Date(deadlineSebelum).toISOString() : 'null'}`);

  const waktuSebelumRegrade = new Date();

  // Panggil endpoint regrade via HTTP nyata
  const regradeRes = await fetch(`${API_URL}/admin/reports/${reportId}/regrade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
    body: JSON.stringify({
      gradingBaru: 'KUNING',
      alasan: 'Investigasi awal menunjukkan risiko lebih tinggi dari perkiraan awal',
    }),
  });

  const regradeData = await regradeRes.json();
  console.log(`\n  HTTP Status Regrade: ${regradeRes.status}`);
  console.log(`  Response:`, JSON.stringify(regradeData, null, 2));

  if (regradeRes.status !== 200) {
    fail(`Regrade gagal, status: ${regradeRes.status}`);
    return;
  }
  pass(`Regrade HTTP response 200 OK`);

  // Verifikasi langsung di database
  const afterRow = await dbClient.query(
    `SELECT grading_final, deadline_investigasi FROM reports WHERE id = $1`,
    [reportId]
  );
  const gradingBaru = afterRow.rows[0].grading_final;
  const deadlineBaru = new Date(afterRow.rows[0].deadline_investigasi);

  console.log(`\n  Verifikasi Database Langsung:`);
  console.log(`  Grading setelah  : ${gradingBaru}`);
  console.log(`  Deadline setelah : ${deadlineBaru.toISOString()}`);

  // Verifikasi grading berubah
  if (gradingBaru === 'KUNING') {
    pass(`gradingFinal berhasil diubah ke KUNING`);
  } else {
    fail(`gradingFinal seharusnya KUNING, tapi: ${gradingBaru}`);
  }

  // Verifikasi deadline baru adalah sekitar 45 hari dari SEKARANG (KUNING = 45 hari)
  // Toleransi 0.5 hari untuk mengakomodasi perbedaan timezone (WIB +7 jam vs UTC)
  const selisihHari = (deadlineBaru.getTime() - waktuSebelumRegrade.getTime()) / (1000 * 60 * 60 * 24);
  if (selisihHari >= 44.5 && selisihHari <= 45.5) {
    pass(
      `Deadline baru = ~${selisihHari.toFixed(2)} hari dari sekarang (expected: 45 hari untuk KUNING) - BENAR`,
    );
  } else {
    fail(`Deadline baru seharusnya ~45 hari dari sekarang, tapi selisih: ${selisihHari.toFixed(2)} hari`);
  }

  // Verifikasi ReportHistory ada dengan gradingLama dan gradingBaru yang benar
  const historyRow = await dbClient.query(
    `SELECT id, actor_id, aksi, perubahan FROM report_histories WHERE report_id = $1 AND aksi = 'REGRADE' ORDER BY timestamp DESC LIMIT 1`,
    [reportId]
  );

  if (historyRow.rows.length === 0) {
    fail(`ReportHistory REGRADE tidak ditemukan di database!`);
    return;
  }

  const history = historyRow.rows[0];
  const perubahan = typeof history.perubahan === 'string' ? JSON.parse(history.perubahan) : history.perubahan;

  console.log(`\n  ReportHistory Database:`);
  console.log(`  actor_id   : ${history.actor_id}`);
  console.log(`  aksi       : ${history.aksi}`);
  console.log(`  perubahan  :`, JSON.stringify(perubahan, null, 4));

  if (history.actor_id === adminId) {
    pass(`actorId di ReportHistory = adminId yang login (${adminId}) - BENAR`);
  } else {
    fail(`actorId seharusnya adminId=${adminId}, tapi: ${history.actor_id}`);
  }

  if (perubahan.gradingLama === 'HIJAU') {
    pass(`gradingLama di perubahan = HIJAU - BENAR`);
  } else {
    fail(`gradingLama seharusnya HIJAU, tapi: ${perubahan.gradingLama}`);
  }

  if (perubahan.gradingBaru === 'KUNING') {
    pass(`gradingBaru di perubahan = KUNING - BENAR`);
  } else {
    fail(`gradingBaru seharusnya KUNING, tapi: ${perubahan.gradingBaru}`);
  }

  if (perubahan.alasan && perubahan.alasan.length > 0) {
    pass(`alasan tersimpan di perubahan: "${perubahan.alasan.substring(0, 50)}..."`);
  } else {
    fail(`alasan tidak tersimpan di perubahan`);
  }
}

async function persiapanLaporanSLA() {
  section('PERSIAPAN: Buat Laporan untuk Uji Coba SLA Job');

  // Laporan 1: Deadline 1 hari dari sekarang (masuk window "mendekat")
  const deadline2Hari = new Date();
  deadline2Hari.setDate(deadline2Hari.getDate() + 1); // 1 hari dari sekarang (dalam window <= 2 hari)

  reportDeadlineMendekatId = await buatLaporanDenganDeadline(
    'Deadline Mendekat (1 hari)',
    deadline2Hari,
    'MERAH'
  );

  // Laporan 2: Deadline kemarin (sudah overdue)
  const deadlineKemarin = new Date();
  deadlineKemarin.setDate(deadlineKemarin.getDate() - 1); // kemarin

  reportOverdueId = await buatLaporanDenganDeadline(
    'Overdue (deadline kemarin)',
    deadlineKemarin,
    'KUNING'
  );

  pass(`Laporan DEADLINE_MENDEKAT: id=${reportDeadlineMendekatId}`);
  pass(`Laporan OVERDUE: id=${reportOverdueId}`);
}

async function testJobSLA(systemUserId) {
  section('TES 2: Panggil SLA Job via HTTP Trigger Endpoint');

  // Panggil endpoint trigger job (POST /admin/jobs/sla-check)
  const jobRes = await fetch(`${API_URL}/admin/jobs/sla-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdmin}`,
    },
  });

  console.log(`\n  HTTP Status Trigger SLA Job: ${jobRes.status}`);
  const jobData = await jobRes.json();
  console.log(`  Response:`, JSON.stringify(jobData, null, 2));

  if (jobRes.status !== 200) {
    fail(`Trigger SLA Job gagal, status: ${jobRes.status}`);
    return;
  }
  pass(`SLA Job trigger berhasil (HTTP 200)`);

  // Tunggu sebentar agar job selesai
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // --- Verifikasi DEADLINE_MENDEKAT ---
  console.log(`\n  [Verifikasi] DEADLINE_MENDEKAT untuk laporan ${reportDeadlineMendekatId}:`);

  const notifMendekatRow = await dbClient.query(
    `SELECT id, user_id, tipe, pesan, created_at FROM notifications
     WHERE user_id = $1 AND tipe = 'DEADLINE_MENDEKAT' AND pesan LIKE '%${reportDeadlineMendekatId.substring(0, 8)}%'
     ORDER BY created_at DESC LIMIT 1`,
    [adminAssignedId]
  );

  // Coba juga tanpa filter pesan (kalau format pesan menggunakan trackingNumber bukan id)
  let notifMendekat = notifMendekatRow.rows[0];
  if (!notifMendekat) {
    // Cari notif terbaru DEADLINE_MENDEKAT untuk admin ini
    const notifMendekatRow2 = await dbClient.query(
      `SELECT id, user_id, tipe, pesan, created_at FROM notifications
       WHERE user_id = $1 AND tipe = 'DEADLINE_MENDEKAT'
       ORDER BY created_at DESC LIMIT 1`,
      [adminAssignedId]
    );
    notifMendekat = notifMendekatRow2.rows[0];
  }

  if (notifMendekat) {
    pass(`Notifikasi DEADLINE_MENDEKAT ditemukan di tabel Notification:`);
    console.log(`    id         : ${notifMendekat.id}`);
    console.log(`    user_id    : ${notifMendekat.user_id}`);
    console.log(`    tipe       : ${notifMendekat.tipe}`);
    console.log(`    pesan      : ${notifMendekat.pesan}`);
    console.log(`    created_at : ${notifMendekat.created_at}`);
  } else {
    fail(`Notifikasi DEADLINE_MENDEKAT TIDAK ditemukan di tabel Notification untuk admin ${adminAssignedId}`);
  }

  // --- Verifikasi AUTO_ESCALATE_OVERDUE ---
  console.log(`\n  [Verifikasi] AUTO_ESCALATE_OVERDUE untuk laporan ${reportOverdueId}:`);

  // Cek status laporan berubah ke OVERDUE
  const statusRow = await dbClient.query(
    `SELECT status FROM reports WHERE id = $1`,
    [reportOverdueId]
  );
  const statusBaru = statusRow.rows[0]?.status;

  console.log(`    Status laporan sekarang: ${statusBaru}`);

  if (statusBaru === 'OVERDUE') {
    pass(`Status laporan berhasil diubah ke OVERDUE`);
  } else {
    fail(`Status laporan seharusnya OVERDUE, tapi: ${statusBaru}`);
  }

  // Cek ReportHistory dengan actorId = system user
  const historyOverdueRow = await dbClient.query(
    `SELECT rh.id, rh.actor_id, rh.aksi, rh.perubahan, u.email as actor_email, u.nama as actor_nama
     FROM report_histories rh
     JOIN users u ON u.id = rh.actor_id
     WHERE rh.report_id = $1 AND rh.aksi = 'AUTO_ESCALATE_OVERDUE'
     ORDER BY rh.timestamp DESC LIMIT 1`,
    [reportOverdueId]
  );

  if (historyOverdueRow.rows.length === 0) {
    fail(`ReportHistory AUTO_ESCALATE_OVERDUE TIDAK ditemukan untuk laporan ${reportOverdueId}`);
  } else {
    const histOverdue = historyOverdueRow.rows[0];
    const perubahanOverdue = typeof histOverdue.perubahan === 'string'
      ? JSON.parse(histOverdue.perubahan)
      : histOverdue.perubahan;

    console.log(`\n    ReportHistory AUTO_ESCALATE_OVERDUE:`);
    console.log(`    id           : ${histOverdue.id}`);
    console.log(`    actor_id     : ${histOverdue.actor_id}`);
    console.log(`    actor_email  : ${histOverdue.actor_email}`);
    console.log(`    actor_nama   : ${histOverdue.actor_nama}`);
    console.log(`    aksi         : ${histOverdue.aksi}`);
    console.log(`    perubahan    :`, JSON.stringify(perubahanOverdue, null, 6));

    if (histOverdue.actor_id === systemUserId) {
      pass(`actorId di ReportHistory = system user id (${systemUserId}) - BUKAN admin biasa - BENAR`);
    } else {
      fail(`actorId seharusnya system user id=${systemUserId}, tapi: ${histOverdue.actor_id}`);
    }

    if (histOverdue.actor_email === 'system@smartrose.internal') {
      pass(`actor_email = system@smartrose.internal - BENAR`);
    } else {
      fail(`actor_email seharusnya system@smartrose.internal, tapi: ${histOverdue.actor_email}`);
    }
  }

  // Cek notifikasi DEADLINE_LEWAT
  const notifLewatRow = await dbClient.query(
    `SELECT id, user_id, tipe, pesan, created_at FROM notifications
     WHERE user_id = $1 AND tipe = 'DEADLINE_LEWAT'
     ORDER BY created_at DESC LIMIT 1`,
    [adminAssignedId]
  );

  if (notifLewatRow.rows.length > 0) {
    const notifLewat = notifLewatRow.rows[0];
    pass(`Notifikasi DEADLINE_LEWAT ditemukan di tabel Notification:`);
    console.log(`    id         : ${notifLewat.id}`);
    console.log(`    user_id    : ${notifLewat.user_id}`);
    console.log(`    tipe       : ${notifLewat.tipe}`);
    console.log(`    pesan      : ${notifLewat.pesan}`);
    console.log(`    created_at : ${notifLewat.created_at}`);
  } else {
    fail(`Notifikasi DEADLINE_LEWAT TIDAK ditemukan untuk admin ${adminAssignedId}`);
  }
}

async function main() {
  console.log('\n====================================================');
  console.log('  TEST FASE 4: Regrading, SLA Deadline, Cron Job');
  console.log('====================================================');
  console.log(`  Timestamp : ${new Date().toISOString()}`);
  console.log(`  API URL   : ${API_URL}`);
  console.log(`  DB URL    : ${DB_URL}\n`);

  try {
    const systemUserId = await setup();
    await testRegrading(systemUserId);
    await persiapanLaporanSLA();
    await testJobSLA(systemUserId);

    section('RINGKASAN');
    if (process.exitCode === 1) {
      console.log('  BEBERAPA TES GAGAL. Lihat output [FAIL] di atas.');
    } else {
      console.log('  SEMUA TES BERHASIL!');
    }
  } catch (err) {
    console.error('\n  ERROR TIDAK TERDUGA:', err);
    process.exitCode = 1;
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
  }
}

main();
