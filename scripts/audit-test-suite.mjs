import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import { PrismaClient } from '@prisma/client';
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

async function getAdminTokenAndId() {
  const adminEmail = `admin_audit_${Date.now()}@test.com`;
  const adminPassword = 'Password123!';
  
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noPegawai: `ADMAUD${Date.now()}`, email: adminEmail, password: adminPassword, nama: 'Admin Audit', unitKerja: 'Direksi' })
  });

  await pool.query("UPDATE users SET status_verifikasi = 'APPROVED', role = 'ADMIN_UTAMA' WHERE email = $1", [adminEmail]);

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: adminEmail, password: adminPassword }),
  });
  const loginData = await loginRes.json();
  let token = loginData.data.accessToken;
  
  if (loginData.data.requiresOtp) {
    const otp = await redis.get(`otp:${adminEmail}`);
    const otpRes = await fetch(`${API_URL}/auth/login/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, otp }),
    });
    const otpData = await otpRes.json();
    token = otpData.data.accessToken;
  }
  
  const adminDb = await prisma.user.findUnique({ where: { email: adminEmail } });
  return { token, adminId: adminDb.id };
}

async function runTests() {
  await new Promise(r => setTimeout(r, 2000));

  try {
      // Test 1: Magic Bytes
      console.log('\n=== [1] TEST: Magic Bytes Validation ===');
      let captcha = await getCaptcha();
      let res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisInsiden: 'KTD',
          tanggalKejadian: new Date().toISOString(),
          lokasi: 'IGD',
          unitKerja: 'IGD',
          kronologi: 'Test magic bytes',
          dampak: 'Tidak ada',
          gradingAwal: 'BIRU',
          melibatkanPasien: false,
          ...captcha
        }),
      });
      let data = await res.json();
      let reportId = data.data.id;
      
      const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00\xB8\x00\x00\x00\x00\x00\x00\x00\x40\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00');
      
      const form1 = new FormData();
      form1.append('file', new Blob([fakeExeBuffer], { type: 'application/pdf' }), 'fake-app.pdf');

      console.log('Sending file .exe yang direname jadi .pdf dengan Content-Type: application/pdf');
      const uploadRes = await fetch(`${API_URL}/reports/${reportId}/attachments`, {
          method: 'POST',
          body: form1
      });
      console.log(`Upload status (Harus 400): ${uploadRes.status}`);
      console.log(`Upload response: ${JSON.stringify(await uploadRes.json())}`);


      // Test 2: RCA Size Limit
      console.log('\n=== [2] TEST: RCA Size Limits (8MB vs 11MB) ===');
      const { token, adminId } = await getAdminTokenAndId();
      captcha = await getCaptcha();
      res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisInsiden: 'KTD',
          tanggalKejadian: new Date().toISOString(),
          lokasi: 'IGD',
          unitKerja: 'IGD',
          kronologi: 'Test size limits',
          dampak: 'Tidak ada',
          gradingAwal: 'BIRU',
          melibatkanPasien: false,
          ...captcha
        }),
      });
      data = await res.json();
      const reportRcaId = data.data.id;
      
      await pool.query("UPDATE reports SET status = 'DALAM_INVESTIGASI' WHERE id = $1", [reportRcaId]);
      
      await prisma.rootCauseAnalysis.create({
        data: {
          reportId: reportRcaId,
          kronologiSingkat: 'Test kronologi singkat',
          masalahAwal5Why: 'Test masalah awal 5 why',
          disusunOlehId: adminId
        }
      });

      const pdfHeader = Buffer.from('%PDF-1.4\n');
      const filler8mb = Buffer.alloc(8 * 1024 * 1024 - pdfHeader.length, 'a');
      const buffer8mb = Buffer.concat([pdfHeader, filler8mb]);

      const form8 = new FormData();
      form8.append('file', new Blob([buffer8mb], { type: 'application/pdf' }), '8mb.pdf');
      
      console.log('Uploading 8MB RCA Document...');
      const res8 = await fetch(`${API_URL}/reports/${reportRcaId}/rca/attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form8
      });
      console.log(`8MB Upload Status (Harus 201): ${res8.status}`);
      let out8mb = await res8.text();
      console.log(`8MB Response: ${out8mb.substring(0, 150)}...`);

      const filler11mb = Buffer.alloc(11 * 1024 * 1024 - pdfHeader.length, 'b');
      const buffer11mb = Buffer.concat([pdfHeader, filler11mb]);

      const form11 = new FormData();
      form11.append('file', new Blob([buffer11mb], { type: 'application/pdf' }), '11mb.pdf');
      
      console.log('\nUploading 11MB RCA Document...');
      const res11 = await fetch(`${API_URL}/reports/${reportRcaId}/rca/attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form11
      });
      console.log(`11MB Upload Status (Harus 413 atau 400): ${res11.status}`);
      try {
          console.log(`11MB Response: ${await res11.text()}`);
      } catch(e) {
          console.log(`11MB Response Error: ${e.message}`);
      }


      // Test 3: HardDelete Laporan SELESAI
      console.log('\n=== [3] TEST: HardDelete Laporan SELESAI ===');
      captcha = await getCaptcha();
      res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisInsiden: 'KTD',
          tanggalKejadian: new Date().toISOString(),
          lokasi: 'IGD',
          unitKerja: 'IGD',
          kronologi: 'Test hard delete selesai',
          dampak: 'Tidak ada',
          gradingAwal: 'BIRU',
          melibatkanPasien: false,
          ...captcha
        }),
      });
      data = await res.json();
      const reportSelesaiId = data.data.id;
      
      console.log('Set status laporan menjadi SELESAI');
      await pool.query("UPDATE reports SET status = 'SELESAI' WHERE id = $1", [reportSelesaiId]);

      console.log('Melakukan Hard Delete dengan akun ADMIN_UTAMA...');
      const delRes = await fetch(`${API_URL}/admin/reports/${reportSelesaiId}/hard`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ confirmPassword: 'Password123!' })
      });
      console.log(`Delete SELESAI Status (Harus 200): ${delRes.status}`);
      console.log(`Delete Response: ${JSON.stringify(await delRes.json())}`);

  } catch (error) {
      console.error(error);
  } finally {
      process.exit(0);
  }
}

runTests();
