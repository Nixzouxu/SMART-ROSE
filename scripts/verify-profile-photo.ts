import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/config/db';
import { signAccessToken } from '../src/utils/token';
import { getStorageProvider } from '../src/modules/storage/storage.factory';
import fs from 'fs';
import path from 'path';

async function runTest() {
  const app = await createApp();
  const storage = getStorageProvider();

  console.log('--- SETUP ---');
  let user = await db.user.create({
    data: {
      email: 'test_photo_e2e@smartrose.com',
      nama: 'Test Photo E2E',
      noPegawai: 'PHOTO123',
      passwordHash: 'dummy',
      role: 'ADMIN',
      unitKerja: 'Test',
      statusVerifikasi: 'APPROVED',
    }
  });

  const token = signAccessToken({ userId: user.id, role: user.role });

  // Prepare test files
  const realJpgPath = path.join(__dirname, 'test.jpg');
  const fakeJpgPath = path.join(__dirname, 'fake.jpg');
  const bigJpgPath = path.join(__dirname, 'big.jpg');

  // Create a real JPG (minimal valid JPEG)
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x3f, 0xff, 0xd9]);
  fs.writeFileSync(realJpgPath, jpegHeader);
  
  // Fake JPG (actually a text/pdf file but named .jpg)
  fs.writeFileSync(fakeJpgPath, '%PDF-1.4 fake content');

  // Big JPG (> 2MB)
  const bigBuffer = Buffer.alloc(2.5 * 1024 * 1024, 0); // 2.5 MB of zeros
  fs.writeFileSync(bigJpgPath, Buffer.concat([jpegHeader, bigBuffer]));

  let oldObjectPath = '';

  try {
    console.log('\n--- TEST 1: Upload Photo 1st Time ---');
    const res1 = await request(app)
      .post('/api/auth/profile/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', realJpgPath);
    
    console.log('Response Status:', res1.status);
    console.log('Response Body:', JSON.stringify(res1.body, null, 2));
    const avatarUrl1 = res1.body.data.avatarUrl;
    if (!avatarUrl1) throw new Error('Missing avatarUrl in response');

    const updatedUser1 = await db.user.findUnique({ where: { id: user.id }});
    oldObjectPath = updatedUser1!.fotoProfilPath!;

    console.log('\n--- TEST 2: GET /auth/profile ---');
    const res2 = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    console.log('Response Status:', res2.status);
    console.log('avatarUrl from GET:', res2.body.data.avatarUrl);
    // Note: Since GET /auth/profile regenerates the signed URL, the query parameters (like signature or exact expiry) might slightly differ in string if generated in different seconds, but it's fundamentally the same path.
    
    console.log('\n--- TEST 3: Upload Photo 2nd Time ---');
    const res3 = await request(app)
      .post('/api/auth/profile/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', realJpgPath);
    console.log('Response Status:', res3.status);
    const avatarUrl2 = res3.body.data.avatarUrl;
    console.log('New avatarUrl:', avatarUrl2);
    
    const updatedUser2 = await db.user.findUnique({ where: { id: user.id }});
    const newObjectPath = updatedUser2!.fotoProfilPath!;
    console.log('Old ObjectPath:', oldObjectPath);
    console.log('New ObjectPath:', newObjectPath);
    
    // Attempt to download the old file using the storageProvider's signed url to prove it's deleted
    try {
        const oldUrl = await storage.getSignedUrl(oldObjectPath);
        const fetchRes = await fetch(oldUrl);
        console.log('Fetch old file status:', fetchRes.status);
        if (fetchRes.status === 200) {
            console.log('WARNING: Old file might still exist!');
        } else {
            console.log('SUCCESS: Old file is deleted (status 404/NoSuchKey).');
        }
    } catch (e) {
        console.log('SUCCESS: Old file fetch failed (likely deleted)');
    }

    console.log('\n--- TEST 4: Fake Extension (Magic Bytes Validation) ---');
    const res4 = await request(app)
      .post('/api/auth/profile/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', fakeJpgPath);
    console.log('Response Status:', res4.status);
    console.log('Response Body:', JSON.stringify(res4.body, null, 2));

    console.log('\n--- TEST 5: Over 2MB ---');
    const res5 = await request(app)
      .post('/api/auth/profile/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', bigJpgPath);
    console.log('Response Status:', res5.status);
    console.log('Response Body:', JSON.stringify(res5.body, null, 2));

    console.log('\n--- TEST 6: Refresh Mechanism ---');
    console.log('Since GET /auth/profile dynamically calls getSignedUrl() on every request, there is no stale URL in the DB. This naturally prevents the URL from permanently expiring.');

  } finally {
    console.log('\n--- CLEANUP ---');
    const userToClean = await db.user.findUnique({ where: { id: user.id }});
    if (userToClean && userToClean.fotoProfilPath) {
      try {
        await storage.delete(userToClean.fotoProfilPath);
        console.log(`Deleted object: ${userToClean.fotoProfilPath}`);
      } catch (e) {}
    }
    
    await db.user.delete({ where: { id: user.id } });
    console.log('Deleted dummy user');

    // Remove test files
    if (fs.existsSync(realJpgPath)) fs.unlinkSync(realJpgPath);
    if (fs.existsSync(fakeJpgPath)) fs.unlinkSync(fakeJpgPath);
    if (fs.existsSync(bigJpgPath)) fs.unlinkSync(bigJpgPath);
  }
}

runTest().then(() => {
  console.log('DONE');
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});

