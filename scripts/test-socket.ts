import { io } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/config/db';
import { signAccessToken } from '../src/utils/token';
import { initSocket } from '../src/config/socket';
import { createServer } from 'http';

async function setupTestUsers() {
  // 1. Admin A
  let adminA = await db.user.findFirst({ where: { email: 'admin_a@test.com' } });
  if (!adminA) {
    adminA = await db.user.create({
      data: {
        email: 'admin_a@test.com', nama: 'Admin A', noPegawai: 'A001',
        passwordHash: 'dummy', role: 'ADMIN', unitKerja: 'Test', statusVerifikasi: 'APPROVED',
      }
    });
  } else {
    await db.user.update({ where: { id: adminA.id }, data: { statusVerifikasi: 'APPROVED' } });
  }

  // 2. Admin B
  let adminB = await db.user.findFirst({ where: { email: 'admin_b@test.com' } });
  if (!adminB) {
    adminB = await db.user.create({
      data: {
        email: 'admin_b@test.com', nama: 'Admin B', noPegawai: 'B001',
        passwordHash: 'dummy', role: 'ADMIN', unitKerja: 'Test', statusVerifikasi: 'APPROVED',
      }
    });
  } else {
    await db.user.update({ where: { id: adminB.id }, data: { statusVerifikasi: 'APPROVED' } });
  }

  // 3. Non-Admin (Reporter)
  let userC = await db.user.findFirst({ where: { email: 'user_c@test.com' } });
  if (!userC) {
    userC = await db.user.create({
      data: {
        email: 'user_c@test.com', nama: 'User C', noPegawai: 'C001',
        passwordHash: 'dummy', role: 'USER', unitKerja: 'Test', statusVerifikasi: 'APPROVED',
      }
    });
  } else {
    await db.user.update({ where: { id: userC.id }, data: { statusVerifikasi: 'APPROVED' } });
  }

  return {
    tokenA: signAccessToken({ userId: adminA.id, role: adminA.role }),
    tokenB: signAccessToken({ userId: adminB.id, role: adminB.role }),
    tokenC: signAccessToken({ userId: userC.id, role: userC.role }),
    adminA, adminB, userC
  };
}

async function runSocketTest() {
  const expressApp = await createApp();
  const httpServer = createServer(expressApp);
  initSocket(httpServer);

  // Bind to a random port
  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const port = (httpServer.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Server started on ${baseUrl}`);
  const { tokenA, tokenB, tokenC, adminA } = await setupTestUsers();

  console.log('\n--- SCENARIO 2: GAGAL AUTH (INVALID TOKEN) ---');
  const socketInvalid = io(baseUrl, { auth: { token: 'invalid_token' } });
  await new Promise<void>((resolve) => {
    socketInvalid.on('connect_error', (err) => {
      console.log('✅ Ditolak (Invalid):', err.message);
      socketInvalid.disconnect();
      resolve();
    });
  });

  console.log('\n--- SCENARIO 3: GAGAL AUTH (NON-ADMIN) ---');
  const socketNonAdmin = io(baseUrl, { auth: { token: tokenC } });
  await new Promise<void>((resolve) => {
    socketNonAdmin.on('connect_error', (err) => {
      console.log('✅ Ditolak (Non-Admin):', err.message);
      socketNonAdmin.disconnect();
      resolve();
    });
  });

  console.log('\n--- SCENARIO 1 & 4: SUKSES & ISOLASI ROOM ---');
  const socketA = io(baseUrl, { auth: { token: tokenA } });
  const socketB = io(baseUrl, { auth: { token: tokenB } });

  let eventA = false;
  let eventB = false;

  socketA.on('notification:new', (data) => {
    console.log('✅ Socket Admin A menerima event notification:new:', data);
    eventA = true;
  });

  socketB.on('notification:new', (data) => {
    console.log('❌ BUGS: Socket Admin B menerima event yang harusnya hanya untuk A:', data);
    eventB = true;
  });

  await Promise.all([
    new Promise<void>((resolve) => socketA.on('connect', resolve)),
    new Promise<void>((resolve) => socketB.on('connect', resolve))
  ]);
  
  console.log('Socket A & B terhubung.');
  
  // Create specific notification for Admin A
  const { createNotification } = require('../src/modules/notifications/notifications.service');
  await createNotification(adminA.id, 'UPDATE', 'Notifikasi spesifik untuk A', 'test-ref');
  
  // Wait a bit to receive event
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (eventA && !eventB) {
    console.log('✅ Isolasi Room Berhasil: Hanya Admin A yang menerima notifikasi spesifik.');
  } else {
    console.log('❌ Isolasi Gagal!', { eventA, eventB });
  }
  
  console.log('\nSekarang test Trigger Nyata (POST /reports) -> Semua admin (A & B) harus terima (Skenario 1)');
  let eventA2 = false;
  let eventB2 = false;
  
  socketA.removeAllListeners('notification:new');
  socketB.removeAllListeners('notification:new');
  
  socketA.once('notification:new', (data) => { 
    console.log('✅ Socket Admin A menerima laporan:', data.pesan);
    eventA2 = true; 
  });
  socketB.once('notification:new', (data) => { 
    console.log('✅ Socket Admin B menerima laporan:', data.pesan);
    eventB2 = true; 
  });
  
  await request(expressApp)
    .post('/api/reports')
    .send({
      jenisInsiden: 'KTD',
      tanggalKejadian: new Date().toISOString(),
      lokasi: 'Test',
      unitKerja: 'Test',
      kronologi: 'Test Isolasi',
      dampak: 'Ringan',
      gradingAwal: 'HIJAU',
      statusPasienSaatInsiden: 'RAWAT_INAP',
      tindakanDilakukan: '-',
      tindakanDilakukanOleh: '-',
      akarPenyebab: '-',
      rekomendasi: '-',
      apakahKejadianSerupaPernahTerjadi: false
    })
    .expect(201);
    
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (eventA2 && eventB2) {
    console.log('✅ Broadcast ke semua admin berhasil (Laporan Baru).');
  } else {
    console.log('❌ Broadcast Gagal!', { eventA2, eventB2 });
  }

  socketA.disconnect();
  socketB.disconnect();
  httpServer.close();
  await db.$disconnect();
  
  console.log('\n✅ Test Socket Selesai');
  process.exit(0);
}

runSocketTest().catch(console.error);
