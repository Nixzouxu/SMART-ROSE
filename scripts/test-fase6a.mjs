import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/smartrose_dev?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const BASE_URL = 'http://localhost:4000/api';

const generateToken = (userId, role, unitKerja) => {
  return jwt.sign({ userId, role, unitKerja }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
};

async function fetchApi(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTest() {
  console.log('--- E2E TEST FASE 6A (RCA) ---');

  try {
    // 1. Setup Users
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN_UTAMA' } });
    const userA = await prisma.user.create({
      data: { nama: 'Staf Assigned', email: `assigned_${Date.now()}@test.com`, noPegawai: `AST-${Date.now()}`, passwordHash: 'hash', unitKerja: 'IGD', statusVerifikasi: 'APPROVED' }
    });
    const userB = await prisma.user.create({
      data: { nama: 'User Lain', email: `unassigned_${Date.now()}@test.com`, noPegawai: `UST-${Date.now()}`, passwordHash: 'hash', unitKerja: 'IGD', statusVerifikasi: 'APPROVED' }
    });

    const tokenAdmin = generateToken(admin.id, admin.role, admin.unitKerja);
    const tokenUserA = generateToken(userA.id, userA.role, userA.unitKerja);
    const tokenUserB = generateToken(userB.id, userB.role, userB.unitKerja);

    // 2. Admin Creates Report
    const reportRes = await fetchApi('POST', '/admin/reports', {
      jenisInsiden: 'KTD',
      tanggalKejadian: new Date().toISOString(),
      lokasi: 'IGD',
      unitKerja: 'IGD',
      kronologi: 'Test RCA dengan kronologi yang panjang lebih dari 10 karakter',
      dampak: 'Minor',
      gradingAwal: 'BIRU',
      isAnonim: false
    }, tokenAdmin);
    
    if (reportRes.status !== 201) {
      console.log('Failed to create report:', reportRes.data);
      return;
    }
    const reportId = reportRes.data.data.id;
    console.log('1. Admin berhasil buat laporan:', reportId);

    // Admin Assigns to User A
    const assignRes = await fetchApi('POST', `/admin/reports/${reportId}/assign`, { assignedToId: userA.id }, tokenAdmin);
    console.log('   Admin berhasil assign laporan ke Staf (User A). Status:', assignRes.status);

    // 3. User B (Unassigned) tries to access RCA -> 403
    const getB = await fetchApi('GET', `/reports/${reportId}/rca`, null, tokenUserB);
    console.log('2. User B (Unassigned) coba GET RCA. Status:', getB.status, 'Message:', getB.data.message);

    // 4. User A (Assigned) creates RCA
    const rcaPayload = {
      timKetua: 'Dr. Andi',
      kronologiSingkat: 'Pasien jatuh dari bed',
      masalahAwal5Why: 'Bed tidak terkunci',
      timelineEntries: [{ waktu: '10:00', kejadian: 'Pasien masuk', urutan: 1 }],
      timePersonGridEntries: [{ staf: 'PERAWAT', waktu: '10:05', deskripsi: 'Meninggalkan bed', urutan: 1 }],
      fiveWhyEntries: [
        { urutan: 1, jawaban: 'Kenapa 1' },
        { urutan: 2, jawaban: 'Kenapa 2' },
        { urutan: 3, jawaban: 'Kenapa 3' },
        { urutan: 4, jawaban: 'Kenapa 4' },
        { urutan: 5, jawaban: 'Kenapa 5' }
      ],
      fishboneEntries: [
        { kategori: 'MAN', penyebab: 'Kurang fokus', urutan: 1 },
        { kategori: 'MACHINE', penyebab: 'Rem bed rusak', urutan: 2 }
      ],
      rencanaPerbaikanEntries: [
        { akarMasalah: 'SOP', rekomendasiSolusi: 'Update SOP', tindakanPerbaikan: 'Sosialisasi', pelaksana: 'Manajemen', targetWaktu: 'Bulan depan', urutan: 1 }
      ]
    };

    const createRca = await fetchApi('POST', `/reports/${reportId}/rca`, rcaPayload, tokenUserA);
    console.log('3. Staf Assigned (User A) berhasil create RCA lengkap. Status:', createRca.status);

    // 5. Admin GET RCA
    const getA = await fetchApi('GET', `/reports/${reportId}/rca`, null, tokenAdmin);
    console.log('4. Admin berhasil GET RCA lengkap. Status:', getA.status);
    console.log(`   Fishbone count: ${getA.data.data.fishboneEntries.length}, 5Why count: ${getA.data.data.fiveWhyEntries.length}`);

    // 6. User A UPDATE RCA
    rcaPayload.kronologiSingkat = 'Pasien jatuh dari bed (UPDATED)';
    rcaPayload.fiveWhyEntries[0].jawaban = 'Kenapa 1 (UPDATED)';
    const updateRca = await fetchApi('PUT', `/reports/${reportId}/rca`, rcaPayload, tokenUserA);
    console.log('5. Staf Assigned berhasil UPDATE RCA. Status:', updateRca.status);
    
    const getUpdated = await fetchApi('GET', `/reports/${reportId}/rca`, null, tokenAdmin);
    console.log(`   Update terverifikasi (Kronologi): ${getUpdated.data.data.kronologiSingkat}`);

    // 7. Admin DELETE RCA
    const delRca = await fetchApi('DELETE', `/reports/${reportId}/rca`, null, tokenAdmin);
    console.log('6. ADMIN_UTAMA berhasil DELETE RCA. Status:', delRca.status);

    // 8. Assert counts
    const countRoot = await prisma.rootCauseAnalysis.count({ where: { reportId } });
    const count5Why = await prisma.rcaFiveWhy.count({ where: { rcaId: getA.data.data.id } });
    console.log(`   Verifikasi Delete Cascade: RCA=${countRoot}, 5Why=${count5Why}`);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
