import request from 'supertest';
import { createApp } from '../../app';
import { db } from '../../config/db';
import redis from '../../config/redis';
import bcrypt from 'bcrypt';
import { KategoriFishbone, JenisPengisian, PeranTim } from '@prisma/client';

const app = createApp();
let adminToken = '';
let reportId = '';
const TEST_UNIT = 'KARS_TEST_UNIT';

describe('Revisi KARS - RCA Functional Tests', () => {
  beforeAll(async () => {
    // 1. Bersihkan data uji (jika ada sisa)
    await db.rootCauseAnalysis.deleteMany({ where: { report: { unitKerja: TEST_UNIT } } });
    await db.report.deleteMany({ where: { unitKerja: TEST_UNIT } });
    await db.user.deleteMany({ where: { email: 'admin_kars@rs.com' } });

    // 2. Buat Laporan untuk RCA
    const report = await db.report.create({
      data: {
        tanggalKejadian: new Date(),
        lokasi: 'Test',
        unitKerja: TEST_UNIT,
        kronologi: 'Test Kronologi',
        dampak: 'Mayor',
        status: 'DALAM_INVESTIGASI', // Harus dalam investigasi agar bisa bikin RCA
        jenisInsiden: 'KTD',
        gradingAwal: 'BIRU',
      },
    });
    reportId = report.id;

    // 3. Buat Admin Test
    const hashedPass = await bcrypt.hash('Password123!', 10);
    await db.user.create({
      data: {
        email: 'admin_kars@rs.com',
        nama: 'Admin KARS Test',
        noPegawai: 'KARS-999',
        passwordHash: hashedPass,
        role: 'ADMIN_UTAMA',
        unitKerja: 'MANAJEMEN',
        statusVerifikasi: 'APPROVED',
      },
    });

    // 4. Login via API untuk dapat token (seperti E2E)
    await request(app).post('/api/auth/login').send({
      identifier: 'admin_kars@rs.com',
      password: 'Password123!',
    });
    const otp = await redis.get('otp:admin_kars@rs.com');
    const otpRes = await request(app).post('/api/auth/login/otp').send({
      email: 'admin_kars@rs.com',
      otp: otp,
    });
    adminToken = otpRes.body.data.accessToken;

    // 5. Inisialisasi RCA kosong terlebih dahulu
    await request(app)
      .post(`/api/reports/${reportId}/rca`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        kronologiSingkat: 'Singkat',
        masalahAwal5Why: 'Masalah',
        tindakanSesuaiBands: 'Bands tindakan',
        fiveWhyEntries: [],
        fishboneEntries: [],
        rencanaPerbaikanEntries: [],
      });
  });

  afterAll(async () => {
    await db.rootCauseAnalysis.deleteMany({ where: { report: { unitKerja: TEST_UNIT } } });
    await db.report.deleteMany({ where: { unitKerja: TEST_UNIT } });
    await db.user.deleteMany({ where: { email: 'admin_kars@rs.com' } });
    redis.disconnect();
  });

  it('Bisa menambah anggota tim investigator', async () => {
    // Cari user admin yang dibuat di beforeAll
    const admin = await db.user.findFirst({ where: { email: 'admin_kars@rs.com' } });
    const res = await request(app)
      .post(`/api/reports/${reportId}/rca/team`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: admin?.id,
        peran: PeranTim.KETUA,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(admin?.id);
    expect(res.body.data.peran).toBe(PeranTim.KETUA);

    const getRes = await request(app)
      .get(`/api/reports/${reportId}/rca`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.body.data.teamMembers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: admin?.id, peran: PeranTim.KETUA }),
      ]),
    );
  });

  it('Field tindakanBands tersimpan dan bisa diambil kembali lewat GET', async () => {
    const res = await request(app)
      .put(`/api/reports/${reportId}/rca`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        kronologiSingkat: 'Singkat',
        masalahAwal5Why: 'Masalah',
        tindakanBands: 'KUNING',
        fiveWhyEntries: [],
        fishboneEntries: [],
        rencanaPerbaikanEntries: [],
      });
    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/reports/${reportId}/rca`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.body.data.tindakanBands).toBe('KUNING');
  });

  it('Kalau jenisPengisian TEMPLATE dipilih, fishboneEntries otomatis terisi template default', async () => {
    // Kita hapus dulu fishbone entries secara manual (jika ada) untuk test ini
    await db.rcaFishboneEntry.deleteMany({ where: { rca: { reportId } } });

    const res = await request(app)
      .put(`/api/reports/${reportId}/rca`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        kronologiSingkat: 'Singkat',
        masalahAwal5Why: 'Masalah',
        jenisPengisian: JenisPengisian.TEMPLATE,
        fiveWhyEntries: [],
        fishboneEntries: [], // Kosong dikirim dari client
        rencanaPerbaikanEntries: [],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.fishboneEntries).toHaveLength(4);
    expect(res.body.data.fishboneEntries[0].kategori).toBe(KategoriFishbone.MAN);
    expect(res.body.data.fishboneEntries[0].penyebab).toBe('Deskripsikan masalah terkait Manusia');
  });

  it('Kalau jenisPengisian bukan TEMPLATE, fishboneEntries mengikuti input manual yang dikirim', async () => {
    await db.rcaFishboneEntry.deleteMany({ where: { rca: { reportId } } });

    const res = await request(app)
      .put(`/api/reports/${reportId}/rca`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        kronologiSingkat: 'Singkat',
        masalahAwal5Why: 'Masalah',
        jenisPengisian: JenisPengisian.CUSTOM,
        fiveWhyEntries: [],
        fishboneEntries: [
          { kategori: KategoriFishbone.MATERIAL, penyebab: 'Bahan baku kurang', urutan: 1 },
        ],
        rencanaPerbaikanEntries: [],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.fishboneEntries).toHaveLength(1);
    expect(res.body.data.fishboneEntries[0].kategori).toBe(KategoriFishbone.MATERIAL);
    expect(res.body.data.fishboneEntries[0].penyebab).toBe('Bahan baku kurang');
  });
});
