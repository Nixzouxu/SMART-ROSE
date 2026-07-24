import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/config/db';
import { signAccessToken } from '../src/utils/token';

async function runTest() {
  const app = await createApp();
  
  // 1. Dapatkan admin test (misal aulialtfi18@gmail.com atau admin pertama)
  let admin = await db.user.findFirst({
    where: { role: 'ADMIN' },
  });
  
  let createdAdmin = false;
  if (!admin) {
    admin = await db.user.create({
      data: {
        email: 'test_admin_e2e@smartrose.com',
        nama: 'Test Admin E2E',
        noPegawai: '1234567890',
        passwordHash: 'dummy',
        role: 'ADMIN',
        unitKerja: 'Test',
        statusVerifikasi: 'APPROVED',
      }
    });
    createdAdmin = true;
  } else {
    // Force approved just in case it was created pending in previous run
    await db.user.update({
      where: { id: admin.id },
      data: { statusVerifikasi: 'APPROVED' }
    });
  }

  const token = signAccessToken({
    userId: admin.id,
    role: admin.role,
  });

  console.log('--- TEST E2E: NOTIFIKASI LAPORAN BARU ---');
  
  // 2. Submit laporan baru sebagai publik
  const payload = {
    jenisInsiden: 'KTD',
    tanggalKejadian: new Date().toISOString(),
    lokasi: 'Test API',
    unitKerja: 'Test Unit',
    kronologi: 'Test E2E Notification',
    dampak: 'Ringan',
    gradingAwal: 'HIJAU',
    statusPasienSaatInsiden: 'RAWAT_INAP',
    tindakanDilakukan: 'Test Tindakan',
    tindakanDilakukanOleh: 'Test Oleh',
    akarPenyebab: 'Test Akar',
    rekomendasi: 'Test Rekomendasi',
    apakahKejadianSerupaPernahTerjadi: false
  };

  console.log('POST /api/reports dengan payload:', payload);
  const resPost = await request(app)
    .post('/api/reports')
    .send(payload);
    
  if (resPost.status !== 201) {
    console.error('Validation Error:', resPost.body);
    throw new Error(`Expected 201, got ${resPost.status}`);
  }
    
  console.log('Response POST /api/reports:', resPost.body);
  const reportId = resPost.body.data.id;

  // 3. Login sebagai admin dan cek /notifications/me
  console.log(`\nGET /api/notifications/me sebagai Admin (${admin.email})`);
  const resGet = await request(app)
    .get('/api/notifications/me')
    .set('Authorization', `Bearer ${token}`);
    
  if (resGet.status !== 200) {
    console.error('Auth/Fetch Error:', resGet.body);
    throw new Error(`Expected 200, got ${resGet.status}`);
  }
    
  // Cari notifikasi yang memiliki referensiId = reportId
  const notif = resGet.body.data.items.find((n: any) => n.referensiId === reportId);
  
  if (notif) {
    console.log('SUCCESS! Notifikasi ditemukan di response API:');
    console.log(JSON.stringify(notif, null, 2));
  } else {
    console.log('FAILED! Notifikasi tidak ditemukan di response API.');
    console.log('Semua Notifikasi terbaru:', resGet.body.data.slice(0, 3));
  }

  console.log('\n--- CLEANUP ---');
  await db.notification.deleteMany({ where: { referensiId: reportId } });
  await db.report.delete({ where: { id: reportId } });
  if (createdAdmin) {
    await db.user.delete({ where: { id: admin.id } });
  }
  console.log('Selesai.');
}

runTest().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
