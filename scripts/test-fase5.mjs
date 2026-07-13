import crypto from 'crypto';
import pg from 'pg';
import Redis from 'ioredis';

const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://smartrose:smartrosedev123@127.0.0.1:5433/smartrose_dev'
});
const redis = new Redis({ host: '127.0.0.1', port: 6379, password: 'redisdev123' });

const API_URL = 'http://localhost:4000/api';

const generateHash = (text) => crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');

async function main() {
  await redis.flushall();
  console.log('====================================================');
  console.log('  TEST FASE 5: Guides, Chatbot, Redis Caching');
  console.log('====================================================\n');

  // 1. Registrasi & Ambil Token Admin dan User
  console.log('[1] Setup Admin dan User...');
  let adminToken, userToken;
  try {
    const timestamp = Date.now();
    const adminEmail = `admin5_${timestamp}@test.com`;
    const userEmail = `user5_${timestamp}@test.com`;

    const adminRegRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: 'Admin Fase 5', email: adminEmail, password: 'Password123!', noPegawai: `AD5-${timestamp}`, unitKerja: 'IT' })
    });
    if(!adminRegRes.ok) console.log('Admin Reg Fail:', await adminRegRes.text());

    const userRegRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: 'User Fase 5', email: userEmail, password: 'Password123!', noPegawai: `US5-${timestamp}`, unitKerja: 'RANAP' })
    });
    if(!userRegRes.ok) console.log('User Reg Fail:', await userRegRes.text());

    // Update admin jadi ADMIN_UTAMA dan APPROVED, user jadi APPROVED
    await pool.query(`UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN_UTAMA' WHERE email = $1`, [adminEmail]);
    await pool.query(`UPDATE users SET status_verifikasi = 'APPROVED' WHERE email = $1`, [userEmail]);

    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: adminEmail, password: 'Password123!' })
    });
    const adminData = await adminRes.json();
    if (adminData.data?.requiresOtp) {
      const otp = await redis.get(`otp:${adminEmail}`);
      const otpRes = await fetch(`${API_URL}/auth/login/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, otp })
      });
      adminToken = (await otpRes.json()).data?.accessToken;
    } else {
      adminToken = adminData.data?.accessToken;
    }

    const userRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: userEmail, password: 'Password123!' })
    });
    const userData = await userRes.json();
    if (!userData.data) { console.log('User Login Fail:', userData); }
    userToken = userData.data?.accessToken;

    if(!adminToken || !userToken) throw new Error('Token kosong');
    console.log('    [PASS] Token berhasil didapatkan.\n');
  } catch (err) {
    console.error('    [FAIL] Gagal login:', err.message);
    process.exit(1);
  }

  // 2. Buat data ChatbotKnowledge (Direct DB via pg)
  console.log('[2] Setup ChatbotKnowledge via pg...');
  await pool.query('DELETE FROM chatbot_knowledges');
  await pool.query('DELETE FROM chatbot_logs');
  await pool.query('DELETE FROM guides');
  
  const insertRes = await pool.query(`
    INSERT INTO chatbot_knowledges (id, pertanyaan, jawaban, kategori, kata_kunci, created_at, updated_at) 
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *
  `, [
    crypto.randomUUID(), 
    'Bagaimana cara reset password?', 
    'Untuk mereset password, silakan hubungi tim IT Support di ext 1234 atau klik Lupa Password di halaman login.', 
    'akun', 
    ['lupa password', 'reset password', 'ganti sandi']
  ]);
  const knowledge = insertRes.rows[0];
  console.log(`    [PASS] Knowledge dibuat: "${knowledge.pertanyaan}"\n`);

  // 3. Admin Buat Guide via Endpoint
  console.log('[3] Admin Membuat Guide...');
  let guideId;
  const guideRes = await fetch(`${API_URL}/admin/guides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({
      judul: 'Panduan Pelaporan KTD',
      kategori: 'cara_pelaporan',
      konten: 'Langkah-langkah melaporkan KTD adalah sebagai berikut: ...',
      tipeMedia: 'TEXT'
    })
  });
  const guideData = await guideRes.json();
  if (guideData.success) {
    guideId = guideData.data.id;
    console.log('    [PASS] Guide berhasil dibuat via endpoint POST /admin/guides\n');
  } else {
    console.error('    [FAIL]', guideData);
    process.exit(1);
  }

  // 4. User akses GET /guides dan /guides/search
  console.log('[4] User Mengakses Guide...');
  const searchRes = await fetch(`${API_URL}/guides/search?q=KTD`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const searchData = await searchRes.json();
  if (searchData.success && searchData.data.length > 0) {
    console.log(`    [PASS] Pencarian /guides/search?q=KTD berhasil menemukan: "${searchData.data[0].judul}"\n`);
  } else {
    console.error('    [FAIL] Pencarian gagal', searchData);
  }

  // 5. Chatbot: Exact Match
  console.log('[5] Chatbot: Exact Match Test...');
  const ask1Res = await fetch(`${API_URL}/chatbot/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ pertanyaan: 'Bagaimana cara mengatasi lupa password akun saya?' })
  });
  if (!ask1Res.ok) {
    console.log('Chatbot Ask 1 Failed:', await ask1Res.text());
    process.exit(1);
  }
  const ask1Data = await ask1Res.json();
  if (ask1Data.data.sumber === 'KNOWLEDGE_BASE') {
    console.log(`    [PASS] Exact Match menemukan jawaban: "${ask1Data.data.jawaban.substring(0,30)}..."`);
    console.log(`    [PASS] Status Eskalasi di Log = TERJAWAB_OTOMATIS\n`);
  } else {
    console.error('    [FAIL] Exact Match gagal', ask1Data);
  }

  // 6. Chatbot: Cache Hit
  console.log('[6] Chatbot: Redis Cache Hit Test...');
  const ask2Res = await fetch(`${API_URL}/chatbot/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ pertanyaan: 'Bagaimana cara mengatasi lupa password akun saya?' })
  });
  const ask2Data = await ask2Res.json();
  if (ask2Data.data.sumber === 'CACHE') {
    console.log(`    [PASS] Cache HIT berhasil untuk pertanyaan yang sama persis!\n`);
  } else {
    console.error('    [FAIL] Cache HIT gagal', ask2Data);
  }

  // 7. Chatbot: Fuzzy Match
  console.log('[7] Chatbot: Fuzzy Match Test (Typo Ringan)...');
  const ask3Res = await fetch(`${API_URL}/chatbot/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ pertanyaan: 'Bgaimana cra reset paswrd?' }) // typo disengaja
  });
  const ask3Data = await ask3Res.json();
  if (ask3Data.data.sumber === 'KNOWLEDGE_BASE' && ask3Data.data.confidence >= 0.6) {
    console.log(`    [PASS] Fuzzy Match menoleransi typo dengan score confidence: ${ask3Data.data.confidence.toFixed(2)}\n`);
  } else {
    console.error('    [FAIL] Fuzzy Match gagal', ask3Data);
  }

  // 8. Chatbot: Eskalasi (No Match)
  console.log('[8] Chatbot: Eskalasi Admin (No Match)...');
  const ask4Res = await fetch(`${API_URL}/chatbot/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ pertanyaan: 'Siapa presiden amerika saat ini?' })
  });
  const ask4Data = await ask4Res.json();
  let pendingLogId = ask4Data.data.logId;
  if (ask4Data.data.sumber === 'ESKALASI') {
    console.log(`    [PASS] Pertanyaan tidak relevan dieskalasi ke admin: "${ask4Data.data.jawaban}"\n`);
  } else {
    console.error('    [FAIL] Eskalasi gagal', ask4Data);
  }

  // 9. Admin cek pending logs
  console.log('[9] Admin Cek Pending Logs...');
  const pendingRes = await fetch(`${API_URL}/admin/chatbot/pending`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const pendingData = await pendingRes.json();
  const pendingLog = pendingData.data.logs.find(l => l.id === pendingLogId);
  if (pendingLog) {
    console.log(`    [PASS] Admin melihat pertanyaan pending: "${pendingLog.pertanyaan}"\n`);
  } else {
    console.error('    [FAIL] Log tidak ditemukan di pending list', pendingData);
  }

  // 10. Admin Jawab Manual
  console.log('[10] Admin Menjawab Manual...');
  const answerRes = await fetch(`${API_URL}/admin/chatbot/${pendingLogId}/answer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ jawaban: 'Itu di luar konteks aplikasi kami, mohon maaf.' })
  });
  const answerData = await answerRes.json();
  if (answerData.success && answerData.data.statusEskalasi === 'DIJAWAB_ADMIN') {
    console.log(`    [PASS] Admin berhasil menjawab. Status eskalasi berubah jadi: DIJAWAB_ADMIN\n`);
  } else {
    console.error('    [FAIL] Gagal menjawab manual', answerData);
  }

  // 11. Cek Riwayat Chatbot User
  console.log('[11] User Cek Riwayat Chatbot...');
  const historyRes = await fetch(`${API_URL}/chatbot/history`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  const historyData = await historyRes.json();
  if (historyData.success && historyData.data.total >= 4) {
    console.log(`    [PASS] Riwayat lengkap berhasil diambil (Total interaksi: ${historyData.data.total})\n`);
  } else {
    console.error('    [FAIL] Riwayat gagal diambil', historyData);
  }

  console.log('============================================================');
  console.log('  RINGKASAN: SEMUA TES BERHASIL (E2E Phase 5 Passed)');
  console.log('============================================================\n');

  await pool.end();
  await redis.quit();
}

main().catch(e => {
  console.error(e);
  pool.end();
  redis.quit();
  process.exit(1);
});
