const fs = require('fs');

let testScript = fs.readFileSync('scripts/test-fase3.mjs', 'utf8');

// Insert 6.2 after 6.1
const trackAnon = `
  // --- 6.2. Akses Tracking Publik Laporan Anonim ---
  const anonimTrackingNumber = anonimData.data.trackingNumber;
  console.log(\`\\n[6.2] Akses Tracking Publik Laporan Anonim (\${anonimTrackingNumber})\`);
  const anonTrackRes = await fetch(\`\${API_URL}/reports/track/\${anonimTrackingNumber}\`);
  const anonTrackData = await anonTrackRes.json();
  console.log('Data Track Anonim (Publik - pelaporId HARUS undefined/null):', JSON.stringify(anonTrackData.data, null, 2));
`;
testScript = testScript.replace(/console\.log\(\`Anonim Laporan Dibuat: ID \$\{anonimReportId\}\`\);/, "console.log(`Anonim Laporan Dibuat: ID ${anonimReportId}`);\n" + trackAnon);

// Insert 12.2 Admin viewing the anon report
const adminTrackAnon = `
  // --- 12.2 Tes Admin Membaca Laporan Anonim ---
  console.log(\`\\n[12.2] Admin Utama Melihat Detail Laporan Anonim (Id: \${anonimReportId})\`);
  const adminGetAnonRes = await fetch(\`\${API_URL}/admin/reports/\${anonimReportId}\`, {
    headers: { 'Authorization': \`Bearer \${tokenAdmin}\` }
  });
  const adminGetAnonData = await adminGetAnonRes.json();
  console.log('Data Laporan Anonim (Admin - pelaporId HARUS ADA):', JSON.stringify({
    id: adminGetAnonData.data.id,
    pelaporId: adminGetAnonData.data.pelaporId,
    pelapor: adminGetAnonData.data.pelapor
  }, null, 2));
`;

testScript = testScript.replace(/console\.log\(`Pesan Berhasil: \$\{deleteHardAdminData\.message\}`\);/, "console.log(`Pesan Berhasil: ${deleteHardAdminData.message}`);\n" + adminTrackAnon);

fs.writeFileSync('scripts/test-fase3.mjs', testScript);
console.log('Test script updated.');
