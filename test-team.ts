import { db } from './src/config/db';
import jwt from 'jsonwebtoken';
process.env.NODE_ENV = 'development';
import { env } from './src/config/env';

async function run() {
  try {
    console.log('Generating dummy data...');
    const admin = await db.user.create({
      data: {
        email: 'admin_team@test.com',
        nama: 'Admin Team',
        noPegawai: '54321',
        passwordHash: 'hashedpassword',
        unitKerja: 'IT',
        role: 'ADMIN_UTAMA',
        statusVerifikasi: 'APPROVED'
      }
    });

    const admin2 = await db.user.create({
      data: {
        email: 'admin_team2@test.com',
        nama: 'Admin Team 2',
        noPegawai: '54322',
        passwordHash: 'hashedpassword',
        unitKerja: 'HR',
        role: 'ADMIN',
        statusVerifikasi: 'APPROVED'
      }
    });

    const report = await db.report.create({
      data: {
        trackingNumber: 'TEST-TEAM-RCA',
        jenisInsiden: 'KNC',
        tanggalKejadian: new Date(),
        lokasi: 'Test',
        unitKerja: 'Test',
        kronologi: 'Test',
        dampak: 'Test',
        gradingAwal: 'HIJAU',
      }
    });

    const rca = await db.rootCauseAnalysis.create({
      data: {
        reportId: report.id,
        kronologiSingkat: 'Test RCA',
        masalahAwal5Why: 'Test RCA',
        disusunOlehId: admin.id
      }
    });

    const token = jwt.sign(
      { userId: admin.id, role: 'ADMIN_UTAMA' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1d' }
    );

    const baseUrl = `http://localhost:4000/api/reports/${report.id}/rca/team`;

    console.log(`\n1. POST KETUA (admin)`);
    const r1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: admin.id, peran: 'KETUA' })
    });
    console.log(`HTTP ${r1.status}`);
    const memberKetua = (await r1.json()).data;
    console.log(memberKetua);

    console.log(`\n2. POST KETUA lagi dengan user lain (harus replace)`);
    const r2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: admin2.id, peran: 'KETUA' })
    });
    console.log(`HTTP ${r2.status}`);
    console.log((await r2.json()).data);

    console.log(`\n3. POST ANGGOTA`);
    const r3 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: admin.id, peran: 'ANGGOTA' })
    });
    console.log(`HTTP ${r3.status}`);
    const memberAnggota = (await r3.json()).data;
    console.log(memberAnggota);

    console.log(`\n4. GET TEAM MEMBERS`);
    const r4 = await fetch(baseUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`HTTP ${r4.status}`);
    console.log(JSON.stringify((await r4.json()).data, null, 2));

    console.log(`\n5. PATCH ANGGOTA jadi SEKRETARIS`);
    const r5 = await fetch(`${baseUrl}/${memberAnggota.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ peran: 'SEKRETARIS' })
    });
    console.log(`HTTP ${r5.status}`);
    console.log((await r5.json()).data);

    console.log(`\n6. DELETE KETUA`);
    const r6 = await fetch(`${baseUrl}/${memberKetua.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`HTTP ${r6.status}`);

    console.log(`\n7. GET MAIN RCA endpoint (verify relation)`);
    const r7 = await fetch(`http://localhost:4000/api/reports/${report.id}/rca`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const rcaData = (await r7.json()).data;
    console.log('Team Members from RCA GET:', JSON.stringify(rcaData.teamMembers, null, 2));

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await db.$disconnect();
  }
}

run();
