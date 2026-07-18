import { PrismaClient } from '@prisma/client';
import pkg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import Redis from 'ioredis';

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://smartrose:smartrosedev123@127.0.0.1:5433/smartrose_dev' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const redis = new Redis();
const API_URL = 'http://localhost:4000/api';

async function getCaptcha() {
  const req = await fetch(`${API_URL}/captcha`, { headers: { 'Content-Type': 'application/json' } });
  const data = await req.json();
  return {
    captchaToken: data.data.token,
    captchaJawaban: eval(data.data.pertanyaan.replace('Berapa hasil dari ', '').replace('?', '')).toString()
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAdminToken() {
  const adminEmail = `admin_fase7_${Date.now()}@test.com`;
  const adminPassword = 'Password123!';
  
  // Register Admin
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noPegawai: `ADM7${Date.now()}`, email: adminEmail, password: adminPassword, nama: 'Admin Fase 7', unitKerja: 'Direksi' })
  });

  // Approve Admin manually in DB
  await pool.query("UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN_UTAMA' WHERE email = $1", [adminEmail]);

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: adminEmail, password: adminPassword }),
  });
  const loginData = await loginRes.json();
  if (!loginData.data) {
    console.error('Admin Login failed!', loginData);
    throw new Error('Admin Login failed');
  }
  const token = loginData.data.accessToken;
  
  if (loginData.data.requiresOtp) {
    const otp = await redis.get(`otp:${adminEmail}`);
    const otpRes = await fetch(`${API_URL}/auth/login/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, otp }),
    });
    const otpData = await otpRes.json();
    return otpData.data.accessToken;
  }
  return token;
}

async function getUserToken() {
  const userEmail = `user_fase7_${Date.now()}@test.com`;
  const userPassword = 'Password123!';
  
  // Register User
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noPegawai: `USR7${Date.now()}`, email: userEmail, password: userPassword, nama: 'User Fase 7', unitKerja: 'Poli Umum' })
  });

  // Approve User manually in DB
  await pool.query("UPDATE users SET status_verifikasi = 'APPROVED', role = 'USER' WHERE email = $1", [userEmail]);

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: userEmail, password: userPassword }),
  });
  const loginData = await loginRes.json();
  if (!loginData.data) {
    console.error('User Login failed!', loginData);
    throw new Error('User Login failed');
  }
  const token = loginData.data.accessToken;
  
  if (loginData.data.requiresOtp) {
    const otp = await redis.get(`otp:${userEmail}`);
    const otpRes = await fetch(`${API_URL}/auth/login/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, otp }),
    });
    const otpData = await otpRes.json();
    return otpData.data.accessToken;
  }
  return token;
}

async function runTests() {
  console.log('=== MEMULAI PENGUJIAN FASE 7: KEAMANAN & KEPATUHAN (UU PDP) ===');

  const tokenAdmin = await getAdminToken();
  const tokenUser = await getUserToken();
  let trackingNumber = '';
  let reportId = '';

  // [A] XSS Protection
  console.log('\n[A] Buat laporan publik dengan payload berbahaya (XSS Protection)');
  const captchaA = await getCaptcha();
  const resA = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jenisInsiden: 'KTD',
      tanggalKejadian: new Date().toISOString(),
      lokasi: 'IGD',
      unitKerja: 'IGD',
      kronologi: '<script>alert("xss")</script>Pasien jatuh dari tempat tidur <img src="x" onerror="alert(1)">',
      dampak: 'Luka lecet',
      gradingAwal: 'BIRU',
      melibatkanPasien: false,
      ...captchaA
    }),
  });
  const dataA = await resA.json();
  console.log('Data A Response:', dataA);
  console.log(`Status [A]: ${resA.status} (Harus 201)`);
  trackingNumber = dataA.data.trackingNumber;
  reportId = dataA.data.id;

  // [B] CORS Validation
  console.log('\n[B] Hit endpoint publik dengan header Origin: http://domain-hacker.com');
  const resB = await fetch(`${API_URL}/reports/scan/IGD`, {
    method: 'GET',
    headers: { 'Origin': 'http://domain-hacker.com' },
    redirect: 'manual'
  });
  const acao = resB.headers.get('access-control-allow-origin');
  if (!acao || acao !== 'http://domain-hacker.com') {
    console.log(`✅ SUKSES: Request ditolak oleh kebijakan CORS (Header ACAO tidak dikembalikan untuk origin tersebut)`);
  } else {
    console.log(`❌ GAGAL: Header ACAO mengizinkan origin hacker!`);
  }

  // [C] Encryption at Rest
  console.log('\n[C] Cek langsung ke database (Prisma) untuk verifikasi ciphertext');
  const dbReport = await prisma.report.findUnique({ where: { id: reportId } });
  console.log(`Kronologi Asli: <script>alert("xss")</script>Pasien jatuh dari tempat tidur <img src="x" onerror="alert(1)">`);
  console.log(`Kronologi DB: ${dbReport.kronologi}`);
  if (dbReport.kronologi.includes('<script>')) {
    console.log('❌ GAGAL: Kronologi masih dalam plain text / tidak terenkripsi');
  } else {
    console.log('✅ SUKSES: Kronologi terenkripsi di DB');
  }

  // [D] Decryption in Transit
  console.log('\n[D] Ambil laporan menggunakan API GET /admin/reports/:id');
  const resD = await fetch(`${API_URL}/admin/reports/${reportId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  const dataD = await resD.json();
  console.log(`Status [D]: ${resD.status}`);
  console.log(`Kronologi API: ${dataD.data?.kronologi}`);
  if (dataD.data?.kronologi === '&lt;script&gt;alert("xss")&lt;/script&gt;Pasien jatuh dari tempat tidur <img src>') {
    console.log('✅ SUKSES: Data berhasil didekripsi dan disanitasi oleh middleware XSS');
  } else {
    console.log('❌ GAGAL: Data tidak sesuai harapan sanitasi/dekripsi');
  }

  // [E] Audit Log
  console.log('\n[E] Cek tabel AuditLog di database');
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: reportId },
  });
  console.log(`Total Audit Log untuk laporan ini: ${auditLogs.length}`);
  if (auditLogs.length > 0) {
    console.log(`Aksi terekam: ${auditLogs[0].action} oleh IP: ${auditLogs[0].ipAddress}`);
    console.log('✅ SUKSES: AuditLog berhasil merekam jejak pembuatan laporan');
  }

  // [F] Confirm Password Middleware
  console.log('\n[F] Lakukan hardDelete laporan dengan ADMIN_UTAMA (Password Salah lalu Benar)');
  const resF_wrong = await fetch(`${API_URL}/admin/reports/${reportId}/hard`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify({ confirmPassword: 'wrongpassword' }),
  });
  console.log(`Status [F] Password Salah: ${resF_wrong.status} (Harus 401)`);

  const resF_correct = await fetch(`${API_URL}/admin/reports/${reportId}/hard`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` },
    body: JSON.stringify({ confirmPassword: 'Password123!' }),
  });
  console.log(`Status [F] Password Benar: ${resF_correct.status} (Harus 200)`);

  console.log('\n=== PENGUJIAN FASE 7 SELESAI ===');
  process.exit(0);
}

runTests().catch(console.error);
