import { db as prisma } from '../src/config/db';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'ariyani.16r@gmail.com';
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!password) {
    console.error('Error: Environment variable SUPERADMIN_PASSWORD is not set.');
    console.error('Please set it before running this script.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists. Updating role and status...`);
    await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN_UTAMA',
        aktif: true,
        deletedAt: null,
        passwordHash, // memperbarui password ke yang baru diberikan
      },
    });
    console.log(`Berhasil mengupdate akun ${email} menjadi ADMIN_UTAMA yang aktif.`);
  } else {
    console.log(`User ${email} does not exist. Creating new account...`);
    await prisma.user.create({
      data: {
        nama: 'Ariyani',
        email,
        noPegawai: 'SA-ARIYANI',
        passwordHash,
        role: 'ADMIN_UTAMA',
        unitKerja: 'Manajemen',
        statusVerifikasi: 'APPROVED',
        aktif: true,
      },
    });
    console.log(`Berhasil membuat akun baru ${email} sebagai ADMIN_UTAMA.`);
  }
}

main()
  .catch((e) => {
    console.error('Error saat mengeksekusi script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
