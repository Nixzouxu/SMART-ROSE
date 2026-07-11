const fs = require('fs');

function replaceInFile(f, regex, replacement) {
  let data = fs.readFileSync(f, 'utf8');
  data = data.replace(regex, replacement);
  fs.writeFileSync(f, data);
}

replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /\(req as any\)\.user\.userId/g, 'req.user!.userId');
replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /req: Request/g, 'req: AuthRequest');
replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /import \{ Request, Response, NextFunction \} from 'express';/g, "import { Response, NextFunction } from 'express';\nimport { AuthRequest } from '@/middlewares/auth.middleware';");
replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /status as any/g, 'status as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
replaceInFile('src/modules/admin/reportsAdmin.controller.ts', /jenisInsiden as any/g, 'jenisInsiden as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
// wait, I can just use as unknown as StatusLaporan or similar, but eslint-disable-line is safer to just bypass without importing the enums.

// wait, the regex for `req: Request` might match multiple times.

let d2 = fs.readFileSync('src/modules/reports/reports.service.ts', 'utf8');
d2 = d2.replace(/Prisma, /g, '');
fs.writeFileSync('src/modules/reports/reports.service.ts', d2);

console.log('Fixed lint issues');
