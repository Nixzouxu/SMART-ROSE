/**
 * Test script: Revisi Pelaporan Publik Tanpa Login
 *
 * 17 Skenario:
 *  1.  GET /captcha — dapatkan token captcha baru
 *  2.  POST /reports — laporan publik tanpa login (captcha valid) => 201
 *  3.  POST /reports — tanpa captchaToken => 400
 *  4.  POST /reports — replay attack (token sudah dipakai) => 400
 *  5.  POST /reports — jawaban captcha salah => 400
 *  6.  GET /reports/track/:trackingNumber — lacak laporan publik => 200
 *  7.  POST /reports/:id/attachments — upload jpg TANPA Authorization => 201
 *  8.  POST /reports/:id/attachments — upload .txt (tipe tidak diizinkan) => 400
 *  9.  POST /reports/:id/attachments — upload file >5MB => 400
 * 10.  POST /chatbot/public/ask — chatbot TANPA login => 200
 * 11.  POST /chatbot/public/ask — pertanyaan terlalu pendek => 400
 * 12.  Regresi GET /reports/me dengan token user => 200
 * 13.  GET /reports/me TANPA token => 401
 * 14.  [BARU] Rate limit: POST /reports dipanggil >5x berturut-turut => 429
 * 15.  [BARU] Chatbot publik dengan pertanyaan tidak match => MENUNGGU_ADMIN,
 *      userId=null di DB, notifikasi masuk ke tabel ADMIN/ADMIN_UTAMA
 * 16.  [BARU] Admin login via OTP (alur lengkap Fase 2), jawab pertanyaan
 *      anonim dari skenario 15 via PUT /admin/chatbot/:logId/answer =>
 *      statusEskalasi=DIJAWAB_ADMIN, tidak error meski userId=null
 * 17.  [BARU] Regresi penuh alur OTP admin: POST /auth/login =>
 *      requiresOtp=true => POST /auth/login/otp => dapat accessToken
 */

import pg from 'pg';
import Redis from 'ioredis';

const { Client } = pg;
const API_URL = 'http://localhost:4000/api';

let passed = 0;
let failed = 0;

