import { db } from '../src/config/db';
import { signAccessToken } from '../src/utils/token';

const API_URL = 'http://localhost:4000/api';

async function runTest() {
  console.log('--- STARTING CHATBOT ADMIN VALIDATION TEST ---');

  let admin = await db.user.findFirst({ where: { role: 'ADMIN' } });
  const adminToken = signAccessToken({ userId: admin.id, role: admin.role });
  const adminHeaders = { 
    'Authorization': 'Bearer ' + adminToken,
    'Content-Type': 'application/json'
  };

  console.log('\n1. Mengirim pertanyaan aneh ke chatbot publik...');
  const askRes = await fetch(API_URL + '/chatbot/public/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pertanyaan: 'Zyxwvuts Mxyzptlk terbang ke bulan?' })
  });
  const askData = await askRes.json();
  const logId = askData.data?.logId;

  if (!logId) {
     console.log('Gagal mendapatkan logId. Berhenti.');
     return;
  }
  console.log('Log ID didapat:', logId);

  console.log('\n2. Test Validasi: Menjawab dengan jawaban KOSONG...');
  const jawabKosongRes = await fetch(API_URL + '/chatbot/pertanyaan/' + logId + '/jawab', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ jawaban: '' })
  });
  const jawabKosongData = await jawabKosongRes.json();
  console.log('Response Jawab Kosong (Diharapkan ERROR):', JSON.stringify(jawabKosongData, null, 2));

  console.log('\n3. Menjawab pertanyaan dengan BENAR...');
  const jawabRes = await fetch(API_URL + '/chatbot/pertanyaan/' + logId + '/jawab', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ jawaban: 'Itu rahasia dimensi ke-6.' })
  });
  const jawabData = await jawabRes.json();
  console.log('Response Jawab:', JSON.stringify(jawabData, null, 2));

  console.log('\n4. Test Validasi: Menjawab KEDUA KALINYA untuk pertanyaan yang sama...');
  const jawabDuaRes = await fetch(API_URL + '/chatbot/pertanyaan/' + logId + '/jawab', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ jawaban: 'Jawaban menimpa yang lama' })
  });
  const jawabDuaData = await jawabDuaRes.json();
  console.log('Response Jawab Kedua Kali (Diharapkan ERROR):', JSON.stringify(jawabDuaData, null, 2));

  console.log('\n--- TEST SELESAI ---');
}

runTest().catch(console.error).finally(() => db.$disconnect());
