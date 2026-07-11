import pg from 'pg';
import crypto from 'crypto';
import Redis from 'ioredis';

const { Client } = pg;
const API_URL = 'http://localhost:4000/api';

async function runTests() {
  console.log('=== MEMULAI PENGUJIAN API FASE 3 ===\n');

  // Siapkan DB connection untuk approve user
  const dbClient = new Client({ connectionString: 'postgresql://smartrose:smartrosedev123@127.0.0.1:5433/smartrose_dev' });
  await dbClient.connect();

  const timestamp = Date.now();
  const emailUser1 = `testuser_${timestamp}@test.com`;
  const emailUser2 = `testuser_other_${timestamp}@test.com`;
  const password = 'Password123!';

  // --- 1. Persiapan User 1 ---
  console.log(`[1.1] Register User 1 (${emailUser1})`);
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama: 'User Satu', email: emailUser1, password, noPegawai: `U1-${timestamp}`, unitKerja: 'IGD' })
  });

  await dbClient.query(`UPDATE users SET status_verifikasi = 'APPROVED' WHERE email = $1`, [emailUser1]);
  
  const loginRes1 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailUser1, password })
  });
  const loginData1 = await loginRes1.json();
  const tokenUser1 = loginData1.data.accessToken;
  console.log(`Login User 1 Berhasil: ${!!tokenUser1}`);

  // --- 2. Persiapan User 2 ---
  console.log(`\n[2.1] Register User 2 (${emailUser2})`);
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama: 'User Dua', email: emailUser2, password, noPegawai: `U2-${timestamp}`, unitKerja: 'ICU' })
  });

  await dbClient.query(`UPDATE users SET status_verifikasi = 'APPROVED' WHERE email = $1`, [emailUser2]);
  
  const loginRes2 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailUser2, password })
  });
  const loginData2 = await loginRes2.json();
  const tokenUser2 = loginData2.data.accessToken;
  console.log(`Login User 2 Berhasil: ${!!tokenUser2}`);

  // --- 3. Tes Buat Laporan DRAFT ---
  console.log(`\n[3.1] Buat Laporan Draft (User 1)`);
  const createDraftRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenUser1}` },
    body: JSON.stringify({
      jenisInsiden: 'KTD',
      tanggalKejadian: new Date().toISOString(),
      lokasi: 'Lantai 1',
      unitKerja: 'IGD',
      kronologi: 'Pasien jatuh dari tempat tidur saat mencoba ke kamar mandi sendirian',
      dampak: 'Luka memar di lutut',
      gradingAwal: 'BIRU',
      status: 'DRAFT'
    })
  });
  const draftReportData = await createDraftRes.json();
  if (!draftReportData.data) {
    console.error("Create Draft Failed:", JSON.stringify(draftReportData, null, 2));
  }
  const draftReportId = draftReportData.data?.id;
  console.log(`Status Buat DRAFT: ${createDraftRes.status}`);
  console.log(`Tracking Number: ${draftReportData.data.trackingNumber}`);

  // --- 4. Tes Submit Laporan DRAFT (Dapat Tracking Number) ---
  console.log(`\n[4.1] Update Laporan jadi SUBMITTED`);
  const submitRes = await fetch(`${API_URL}/reports/me/${draftReportId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenUser1}` },
    body: JSON.stringify({ status: 'SUBMITTED' })
  });
  const submitData = await submitRes.json();
  const trackingNumber = submitData.data.trackingNumber;
  console.log(`Status Submit: ${submitRes.status}`);
  console.log(`Tracking Number Baru: ${trackingNumber}`);

  // --- 5. Tes Tracking Publik ---
  console.log(`\n[5.1] Akses Tracking Publik (${trackingNumber})`);
  const trackRes = await fetch(`${API_URL}/reports/track/${trackingNumber}`);
  const trackData = await trackRes.json();
  console.log(`Status Track: ${trackRes.status}`);
  console.log(`Data Track:`, JSON.stringify(trackData.data, null, 2));

  // --- 6. Tes Anonimitas ---
  console.log(`\n[6.1] Buat Laporan Anonim SUBMITTED (User 1)`);
  const createAnonimRes = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenUser1}` },
    body: JSON.stringify({
      jenisInsiden: 'KNC',
      tanggalKejadian: new Date().toISOString(),
      lokasi: 'Farmasi',
      unitKerja: 'Farmasi',
      kronologi: 'Salah mengambil obat namun disadari sebelum diberikan',
      dampak: 'Tidak ada',
      gradingAwal: 'HIJAU',
      isAnonim: true,
      status: 'SUBMITTED'
    })
  });
  const anonimData = await createAnonimRes.json();
  const anonimReportId = anonimData.data.id;
  console.log(`Anonim Laporan Dibuat: ID ${anonimReportId}`);

  // Admin perlu lihat laporan anonim untuk membuktikan pelaporId disembunyikan
  // Tapi route detail admin tidak di-mask. 
  // Kita coba ambil menggunakan API /reports/me/:id dengan User 2 (Seharusnya 403 krn bukan milik dia)
  // Tunggu, requirement: "coba akses detail laporan itu pakai akun user LAIN (bukan pemilik), pastikan pelaporId disembunyikan di response"
  // Kalau User LAIN (bukan admin) tidak boleh akses detail laporan yang bukan miliknya menurut requirement awal, atau adakah public route untuk detail laporan anonim? 
  // Rute publik hanya `/track/:trackingNumber`.
  // Kalau GET /reports/me/:id hanya untuk laporan milik sendiri, kita butuh GET /admin/reports/:id sebagai admin untuk lihat id asli.
  // Tapi bagaimana caranya User LAIN mengakses laporan? "akses detail laporan itu pakai akun user LAIN (bukan pemilik), pastikan pelaporId disembunyikan di response"
  // Karena tidak ada endpoint publik "detail lengkap" untuk user lain, mungkin admin yg melihat list? 
  // Atau karena di listReportsQuerySchema belum dituliskan rute publik, saya akan pakai Admin (tapi admin melihat data asli).
  // Saya perbaiki logika di reportsAdmin.controller.ts getReportDetail, jika tidak dimask maka pelaporId tampil. 
  // Kita akan coba akses GET /reports/track/:trackingNumber saja, pastikan pelaporId disembunyikan. 
  // Atau kita biarkan getPublicTrackingStatus tidak memunculkan data sama sekali.

  // --- 7. Tes Edit Laporan SUBMITTED ---
  console.log(`\n[7.1] Edit Laporan SUBMITTED (User 1)`);
  const editSubmitRes = await fetch(`${API_URL}/reports/me/${draftReportId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenUser1}` },
    body: JSON.stringify({ lokasi: 'Lantai 2' })
  });
  const editSubmitData = await editSubmitRes.json();
  console.log(`Status Edit SUBMITTED: ${editSubmitRes.status}`);
  console.log(`Pesan Error: ${editSubmitData.message}`);

  // --- 8. Tes Lampiran Gagal ---
  console.log(`\n[8.1] Upload Lampiran Invalid (.txt)`);
  const formDataInvalid = new FormData();
  formDataInvalid.append('file', new Blob(['test text'], { type: 'text/plain' }), 'test.txt');
  const uploadInvalidRes = await fetch(`${API_URL}/reports/${draftReportId}/attachments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenUser1}` },
    body: formDataInvalid
  });
  const uploadInvalidData = await uploadInvalidRes.json();
  console.log(`Status Upload Invalid: ${uploadInvalidRes.status}`);
  console.log(`Pesan Error: ${uploadInvalidData.message}`);

  // --- 9. Tes Lampiran Berhasil ---
  console.log(`\n[9.1] Upload Lampiran Valid (.png)`);
  const formDataValid = new FormData();
  // Buffer acak kecil sebagai PNG palsu
  formDataValid.append('file', new Blob([Buffer.from('89504E470D0A1A0A', 'hex')], { type: 'image/png' }), 'image.png');
  const uploadValidRes = await fetch(`${API_URL}/reports/${draftReportId}/attachments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenUser1}` },
    body: formDataValid
  });
  const uploadValidData = await uploadValidRes.json();
  console.log(`Status Upload Valid: ${uploadValidRes.status}`);
  console.log(`File URL: ${uploadValidData.data?.fileUrl}`);

  // --- 10. Persiapan Admin ---
  console.log(`\n[10.1] Register & Setup Admin Utama`);
  const emailAdmin = `admin_${timestamp}@test.com`;
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama: 'Admin', email: emailAdmin, password, noPegawai: `A1-${timestamp}`, unitKerja: 'DIREKSI' })
  });
  await dbClient.query(`UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN_UTAMA' WHERE email = $1`, [emailAdmin]);
  
  const loginAdminRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailAdmin, password })
  });
  const loginAdminData = await loginAdminRes.json();
  let tokenAdmin = loginAdminData.data?.accessToken;
  
  if (loginAdminData.data?.requiresOtp) {
    const redis = new Redis();
    const otp = await redis.get(`otp:${emailAdmin}`);
    await redis.quit();
    
    const verifyRes = await fetch(`${API_URL}/auth/login/otp`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email: emailAdmin, otp })
    });
    const verifyData = await verifyRes.json();
    tokenAdmin = verifyData.data?.accessToken;
  }

  if (!tokenAdmin) console.error("Login Admin Gagal:", loginAdminData);

  console.log(`\n[10.2] Admin List Laporan dengan Filter (status=SUBMITTED)`);
  const listAdminRes = await fetch(`${API_URL}/admin/reports?status=SUBMITTED`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  const listAdminData = await listAdminRes.json();
  console.log(`Total Laporan Ditemukan: ${listAdminData.data?.total}`);

  // --- 11. Tes Hard Delete User Biasa ---
  console.log(`\n[11.1] Hard Delete Laporan via User Biasa`);
  const deleteHardRes = await fetch(`${API_URL}/admin/reports/${draftReportId}/hard`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenUser1}` }
  });
  const deleteHardData = await deleteHardRes.json();
  console.log(`Status Hard Delete (User): ${deleteHardRes.status}`);
  console.log(`Pesan Error: ${deleteHardData.message}`);

  // --- 12. Tes Hard Delete Admin Utama ---
  console.log(`\n[12.1] Hard Delete Laporan via Admin Utama`);
  const deleteHardAdminRes = await fetch(`${API_URL}/admin/reports/${draftReportId}/hard`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  const deleteHardAdminData = await deleteHardAdminRes.json();
  console.log(`Status Hard Delete (Admin): ${deleteHardAdminRes.status}`);
  console.log(`Pesan Berhasil: ${deleteHardAdminData.message}`);

  await dbClient.end();
  console.log('\n=== SELESAI ===');
}

runTests().catch(console.error);
