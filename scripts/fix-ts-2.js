const fs = require('fs');

function replaceInFile(f, regex, replacement) {
  let data = fs.readFileSync(f, 'utf8');
  data = data.replace(regex, replacement);
  fs.writeFileSync(f, data);
}

replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /changedById/g, 'actorId');
replaceInFile('src/modules/reports/attachment.controller.ts', /req\.params\.reportId/g, '(req.params.reportId as string)');
replaceInFile('src/modules/reports/attachment.controller.ts', /req\.params\.id/g, '(req.params.id as string)');
replaceInFile('src/modules/reports/qrcode.controller.ts', /req\.params\.id/g, '(req.params.id as string)');
replaceInFile('src/modules/reports/qrcode.controller.ts', /req\.params\.reportId/g, '(req.params.reportId as string)');
replaceInFile('src/modules/reports/reports.controller.ts', /req\.params\.id/g, '(req.params.id as string)');
replaceInFile('src/modules/reports/reports.controller.ts', /req\.params\.reportId/g, '(req.params.reportId as string)');

// Fix the mistaken createdAt -> timestamp on Report (Line 125)
// reports.service.ts line 125 is probably finding reports and ordering by createdAt.
// Let's just fix it by regex:
replaceInFile('src/modules/reports/reports.service.ts', /orderBy: \{ timestamp: 'desc' \}/g, "orderBy: { createdAt: 'desc' }");

console.log('Fixed TS Errors 2');
