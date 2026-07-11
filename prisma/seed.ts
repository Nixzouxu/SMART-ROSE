import { db as prisma } from '../src/config/db';
import bcrypt from 'bcrypt';

async function main() {
  const adminEmail = 'admin@smartrose.local';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('AdminUtama123!', 10);
    
    await prisma.user.create({
      data: {
        nama: 'Super Admin',
        email: adminEmail,
        noPegawai: 'SA-001',
        passwordHash,
        role: 'ADMIN_UTAMA',
        unitKerja: 'KANTOR PUSAT',
        statusVerifikasi: 'APPROVED',
      }
    });
    
    console.log('Seed: User ADMIN_UTAMA created with email:', adminEmail);
    console.log('IMPORTANT: Please change this default password immediately!');
  } else {
    console.log('Seed: User ADMIN_UTAMA already exists.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
