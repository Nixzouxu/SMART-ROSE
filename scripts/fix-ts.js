const fs = require('fs');

function replaceInFile(f, regex, replacement) {
  let data = fs.readFileSync(f, 'utf8');
  data = data.replace(regex, replacement);
  fs.writeFileSync(f, data);
}

replaceInFile('src/modules/reports/attachment.controller.ts', /const \{ id \} = req\.params;/g, 'const id = req.params.id as string;');
replaceInFile('src/modules/reports/qrcode.controller.ts', /const \{ id \} = req\.params;/g, 'const id = req.params.id as string;');
replaceInFile('src/modules/reports/reports.controller.ts', /const \{ id \} = req\.params;/g, 'const id = req.params.id as string;');

replaceInFile('src/modules/reports/reports.service.ts', /orderBy: \{ createdAt: 'desc' \}/g, "orderBy: { timestamp: 'desc' }");

let attachSvc = fs.readFileSync('src/modules/reports/attachment.service.ts', 'utf8');
attachSvc = attachSvc.replace(/import \{ v4 as uuidv4 \} from 'uuid';/g, "import { randomUUID } from 'crypto';");
attachSvc = attachSvc.replace(/uuidv4\(\)/g, "randomUUID()");
fs.writeFileSync('src/modules/reports/attachment.service.ts', attachSvc);
console.log('Fixed TS Errors');
