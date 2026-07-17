import fs from 'fs';
import Redis from 'ioredis';
import pg from 'pg';
const { Client } = pg;

const API_URL = 'http://localhost:4000/api';
const DB_URL = 'postgresql://smartrose:smartrosedev123@127.0.0.1:5433/smartrose_dev';

function getHeaders(token = null) {
  const ip = `127.0.0.${Math.floor(Math.random() * 255)}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': ip
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function generateMockFiles() {
  fs.writeFileSync('mock_pdf_8mb.pdf', Buffer.alloc(8 * 1024 * 1024, 'a'));
  fs.writeFileSync('mock_pdf_11mb.pdf', Buffer.alloc(11 * 1024 * 1024, 'a'));
  fs.writeFileSync('mock_docx.docx', Buffer.alloc(10 * 1024, 'a'));
  fs.writeFileSync('mock_xlsx.xlsx', Buffer.alloc(10 * 1024, 'a'));
  fs.writeFileSync('mock_image.jpg', Buffer.alloc(10 * 1024, 'a'));
}

async function cleanupMockFiles() {
  fs.unlinkSync('mock_pdf_8mb.pdf');
  fs.unlinkSync('mock_pdf_11mb.pdf');
  fs.unlinkSync('mock_docx.docx');
  fs.unlinkSync('mock_xlsx.xlsx');
  fs.unlinkSync('mock_image.jpg');
}

async function getCaptcha() {
  const req = await fetch(`${API_URL}/captcha`, { headers: getHeaders() });
  const data = await req.json();
  return {
    captchaToken: data.data.token,
    captchaJawaban: eval(data.data.pertanyaan.replace('Berapa hasil dari ', '').replace('?', '')).toString()
  };
}

async function runTests() {
  console.log("=== MEMULAI PENGUJIAN REVISI 2: DATA KLINIS & ADMIN ===\n");

  await generateMockFiles();

  // Create users for tests
  const adminEmail = `admin_utama_${Date.now()}@test.com`;
  const adminPassword = 'Password123!';
  const userEmail = `user_${Date.now()}@test.com`;
  const userPassword = 'Password123!';

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log("-> Menyiapkan data tester di database (ADMIN_UTAMA dan USER)...");
  // Insert ADMIN_UTAMA
  const resAdmin = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ noPegawai: `ADM${Date.now()}`, email: adminEmail, password: adminPassword, nama: 'Admin Utama Test', unitKerja: 'Direksi' })
  });
  const resAdminData = await resAdmin.json();
  if (resAdmin.status !== 201) console.error('Admin Register Failed:', resAdminData);
  await client.query("UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN_UTAMA' WHERE email = $1", [adminEmail]);
  
  // Insert USER
  const resUser = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ noPegawai: `USR${Date.now()}`, email: userEmail, password: userPassword, nama: 'User Test', unitKerja: 'Poli Umum' })
  });
  const resUserData = await resUser.json();
  if (resUser.status !== 201) console.error('User Register Failed:', resUserData);
  await client.query("UPDATE users SET status_verifikasi = 'APPROVED', role = 'USER' WHERE email = $1", [userEmail]);

  // Login both
  const loginAdmin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ identifier: adminEmail, password: adminPassword })
  });
  const loginAdminData = await loginAdmin.json();
  if (loginAdmin.status !== 200) console.error('Admin Login Failed:', loginAdminData);
  let adminToken = loginAdminData.data?.accessToken;

  // Handle OTP for ADMIN
  if (loginAdminData.data?.requiresOtp) {
    console.log("Admin requires OTP. Fetching from Redis...");
    const redis = new Redis('redis://127.0.0.1:6379');
    const otp = await redis.get(`otp:${adminEmail}`);
    if (!otp) console.error("OTP NOT FOUND IN REDIS!");
    
    const otpReq = await fetch(`${API_URL}/auth/login/otp`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ email: adminEmail, otp })
    });
    const otpData = await otpReq.json();
    adminToken = otpData.data?.accessToken;
    await redis.quit();
  }
  console.log('adminToken:', adminToken ? "OK" : "FAILED");

  const loginUser = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ identifier: userEmail, password: userPassword })
  });
  const loginUserData = await loginUser.json();
  if (loginUser.status !== 200) console.error('User Login Failed:', loginUserData);
  let userToken = loginUserData.data?.accessToken; console.log('userToken:', userToken);


  // SCENARIO A
  console.log("\n[a] Buat laporan publik dengan semua field data pasien baru terisi lengkap");
  const captchaA = await getCaptcha();
  const reqA = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      jenisInsiden: 'KTD',
      tanggalKejadian: new Date().toISOString(),
      lokasi: 'IGD',
      unitKerja: 'IGD',
      kronologi: 'Pasien jatuh dari tempat tidur',
      dampak: 'Luka lecet',
      gradingAwal: 'BIRU',
      melibatkanPasien: true,
      namaPasien: 'Budi Santoso',
      noRekamMedis: 'RM123456',
      ruanganPasien: 'IGD Bed 1',
      umurPasien: 45,
      jenisKelaminPasien: 'L',
      statusPasienSaatInsiden: 'IGD',
      penanggungBiaya: 'BPJS',
      tanggalJamMasukRs: new Date().toISOString(),
      kategoriPelaporPertama: 'PASIEN_SENDIRI',
      pihakTerlibat: ['Perawat', 'Dokter Jaga'],
      kasusSpesialisasi: 'Bedah',
      akibatTerhadapPasien: 'RINGAN',
      apakahKejadianSerupaPernahTerjadi: false,
      ...captchaA
    })
  });
  console.log(`Status [a]: ${reqA.status}`);
  const dataA = await reqA.json();
  const reportA_Id = dataA.data.id;
  console.log(dataA.message);

  // SCENARIO B
  console.log("\n[b] Buat laporan publik dengan melibatkanPasien bernilai false (field pasien kosong)");
  const captchaB = await getCaptcha();
  const reqB = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      jenisInsiden: 'KNC',
      tanggalKejadian: new Date().toISOString(),
      lokasi: 'Apotek',
      unitKerja: 'Farmasi',
      kronologi: 'Salah ambil obat tapi ketahuan',
      dampak: 'Tidak ada',
      gradingAwal: 'HIJAU',
      melibatkanPasien: false,
      ...captchaB
    })
  });
  console.log(`Status [b]: ${reqB.status}`);
  const dataB = await reqB.json();
  const reportB_Id = dataB.data.id;
  console.log(dataB.message);


  // SCENARIO C
  console.log("\n[c] Admin buat pengumuman, lalu fetch sebagai user biasa");
  const reqC_Admin = await fetch(`${API_URL}/admin/announcements`, {
    method: 'POST',
    headers: getHeaders(adminToken),
    body: JSON.stringify({
      judul: 'Pengumuman Penting',
      isi: 'Tolong semua orang perhatikan ini',
      targetRole: 'SEMUA'
    })
  });
  console.log(`Status Create Announcement: ${reqC_Admin.status}`);
  
  const reqC_User = await fetch(`${API_URL}/announcements`, {
    method: 'GET',
    headers: getHeaders(userToken)
  });
  console.log(`Status GET Announcement as User: ${reqC_User.status}`);
  const dataC = await reqC_User.json();
  console.log(`Total Pengumuman yg dilihat User: ${dataC.data.length}`);


  // SCENARIO E
  console.log("\n[e] ADMIN_UTAMA buat akun admin baru (POST /admin/users)");
  const newAdminEmail = `admin_baru_${Date.now()}@test.com`;
  const reqE = await fetch(`${API_URL}/admin/users`, {
    method: 'POST',
    headers: getHeaders(adminToken),
    body: JSON.stringify({
      noPegawai: `ADM2${Date.now()}`,
      email: newAdminEmail,
      nama: 'Admin Baru',
      unitKerja: 'Manajemen Risiko',
      role: 'ADMIN'
    })
  });
  console.log(`Status [e] Create Admin: ${reqE.status}`);
  const dataE = await reqE.json();
  const newAdminPassword = dataE.data?.password;
  console.log(`Generated Password: ${newAdminPassword}`);

  console.log("Verifikasi login admin baru...");
  const loginNewAdmin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ identifier: newAdminEmail, password: newAdminPassword })
  });
  console.log(`Status Login Admin Baru: ${loginNewAdmin.status}`);
  const loginNewAdminData = await loginNewAdmin.json();
  let newAdminToken = loginNewAdminData.data?.accessToken;

  // Handle OTP for New ADMIN
  if (loginNewAdminData.data?.requiresOtp) {
    console.log("New Admin requires OTP. Fetching from Redis...");
    const redis = new Redis('redis://127.0.0.1:6379');
    const otp = await redis.get(`otp:${newAdminEmail}`);
    if (!otp) console.error("OTP NOT FOUND IN REDIS!");
    
    const otpReq = await fetch(`${API_URL}/auth/login/otp`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ email: newAdminEmail, otp })
    });
    const otpData = await otpReq.json();
    newAdminToken = otpData.data?.accessToken;
    await redis.quit();
  }


  // SCENARIO F
  console.log("\n[f] Panggil POST /admin/users pakai token ADMIN biasa (bukan ADMIN_UTAMA)");
  const reqF = await fetch(`${API_URL}/admin/users`, {
    method: 'POST',
    headers: getHeaders(newAdminToken), // newAdminToken is just ADMIN
    body: JSON.stringify({
      noPegawai: `ADM3${Date.now()}`,
      email: `fail_${Date.now()}@test.com`,
      nama: 'Fail Admin',
      unitKerja: 'Fail',
      role: 'ADMIN'
    })
  });
  console.log(`Status [f]: ${reqF.status} (Harus 403)`);


  // SCENARIO G
  console.log("\n[g] Admin ekspor daftar laporan ke Excel (filter tanggal)");
  const reqG = await fetch(`${API_URL}/admin/reports/export?format=excel&startDate=2026-01-01`, {
    method: 'GET',
    headers: getHeaders(adminToken)
  });
  console.log(`Status [g] Export Laporan: ${reqG.status}`);
  const bufferG = await reqG.arrayBuffer();
  console.log(`Ukuran file export laporan excel: ${bufferG.byteLength} bytes`);


  // SCENARIO H
  console.log("\n[h] Admin ekspor dashboard dengan cakupan sebagian data (ringkasanStatistik)");
  const reqH = await fetch(`${API_URL}/admin/dashboard/export`, {
    method: 'POST',
    headers: getHeaders(adminToken),
    body: JSON.stringify({
      format: 'pdf',
      cakupan: ['ringkasanStatistik']
    })
  });
  console.log(`Status [h] Export Dashboard PDF: ${reqH.status}`);
  const bufferH = await reqH.arrayBuffer();
  console.log(`Ukuran file export dashboard pdf: ${bufferH.byteLength} bytes`);


  // Prepare for SCENARIO I & J: Set report status to SELESAI
  console.log("\n-> Menyelesaikan laporan (Set status ke SELESAI)");
  await client.query("UPDATE reports SET status = 'SELESAI' WHERE id = $1", [reportA_Id]);


  // SCENARIO I
  console.log("\n[i] Coba update laporan yang sudah berstatus SELESAI (harus 409)");
  const reqI = await fetch(`${API_URL}/admin/reports/${reportA_Id}/regrade`, {
    method: 'PUT',
    headers: getHeaders(adminToken),
    body: JSON.stringify({
      gradingBaru: 'MERAH',
      alasan: 'Test regrade saat selesai'
    })
  });
  console.log(`Status [i]: ${reqI.status} (Harus 409)`);


  // SCENARIO J
  console.log("\n[j] Verifikasi operasi hardDelete pada laporan SELESAI oleh ADMIN_UTAMA (harus 200)");
  const reqJ = await fetch(`${API_URL}/admin/reports/${reportA_Id}/hard`, {
    method: 'DELETE',
    headers: getHeaders(adminToken)
  });
  console.log(`Status [j]: ${reqJ.status}`);


  // SCENARIO K
  console.log("\n[k] Upload attachment laporan (endpoint reguler) menggunakan file .docx dan .xlsx");
  const formK1 = new FormData();
  const fileK1 = fs.readFileSync('mock_docx.docx');
  formK1.append('file', new Blob([fileK1], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'test.docx');
  const formK1Headers = getHeaders();
  delete formK1Headers['Content-Type']; // Let fetch set the correct content-type with boundary
  const reqK1 = await fetch(`${API_URL}/reports/${reportB_Id}/attachments`, {
    method: 'POST',
    headers: formK1Headers,
    body: formK1
  });
  console.log(`Status [k] DOCX: ${reqK1.status} (Harus 201)`);

  const formK2 = new FormData();
  const fileK2 = fs.readFileSync('mock_xlsx.xlsx');
  formK2.append('file', new Blob([fileK2], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'test.xlsx');
  const formK2Headers = getHeaders();
  delete formK2Headers['Content-Type'];
  const reqK2 = await fetch(`${API_URL}/reports/${reportB_Id}/attachments`, {
    method: 'POST',
    headers: formK2Headers,
    body: formK2
  });
  console.log(`Status [k] XLSX: ${reqK2.status} (Harus 201)`);


  // SCENARIO L
  // Create an RCA record for reportB first
  const rcaId = `rca${Date.now()}`;
  await client.query(`INSERT INTO root_cause_analyses (id, report_id, kronologi_singkat, masalah_awal_5_why, disusun_oleh_id, updated_at) VALUES ($1, $2, 'Kronologi', 'Masalah', (SELECT id FROM users WHERE email = $3 LIMIT 1), NOW())`, [rcaId, reportB_Id, adminEmail]);
  
  console.log("\n[l] Upload dokumen RCA mock file PDF 8MB (diterima) dan 11MB (ditolak)");
  const formL1 = new FormData();
  const fileL1 = fs.readFileSync('mock_pdf_8mb.pdf');
  formL1.append('file', new Blob([fileL1], { type: 'application/pdf' }), '8mb.pdf');
  const formL1Headers = getHeaders(adminToken);
  delete formL1Headers['Content-Type'];
  const reqL1 = await fetch(`${API_URL}/reports/${reportB_Id}/rca/attachments`, {
    method: 'POST',
    headers: formL1Headers,
    body: formL1
  });
  console.log(`Status [l] PDF 8MB: ${reqL1.status} (Harus 201)`);

  const formL2 = new FormData();
  const fileL2 = fs.readFileSync('mock_pdf_11mb.pdf');
  formL2.append('file', new Blob([fileL2], { type: 'application/pdf' }), '11mb.pdf');
  const formL2Headers = getHeaders(adminToken);
  delete formL2Headers['Content-Type'];
  const reqL2 = await fetch(`${API_URL}/reports/${reportB_Id}/rca/attachments`, {
    method: 'POST',
    headers: formL2Headers,
    body: formL2
  });
  console.log(`Status [l] PDF 11MB: ${reqL2.status} (Harus 413)`);


  // SCENARIO M
  console.log("\n[m] Upload dokumen RCA menggunakan mock file .jpg (harus ditolak)");
  const formM = new FormData();
  const fileM = fs.readFileSync('mock_image.jpg');
  formM.append('file', new Blob([fileM], { type: 'image/jpeg' }), 'image.jpg');
  const formMHeaders = getHeaders(adminToken);
  delete formMHeaders['Content-Type'];
  const reqM = await fetch(`${API_URL}/reports/${reportB_Id}/rca/attachments`, {
    method: 'POST',
    headers: formMHeaders,
    body: formM
  });
  console.log(`Status [m]: ${reqM.status} (Harus 400 atau 415)`);


  // SCENARIO D
  console.log("\n[d] User mencoba hapus akun sendiri (self-delete), lalu verifikasi gagal login");
  const reqD_Delete = await fetch(`${API_URL}/auth/profile`, {
    method: 'DELETE',
    headers: getHeaders(userToken),
    body: JSON.stringify({ password: userPassword })
  });
  console.log(`Status [d] Self-Delete: ${reqD_Delete.status}`);

  console.log("Mencoba login dengan akun yang sudah dihapus...");
  const loginUserAgain = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ identifier: userEmail, password: userPassword })
  });
  console.log(`Status Login Akun Dihapus: ${loginUserAgain.status}`);

  await client.end();
  await cleanupMockFiles();
  console.log("\n=== PENGUJIAN SELESAI ===");
}

runTests().catch(async (e) => {
  console.error(e);
  await cleanupMockFiles();
});
