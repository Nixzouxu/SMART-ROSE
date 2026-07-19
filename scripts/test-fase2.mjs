import pg from 'pg';
const { Client } = pg;

const API_URL = 'http://localhost:4000/api';

async function runTests() {
  console.log("=== MEMULAI PENGUJIAN API FASE 2 ===\n");

  const email = `testuser_${Date.now()}@test.com`;
  const noPegawai = `${Date.now()}`.slice(0, 10);
  const password = 'Password123!';
  const nama = 'User Test';
  const unitKerja = 'IT Department';

  console.log(`[1.1] Register User Baru (NoPegawai: ${noPegawai}, Email: ${email})`);
  const registerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noPegawai, email, password, nama, unitKerja })
  });
  console.log(`Status Register: ${registerRes.status}`);
  const registerData = await registerRes.json();
  console.log(`Response Register:`, JSON.stringify(registerData, null, 2));

  if (registerRes.status !== 201) {
    console.error("Register failed, stopping test.");
    return;
  }

  console.log(`\n[1.2] Approve User Manual via Query PG`);
  const client = new Client({
    connectionString: 'postgresql://smartrose:smartrosedev123@127.0.0.1:5433/smartrose_dev'
  });
  await client.connect();
  await client.query("UPDATE users SET status_verifikasi = 'APPROVED' WHERE email = $1", [email]);
  await client.end();
  
  console.log(`User ${email} telah di-approve (APPROVED).`);

  console.log(`\n[2.1] Login User (Mendapatkan Access Token & Cookie Refresh Token)`);
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password })
  });
  console.log(`Status Login: ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log(`Response Login:`, JSON.stringify(loginData, null, 2));
  
  let accessToken = loginData.data?.accessToken;
  let rawCookies = loginRes.headers.get('set-cookie');
  let refreshTokenCookie = rawCookies ? rawCookies.split(';')[0] : '';
  
  console.log(`\nExtracted AccessToken: ${accessToken ? accessToken.substring(0, 20) + '...' : 'NONE'}`);
  console.log(`Extracted RefreshToken Cookie: ${refreshTokenCookie}`);

  console.log(`\n[2.2] Tes Refresh Token (menunggu 1 detik agar 'iat' JWT berbeda)`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 
      'Cookie': refreshTokenCookie 
    }
  });
  console.log(`Status Refresh: ${refreshRes.status}`);
  const refreshData = await refreshRes.json();
  console.log(`Response Refresh:`, JSON.stringify(refreshData, null, 2));
  
  let newAccessToken = refreshData.data?.accessToken;
  console.log(`\nNew AccessToken: ${newAccessToken ? newAccessToken.substring(0, 20) + '...' : 'NONE'}`);
  console.log(`Apakah Token Berbeda?: ${accessToken !== newAccessToken ? 'YA' : 'TIDAK'}`);

  console.log(`\n[3.1] Tes Logout`);
  const logoutRes = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${newAccessToken}`,
      'Cookie': refreshTokenCookie
    }
  });
  console.log(`Status Logout: ${logoutRes.status}`);
  const logoutData = await logoutRes.json();
  console.log(`Response Logout:`, logoutData);

  console.log(`\n[3.2] Tes Refresh Token Setelah Logout (Seharusnya Gagal 401)`);
  const failRefreshRes = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 
      'Cookie': refreshTokenCookie 
    }
  });
  console.log(`Status Refresh setelah Logout: ${failRefreshRes.status}`);
  const failRefreshData = await failRefreshRes.json();
  console.log(`Response:`, failRefreshData);

  console.log(`\n[4] Tes requireRole (Akses /api/admin/users/pending dengan User Biasa)`);
  // Login lagi untuk dapat token valid
  const loginRes2 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password })
  });
  const loginData2 = await loginRes2.json();
  const validAccessToken = loginData2.data?.accessToken;

  const adminTestRes = await fetch(`${API_URL}/admin/users/pending`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${validAccessToken}`
    }
  });
  console.log(`Status Admin Endpoint: ${adminTestRes.status}`);
  const adminTestData = await adminTestRes.json();
  console.log(`Response:`, adminTestData);

  console.log(`\n[5] Tes Rate Limit Login (6 kali salah password beruntun)`);
  for (let i = 1; i <= 6; i++) {
    const rlRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'WrongPassword1!' })
    });
    console.log(`Percobaan ke-${i} | Status: ${rlRes.status}`);
    if (i === 6) {
      const rlData = await rlRes.json();
      console.log(`Response percobaan ke-6:`, rlData);
    }
  }

  console.log("\n=== SELESAI ===");
}

runTests().catch(console.error);