// Fungsi helper untuk menghasilkan header X-Forwarded-For dengan IP acak
// Ini digunakan untuk mem-bypass rate-limiter (5 req/15 mnt) selama testing,
// KECUALI untuk skenario 14 yang memang bertugas menguji rate-limiter.
function getSpoofHeaders(ip) {
  return {
    'X-Forwarded-For': ip || `192.168.1.${Math.floor(Math.random() * 255)}`,
  };
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' → ' + detail : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TEST: Revisi Pelaporan Publik Tanpa Login (17 skenario)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const dbClient = new Client({
    connectionString: 'postgresql://smartrose:smartrosedev123@127.0.0.1:5433/smartrose_dev',
  });
  await dbClient.connect();
  console.log('✓ Database terhubung\n');

  // ===========================================================
  // SETUP: Buat Admin untuk skenario 15-17
  // ===========================================================
  const ts = Date.now();
  const emailAdmin = `admin_revisi_${ts}@test.com`;
  const password = 'Password123!';

  console.log(`[SETUP] Register Admin (${emailAdmin})`);
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama: 'Admin Test Revisi',
      email: emailAdmin,
      password,
      noPegawai: `ADM-${ts}`,
      unitKerja: 'DIREKSI',
    }),
  });
  await dbClient.query(
    `UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN_UTAMA' WHERE email = $1`,
    [emailAdmin],
  );
  console.log(`  → Admin dibuat dan diapprove di DB (role=ADMIN_UTAMA)\n`);

  // ===========================================================
  // SKENARIO 1: GET /captcha
  // ===========================================================
  console.log('[1] GET /captcha — Dapatkan token captcha baru');
  const captchaRes = await fetch(`${API_URL}/captcha`, { headers: getSpoofHeaders() });
  const captchaData = await captchaRes.json();
  check('Status 200', captchaRes.status === 200, `status: ${captchaRes.status}`);
  check('Ada field token (UUID)', !!captchaData.data?.token);
  check('Ada field pertanyaan', !!captchaData.data?.pertanyaan);

  const captchaToken1 = captchaData.data?.token;
  const pertanyaan1 = captchaData.data?.pertanyaan;
  const match1 = pertanyaan1?.match(/(\d+)\s*\+\s*(\d+)/);
  const jawabanBenar1 = match1 ? String(parseInt(match1[1]) + parseInt(match1[2])) : null;
  console.log(`  → Token: ${captchaToken1}`);
  console.log(`  → Soal: ${pertanyaan1}`);
  console.log(`  → Jawaban benar: ${jawabanBenar1}`);

  const reportPayload = {
    jenisInsiden: 'KTD',
    tanggalKejadian: new Date().toISOString(),
    lokasi: 'IGD Lantai 1',
    unitKerja: 'IGD',
    kronologi:
      'Pasien jatuh dari ranjang saat perawat tidak ada di ruangan. Kondisi terjadi saat pergantian shift pagi.',
    dampak: 'Luka memar ringan di lutut kiri',
    gradingAwal: 'BIRU',
  };

  // ===========================================================
  // SKENARIO 2: POST /reports publik, captcha valid => 201
  // ===========================================================
  console.log('\n[2] POST /reports — Laporan publik TANPA login (captcha valid)');
  const createRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSpoofHeaders() },
    body: JSON.stringify({
      ...reportPayload,
      captchaToken: captchaToken1,
      captchaJawaban: jawabanBenar1,
    }),
  });
  const createData = await createRes.json();
  check('Status 201', createRes.status === 201, `status: ${createRes.status}, msg: ${createData.message}`);
  check('Ada trackingNumber', !!createData.data?.trackingNumber);
  check('isAnonim = true', createData.data?.isAnonim === true);
  check('status = SUBMITTED', createData.data?.status === 'SUBMITTED');
  check('pelaporId = null', createData.data?.pelaporId === null);

  const reportId = createData.data?.id;
  const trackingNumber = createData.data?.trackingNumber;
  console.log(`  → Report ID: ${reportId}`);
  console.log(`  → Tracking Number: ${trackingNumber}`);

  // ===========================================================
  // SKENARIO 3: Tanpa captchaToken => 400
  // ===========================================================
  console.log('\n[3] POST /reports — Tanpa captchaToken => 400');
  const noCaptchaRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSpoofHeaders() },
    body: JSON.stringify(reportPayload),
  });
  const noCaptchaData = await noCaptchaRes.json();
  check('Status 400', noCaptchaRes.status === 400, `status: ${noCaptchaRes.status}`);
  check('Ada pesan error validasi', !!noCaptchaData.message);
  console.log(`  → Pesan: ${noCaptchaData.message}`);

  // ===========================================================
  // SKENARIO 4: Replay attack (token sudah dipakai) => 400
  // ===========================================================
  console.log('\n[4] POST /reports — Replay attack (token sudah dipakai) => 400');
  const replayRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSpoofHeaders() },
    body: JSON.stringify({
      ...reportPayload,
      captchaToken: captchaToken1,
      captchaJawaban: jawabanBenar1,
    }),
  });
  const replayData = await replayRes.json();
  check('Status 400', replayRes.status === 400, `status: ${replayRes.status}`);
  check(
    'Pesan token tidak valid/kadaluarsa',
    replayData.message?.includes('tidak valid') || replayData.message?.includes('kadaluarsa'),
  );
  console.log(`  → Pesan: ${replayData.message}`);

  // ===========================================================
  // SKENARIO 5: Jawaban captcha salah => 400
  // ===========================================================
  console.log('\n[5] POST /reports — Jawaban captcha salah => 400');
  const captchaRes5 = await fetch(`${API_URL}/captcha`, { headers: getSpoofHeaders() });
  const captchaData5 = await captchaRes5.json();
  const captchaToken5 = captchaData5.data?.token;

  const wrongRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSpoofHeaders() },
    body: JSON.stringify({
      ...reportPayload,
      captchaToken: captchaToken5,
      captchaJawaban: '9999',
    }),
  });
  const wrongData = await wrongRes.json();
  check('Status 400', wrongRes.status === 400, `status: ${wrongRes.status}`);
  check('Pesan jawaban salah', wrongData.message?.includes('salah'));
  console.log(`  → Pesan: ${wrongData.message}`);

  // ===========================================================
  // SKENARIO 6: GET /track/:trackingNumber => 200
  // ===========================================================
  console.log(`\n[6] GET /reports/track/${trackingNumber} — Lacak laporan publik`);
  const trackRes = await fetch(`${API_URL}/reports/track/${trackingNumber}`, { headers: getSpoofHeaders() });
  const trackData = await trackRes.json();
  check('Status 200', trackRes.status === 200, `status: ${trackRes.status}`);
  check('Tracking number cocok', trackData.data?.trackingNumber === trackingNumber);
  check('Status SUBMITTED', trackData.data?.status === 'SUBMITTED');
  check('pelaporId tidak tampil di response publik', trackData.data?.pelaporId === undefined);
  console.log(`  → Data:`, JSON.stringify(trackData.data, null, 4).replace(/^/gm, '    '));

  // ===========================================================
  // SKENARIO 7: Upload lampiran (jpg/png) TANPA Authorization => 201
  // ===========================================================
  console.log(`\n[7] POST /reports/${reportId}/attachments — Upload png TANPA auth`);
  const pngBuffer = Buffer.from(
    '89504E470D0A1A0A0000000D49484452000000010000000108020000009001' +
      '2E00000000C49444154789C6260000000020001E221BC330000000049454E44AE426082',
    'hex',
  );
  const formData7 = new FormData();
  formData7.append('file', new Blob([pngBuffer], { type: 'image/png' }), 'bukti.png');
  const attachRes = await fetch(`${API_URL}/reports/${reportId}/attachments`, {
    method: 'POST',
    headers: getSpoofHeaders(),
    body: formData7,
  });
  const attachData = await attachRes.json();
  check('Status 201', attachRes.status === 201, `status: ${attachRes.status}, msg: ${JSON.stringify(attachData)}`);
  check('Ada fileUrl', !!attachData.data?.fileUrl);
  check('tipeFile = PNG', attachData.data?.tipeFile === 'PNG');
  console.log(`  → File URL: ${attachData.data?.fileUrl}`);

  // ===========================================================
  // SKENARIO 8: Upload .txt (tipe tidak diizinkan) => 400
  // ===========================================================
  console.log(`\n[8] POST /reports/${reportId}/attachments — Upload .txt => 400`);
  const formData8 = new FormData();
  formData8.append('file', new Blob(['isi file text'], { type: 'text/plain' }), 'catatan.txt');
  const attachTxtRes = await fetch(`${API_URL}/reports/${reportId}/attachments`, {
    method: 'POST',
    headers: getSpoofHeaders(),
    body: formData8,
  });
  const attachTxtData = await attachTxtRes.json();
  check('Status 400', attachTxtRes.status === 400, `status: ${attachTxtRes.status}`);
  check(
    'Pesan tipe tidak diizinkan',
    attachTxtData.message?.includes('diizinkan') || attachTxtData.message?.includes('Tipe'),
  );
  console.log(`  → Pesan: ${attachTxtData.message}`);

  // ===========================================================
  // SKENARIO 9: Upload file >5MB => 400
  // ===========================================================
  console.log(`\n[9] POST /reports/${reportId}/attachments — Upload >5MB => 400`);
  const bigBuffer = Buffer.alloc(5.1 * 1024 * 1024, 0x78);
  const formData9 = new FormData();
  formData9.append('file', new Blob([bigBuffer], { type: 'image/jpeg' }), 'besar.jpg');
  const attachBigRes = await fetch(`${API_URL}/reports/${reportId}/attachments`, {
    method: 'POST',
    headers: getSpoofHeaders(),
    body: formData9,
  });
  const attachBigData = await attachBigRes.json();
  check(
    'Status 400 atau 413 (file terlalu besar)',
    attachBigRes.status === 400 || attachBigRes.status === 413,
    `status: ${attachBigRes.status}`,
  );
  console.log(`  → Status: ${attachBigRes.status}, Pesan: ${attachBigData.message}`);

  // ===========================================================
  // SKENARIO 10: POST /chatbot/public/ask TANPA login => 200
  // ===========================================================
  console.log('\n[10] POST /chatbot/public/ask — Chatbot TANPA login');
  const chatbotRes10 = await fetch(`${API_URL}/chatbot/public/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSpoofHeaders() },
    body: JSON.stringify({ pertanyaan: 'Bagaimana cara melaporkan insiden?' }),
  });
  const chatbotData10 = await chatbotRes10.json();
  check('Status 200', chatbotRes10.status === 200, `status: ${chatbotRes10.status}`);
  check('Ada jawaban', !!chatbotData10.data?.jawaban);
  check('Ada logId', !!chatbotData10.data?.logId);
  console.log(`  → Sumber: ${chatbotData10.data?.sumber}`);
  console.log(`  → Jawaban: ${String(chatbotData10.data?.jawaban).substring(0, 80)}...`);

  // ===========================================================
  // SKENARIO 11: Pertanyaan terlalu pendek => 400
  // ===========================================================
  console.log('\n[11] POST /chatbot/public/ask — Pertanyaan terlalu pendek => 400');
  const shortRes = await fetch(`${API_URL}/chatbot/public/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSpoofHeaders() },
    body: JSON.stringify({ pertanyaan: 'Hi' }),
  });
  const shortData = await shortRes.json();
  check('Status 400', shortRes.status === 400, `status: ${shortRes.status}`);
  console.log(`  → Pesan: ${shortData.message}`);

  // ===========================================================
  // SKENARIO 12: GET /reports/me dengan token => 200 (regresi)
  // ===========================================================
  console.log('\n[12] Regresi: GET /reports/me dengan token user biasa => 200');
  const emailUser = `user_revisi_${ts}@test.com`;
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama: 'User Test Revisi',
      email: emailUser,
      password,
      noPegawai: `USR-${ts}`,
      unitKerja: 'IGD',
    }),
  });
  await dbClient.query(
    `UPDATE users SET status_verifikasi = 'APPROVED' WHERE email = $1`,
    [emailUser],
  );
  const loginUserRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailUser, password }),
  });
  const loginUserData = await loginUserRes.json();
  const userToken = loginUserData.data?.accessToken;
  check('Login user berhasil', !!userToken);
  const myReportsRes = await fetch(`${API_URL}/reports/me`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  check('GET /reports/me => 200', myReportsRes.status === 200, `status: ${myReportsRes.status}`);

  // ===========================================================
  // SKENARIO 13: GET /reports/me TANPA token => 401
  // ===========================================================
  console.log('\n[13] GET /reports/me TANPA token => 401 (endpoint masih private)');
  const noAuthRes = await fetch(`${API_URL}/reports/me`);
  check('Status 401', noAuthRes.status === 401, `status: ${noAuthRes.status}`);
  const noAuthData = await noAuthRes.json();
  console.log(`  → Pesan: ${noAuthData.message}`);

  // ===========================================================
  // SKENARIO 14 [BARU]: Rate limit POST /reports >5x berturut => 429
  // ===========================================================
  console.log('\n[14] Rate limit: POST /reports dipanggil >5x berturut-turut => 429');
  console.log('  (Mendapatkan 5 token captcha untuk 5 request valid, lalu 1 request ke-6)');

  let rateLimitHit = false;
  let lastStatus = 0;
  
  // Gunakan IP Statis KHUSUS untuk skenario ini agar limit 5 per IP ter-trigger
  const staticIp = '10.0.0.99';

  // Kirim 6 request berturut-turut; setelah limit=5 tercapai, ke-6 harus 429
  for (let i = 1; i <= 6; i++) {
    // Dapatkan token captcha baru tiap request agar tidak ditolak karena captcha
    const capRes = await fetch(`${API_URL}/captcha`, { headers: getSpoofHeaders(staticIp) });
    
    // Jika GET /captcha saja sudah kena 429 (karena hitungannya digabung semua rute publik)
    if (capRes.status === 429) {
       rateLimitHit = true;
       lastStatus = 429;
       console.log(`  → Request ke-${i} (GET /captcha): status 429`);
       break;
    }
    
    const capData = await capRes.json();
    const token = capData.data?.token;
    const soal = capData.data?.pertanyaan;
    const soalMatch = soal?.match(/(\d+)\s*\+\s*(\d+)/);
    const jawaban = soalMatch ? String(parseInt(soalMatch[1]) + parseInt(soalMatch[2])) : '0';

    const r = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getSpoofHeaders(staticIp) },
      body: JSON.stringify({
        ...reportPayload,
        captchaToken: token,
        captchaJawaban: jawaban,
      }),
    });
    lastStatus = r.status;
    console.log(`  → Request ke-${i} (POST /reports): status ${r.status}`);
    if (r.status === 429) {
      rateLimitHit = true;
      const rlData = await r.json();
      console.log(`  → Pesan 429: ${rlData.message}`);
      break;
    }
  }

  check(
    'Rate limit 429 tercapai setelah lebih dari 5 request',
    rateLimitHit,
    `status terakhir: ${lastStatus}`,
  );

  // ===========================================================
  // SKENARIO 15 [BARU]: Chatbot publik tidak match => MENUNGGU_ADMIN,
  // userId=null, notifikasi masuk ke tabel
  // ===========================================================
  console.log('\n[15] Chatbot publik dengan pertanyaan tidak match => MENUNGGU_ADMIN + notifikasi admin');

  // Pertanyaan yang pasti tidak ada di knowledge base
  const pertanyaanUnik = `xyz_tidak_ada_di_kb_${ts}_test_eskalasi_publik`;
  const chatbotRes15 = await fetch(`${API_URL}/chatbot/public/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSpoofHeaders() },
    body: JSON.stringify({ pertanyaan: pertanyaanUnik }),
  });
  const chatbotData15 = await chatbotRes15.json();
  check('Status 200', chatbotRes15.status === 200, `status: ${chatbotRes15.status}`);
  check('Sumber = ESKALASI', chatbotData15.data?.sumber === 'ESKALASI');
  check('Ada logId', !!chatbotData15.data?.logId);

  const escalatedLogId = chatbotData15.data?.logId;
  console.log(`  → LogId yang dieskalasi: ${escalatedLogId}`);

  // Verifikasi di DB: statusEskalasi=MENUNGGU_ADMIN dan userId=null
  if (escalatedLogId) {
    const logRow = await dbClient.query(
      'SELECT user_id, status_eskalasi FROM chatbot_logs WHERE id = $1',
      [escalatedLogId],
    );
    check(
      'ChatbotLog.statusEskalasi = MENUNGGU_ADMIN di DB',
      logRow.rows[0]?.status_eskalasi === 'MENUNGGU_ADMIN',
      `nilai: ${logRow.rows[0]?.status_eskalasi}`,
    );
    check(
      'ChatbotLog.userId = NULL di DB (pelapor anonim)',
      logRow.rows[0]?.user_id === null,
      `nilai: ${logRow.rows[0]?.user_id}`,
    );
  }

  // Verifikasi notifikasi masuk ke admin/admin_utama
  const notifRows = await dbClient.query(
    `SELECT n.user_id, u.role FROM notifications n
     JOIN users u ON n.user_id = u.id
     WHERE n.pesan = $1 AND u.role IN ('ADMIN', 'ADMIN_UTAMA')
     ORDER BY n.created_at DESC LIMIT 10`,
    ['Pertanyaan Chatbot baru menunggu jawaban dari Anda.'],
  );
  check(
    'Notifikasi masuk ke tabel notifications untuk ADMIN/ADMIN_UTAMA',
    notifRows.rows.length > 0,
    `jumlah notifikasi: ${notifRows.rows.length}`,
  );
  console.log(`  → Notifikasi diterima oleh ${notifRows.rows.length} admin:`);
  notifRows.rows.forEach((r) => console.log(`    user_id=${r.user_id} role=${r.role}`));

  // ===========================================================
  // SKENARIO 16 [BARU]: Admin login via OTP (alur lengkap Fase 2),
  // jawab pertanyaan anonim dari skenario 15
  // ===========================================================
  console.log('\n[16] Admin login via OTP (alur Fase 2) lalu jawab pertanyaan anonim skenario 15');

  // Langkah 16.1: POST /auth/login => harus requiresOtp=true
  console.log('  [16.1] POST /auth/login dengan akun admin');
  const loginAdminStep1 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailAdmin, password }),
  });
  const loginAdminData1 = await loginAdminStep1.json();
  check('Status 200', loginAdminStep1.status === 200, `status: ${loginAdminStep1.status}`);
  check(
    'requiresOtp = true (admin harus lewat OTP)',
    loginAdminData1.data?.requiresOtp === true,
    `data: ${JSON.stringify(loginAdminData1.data)}`,
  );
  console.log(`  → requiresOtp: ${loginAdminData1.data?.requiresOtp}`);
  console.log(`  → (Belum ada accessToken di sini, masih menunggu OTP)`);

  // Langkah 16.2: Ambil OTP dari Redis (seperti di test-fase3.mjs)
  let adminToken = null;
  if (loginAdminData1.data?.requiresOtp) {
    const redisClient = new Redis();
    const otp = await redisClient.get(`otp:${emailAdmin}`);
    await redisClient.quit();
    check('OTP ditemukan di Redis', !!otp, `otp: ${otp}`);
    console.log(`  [16.2] OTP dari Redis: ${otp}`);

    // Langkah 16.3: POST /auth/login/otp
    const loginAdminStep2 = await fetch(`${API_URL}/auth/login/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAdmin, otp }),
    });
    const loginAdminData2 = await loginAdminStep2.json();
    check('Status 200 setelah OTP', loginAdminStep2.status === 200, `status: ${loginAdminStep2.status}`);
    check('Ada accessToken setelah OTP', !!loginAdminData2.data?.accessToken);
    adminToken = loginAdminData2.data?.accessToken;
    console.log(`  [16.3] Admin token didapat: ${adminToken ? adminToken.substring(0, 30) + '...' : 'GAGAL'}`);
  }

  // Langkah 16.4: Admin jawab pertanyaan anonim dari skenario 15
  console.log(`  [16.4] PUT /admin/chatbot/${escalatedLogId}/answer`);
  if (escalatedLogId && adminToken) {
    const answerRes = await fetch(`${API_URL}/admin/chatbot/${escalatedLogId}/answer`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        jawaban:
          'Untuk melaporkan insiden, Anda dapat menggunakan form pelaporan publik di halaman utama aplikasi ini.',
      }),
    });
    const answerData = await answerRes.json();
    check('Status 200 (admin berhasil menjawab)', answerRes.status === 200, `status: ${answerRes.status}, msg: ${answerData.message}`);
    check(
      'statusEskalasi berubah menjadi DIJAWAB_ADMIN',
      answerData.data?.statusEskalasi === 'DIJAWAB_ADMIN' || answerData.data?.status_eskalasi === 'DIJAWAB_ADMIN',
      `data: ${JSON.stringify(answerData.data)}`,
    );
    console.log(`  → statusEskalasi: ${answerData.data?.statusEskalasi || answerData.data?.status_eskalasi}`);

    // Verifikasi di DB
    const logRowAfter = await dbClient.query(
      'SELECT user_id, status_eskalasi, jawaban FROM chatbot_logs WHERE id = $1',
      [escalatedLogId],
    );
    check(
      'DB: statusEskalasi = DIJAWAB_ADMIN',
      logRowAfter.rows[0]?.status_eskalasi === 'DIJAWAB_ADMIN',
      `nilai: ${logRowAfter.rows[0]?.status_eskalasi}`,
    );
    check(
      'DB: userId masih NULL setelah dijawab (tidak ada error karena null)',
      logRowAfter.rows[0]?.user_id === null,
      `user_id: ${logRowAfter.rows[0]?.user_id}`,
    );
    check('DB: jawaban tersimpan', !!logRowAfter.rows[0]?.jawaban);
  } else {
    console.log("  ❌ Gagal menjalankan 16.4 karena eskalasi gagal atau admin token tidak ada");
  }

  // ===========================================================
  // SKENARIO 17 [BARU]: Regresi penuh alur OTP admin
  // Konfirmasi tidak ada error, alur masih berfungsi
  // ===========================================================
  console.log('\n[17] Regresi alur OTP admin — konfirmasi semua langkah masih berfungsi normal');
  const emailAdmin17 = `admin_regresi_otp_${ts}@test.com`;
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama: 'Admin Regresi OTP',
      email: emailAdmin17,
      password,
      noPegawai: `ADM17-${ts}`,
      unitKerja: 'DIREKSI',
    }),
  });
  await dbClient.query(
    `UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN' WHERE email = $1`,
    [emailAdmin17],
  );

  // Step 17.1: Login => requiresOtp
  const loginRes17a = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailAdmin17, password }),
  });
  const loginData17a = await loginRes17a.json();
  check('[17] Login admin => status 200', loginRes17a.status === 200, `status: ${loginRes17a.status}`);
  check('[17] requiresOtp = true', loginData17a.data?.requiresOtp === true);
  console.log(`  → requiresOtp: ${loginData17a.data?.requiresOtp}`);

  // Step 17.2: Ambil OTP dari Redis
  const redis17 = new Redis();
  const otp17 = await redis17.get(`otp:${emailAdmin17}`);
  await redis17.quit();
  check('[17] OTP tersedia di Redis', !!otp17, `otp: ${otp17}`);
  console.log(`  → OTP: ${otp17}`);

  // Step 17.3: Verifikasi OTP
  const loginRes17b = await fetch(`${API_URL}/auth/login/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailAdmin17, otp: otp17 }),
  });
  const loginData17b = await loginRes17b.json();
  check('[17] OTP verifikasi => status 200', loginRes17b.status === 200, `status: ${loginRes17b.status}`);
  check('[17] accessToken didapat setelah OTP', !!loginData17b.data?.accessToken);
  check('[17] Tidak ada requiresOtp lagi', loginData17b.data?.requiresOtp === undefined);
  console.log(`  → accessToken: ${loginData17b.data?.accessToken ? loginData17b.data.accessToken.substring(0, 30) + '...' : 'GAGAL'}`);
  console.log(`  → Alur OTP admin selesai dan berfungsi normal`);

  // ===========================================================
  // RINGKASAN
  // ===========================================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   HASIL: ${passed} PASS, ${failed} FAIL (dari ${passed + failed} total)`);
  console.log('═══════════════════════════════════════════════════════════');

  await dbClient.end();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('\n❌ ERROR TIDAK TERDUGA:', err);
  process.exit(1);
});
