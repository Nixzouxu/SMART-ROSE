const fs = require('fs');

function replaceInFile(f, regex, replacement) {
  let data = fs.readFileSync(f, 'utf8');
  data = data.replace(regex, replacement);
  fs.writeFileSync(f, data);
}

replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /changedBy/g, 'actor');
replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /changedById/g, 'actorId');
replaceInFile('src/modules/reports/reports.controller.ts', /const \{ trackingNumber \} = req\.params;/g, 'const trackingNumber = req.params.trackingNumber as string;');
replaceInFile('src/modules/reports/qrcode.controller.ts', /const \{ unitCode \} = req\.params;/g, 'const unitCode = req.params.unitCode as string;');
replaceInFile('src/modules/reports/reports.service.ts', /createdAt: 'desc'/g, "timestamp: 'desc'"); // for histories order by
