import request from 'supertest';
import { createApp } from '../../app';
import { db } from '../../config/db';
import redis from '../../config/redis';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

const app = createApp();
let adminToken = '';
let reportId = '';
const TEST_UNIT = 'E2E_TEST_UNIT';

describe('E2E Report & RCA Flow Integration Test', () => {
  beforeAll(async () => {
    // 1. Bersihkan data uji (jika ada sisa)
    await db.rootCauseAnalysis.deleteMany({ where: { report: { unitKerja: TEST_UNIT } } });
    await db.report.deleteMany({ where: { unitKerja: TEST_UNIT } });
    await db.user.deleteMany({ where: { email: 'admin_test_e2e@rs.com' } });

    // 2. Buat Admin Test dengan status APPROVED (agar bisa login)
    const hashedPass = await bcrypt.hash('Password123!', 10);
    await db.user.create({
      data: {
        email: 'admin_test_e2e@rs.com',
        nama: 'Admin E2E Test',
        noPegawai: 'E2E-999',
        passwordHash: hashedPass,
        role: 'ADMIN_UTAMA',
        unitKerja: 'MANAJEMEN',
        statusVerifikasi: 'APPROVED',
      },
    });
  });

  afterAll(async () => {
    // Bersihkan semua data hasil test ini
    await db.rootCauseAnalysis.deleteMany({ where: { report: { unitKerja: TEST_UNIT } } });
    await db.report.deleteMany({ where: { unitKerja: TEST_UNIT } });
    await db.user.deleteMany({ where: { email: 'admin_test_e2e@rs.com' } });

    // Tutup koneksi Redis agar Jest bisa exit clean
    redis.disconnect();
  });

  describe('1. Autentikasi', () => {
    it('harus menolak akses jika token palsu', async () => {
      const res = await request(app)
        .get('/api/reports/me')
        .set('Authorization', 'Bearer token_palsu_123');
      expect(res.status).toBe(401);
    });

    it('harus sukses login dan mendapatkan token via OTP', async () => {
      // Step 1: Kirim kredensial
      const loginRes = await request(app).post('/api/auth/login').send({
        identifier: 'admin_test_e2e@rs.com',
        password: 'Password123!',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.requiresOtp).toBe(true);

      // Step 2: Ambil OTP dari Redis
      const otp = await redis.get('otp:admin_test_e2e@rs.com');
      expect(otp).toBeTruthy();

      // Step 3: Verifikasi OTP
      const otpRes = await request(app).post('/api/auth/login/otp').send({
        email: 'admin_test_e2e@rs.com',
        otp: otp,
      });

      expect(otpRes.status).toBe(200);
      expect(otpRes.body.data).toHaveProperty('accessToken');
      adminToken = otpRes.body.data.accessToken;
    });
  });

  describe('2. Siklus Hidup Laporan (E2E Core Flow)', () => {
    let captchaToken = '';
    let captchaJawaban = '';

    it('Dapatkan Captcha untuk Pelaporan Publik', async () => {
      const res = await request(app).get('/api/captcha');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('pertanyaan');

      captchaToken = res.body.data.token;

      // Parse pertanyaan "Berapa hasil dari X + Y?"
      const match = res.body.data.pertanyaan.match(/(\d+) \+ (\d+)/);
      if (match) {
        captchaJawaban = (parseInt(match[1]) + parseInt(match[2])).toString();
      }
    });

    it('Create: Buat laporan publik (DRAFT / SUBMITTED)', async () => {
      const fallbackRes = await request(app).post('/api/reports').send({
        jenisInsiden: 'KTC',
        tanggalKejadian: new Date().toISOString(),
        lokasi: 'Kamar Mandi 01',
        unitKerja: TEST_UNIT,
        kronologi: 'Test e2e kronologi minimum length',
        dampak: 'Luka ringan',
        gradingAwal: 'BIRU',
        captchaToken,
        captchaJawaban,
        melibatkanPasien: true,
        namaPasien: 'E2E Patient',
        noRekamMedis: 'RM-E2E',
      });

      expect(fallbackRes.status).toBe(201);
      reportId = fallbackRes.body.data.id;
    });

    it('Upload Lampiran: harus menerima .pdf', async () => {
      const dummyPdf = path.join(__dirname, 'dummy.pdf');

      // PDF magic bytes %PDF-1.4
      fs.writeFileSync(dummyPdf, Buffer.from('255044462d312e340a25e2e3cfd30a', 'hex'));

      const resPdf = await request(app)
        .post(`/api/reports/${reportId}/attachments`)
        .attach('file', dummyPdf);

      fs.unlinkSync(dummyPdf);

      expect(resPdf.status).toBe(201);
    });

    it('Investigasi: Admin mengubah status laporan ke DALAM_INVESTIGASI', async () => {
      const putRes = await request(app)
        .put(`/api/admin/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DALAM_INVESTIGASI' });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.status).toBe('DALAM_INVESTIGASI');
    });

    it('RCA Kompleks: Inisialisasi RCA', async () => {
      const res = await request(app)
        .post(`/api/reports/${reportId}/rca`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kronologiSingkat: 'Test RCA E2E',
          masalahAwal5Why: 'Pasien terpeleset',
        });

      expect(res.status).toBe(201);
    });

    it('RCA Kompleks: Mengisi 6 Sub-tabel sekaligus', async () => {
      const rcaUpdateRes = await request(app)
        .put(`/api/reports/${reportId}/rca`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timKetua: 'Dr. Test',
          timSekretaris: 'Suster Test',
          timAnggota: ['Anggota 1'],
          kronologiSingkat: 'Test RCA E2E Updated',
          masalahAwal5Why: 'Pasien terpeleset v2',
          timelineEntries: [
            {
              waktu: new Date().toISOString(),
              kejadian: 'Kejadian E2E',
              informasiTambahan: 'Info E2E',
              urutan: 1,
            },
          ],
          timePersonGridEntries: [
            {
              waktu: new Date().toISOString(),
              staf: 'Perawat A',
              deskripsi: 'Cek E2E',
              urutan: 1,
            },
          ],
          fiveWhyEntries: [
            { jawaban: 'Lantai licin', urutan: 1 },
            { jawaban: 'Air tumpah', urutan: 2 },
            { jawaban: 'Pipa bocor', urutan: 3 },
            { jawaban: 'Pipa tua', urutan: 4 },
            { jawaban: 'Tidak ada maintenance rutin', urutan: 5 },
          ],
          fishboneEntries: [
            {
              kategori: 'MAN',
              penyebab: 'Kurang teliti',
              urutan: 1,
            },
          ],
          rencanaPerbaikanEntries: [
            {
              akarMasalah: 'Tidak ada maintenance rutin',
              rekomendasiSolusi: 'Jadwalkan maintenance',
              tindakanPerbaikan: 'Buat SOP maintenance mingguan',
              pelaksana: 'Teknisi Utama',
              targetWaktu: '1 Minggu',
              urutan: 1,
            },
          ],
        });

      expect(rcaUpdateRes.status).toBe(200);
    });

    it('Upload Lampiran RCA: harus menolak .jpg secara eksplisit', async () => {
      const dummyJpg = path.join(__dirname, 'dummy.jpg');
      fs.writeFileSync(dummyJpg, Buffer.from('ffd8ffe000104a4649460001', 'hex'));

      const resJpg = await request(app)
        .post(`/api/reports/${reportId}/rca/attachments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', dummyJpg);

      fs.unlinkSync(dummyJpg);
      // Ekspektasi ditolak oleh validation (400 atau 415/422 tergantung implementasi)
      expect(resJpg.status).toBeGreaterThanOrEqual(400);
    });

    it('Finalisasi: Admin mengubah status laporan ke SELESAI', async () => {
      const putRes = await request(app)
        .put(`/api/admin/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SELESAI' });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.status).toBe('SELESAI');
    });
  });
});
