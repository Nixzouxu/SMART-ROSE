import { db } from './src/config/db.js';

async function test() {
  try {
    const report = await db.report.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!report) { console.log('no report'); return; }
    await db.$executeRaw`DELETE FROM reports WHERE id = ${report.id}::uuid`;
    console.log('Success');
  } catch (e) {
    console.error(e);
  }
}
test();
