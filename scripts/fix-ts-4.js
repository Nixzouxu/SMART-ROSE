const fs = require('fs');

function replaceInFile(f, regex, replacement) {
  let data = fs.readFileSync(f, 'utf8');
  data = data.replace(regex, replacement);
  fs.writeFileSync(f, data);
}

replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /action:/g, 'aksi:');

// In reports.service.ts, the first orderBy should be createdAt, the second is inside histories.
// Let's just reset reports.service.ts and replace properly.
// The file has two places: `orderBy: { createdAt: 'desc' }` (for reports)
// and `histories: { ... orderBy: { createdAt: 'desc' } }`
let svcData = fs.readFileSync('src/modules/reports/reports.service.ts', 'utf8');
// Undo previous bad replace
svcData = svcData.replace(/orderBy: \{ timestamp: 'desc' \}/g, "orderBy: { createdAt: 'desc' }");
// Now specifically target the histories' orderBy
svcData = svcData.replace(/histories: \{\s*orderBy: \{ createdAt: 'desc' \}/g, "histories: { orderBy: { timestamp: 'desc' }");
fs.writeFileSync('src/modules/reports/reports.service.ts', svcData);

console.log('Fixed TS Errors 4');
