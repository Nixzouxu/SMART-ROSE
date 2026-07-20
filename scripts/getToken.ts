import { db } from '../src/config/db';
import jwt from 'jsonwebtoken';

async function getToken() {
  const admin = await db.user.findFirst({ where: { role: 'ADMIN_UTAMA' } });
  if (!admin) {
    console.error('No admin found');
    process.exit(1);
  }
  const token = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role, unitKerja: admin.unitKerja },
    process.env.JWT_SECRET || 'supersecret',
    { expiresIn: '1d' }
  );
  console.log(token);
  process.exit(0);
}

getToken();
