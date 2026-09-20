import { db as prisma } from '../src/config/db';
import bcrypt from 'bcrypt';
import { RoleType } from '@prisma/client';

async function main() {
  const email = process.env.NEW_ADMIN_EMAIL;
  const password = process.env.NEW_ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD;
  
  // Cast env var ke tipe enum RoleType, default ke 'ADMIN'
  const role = (process.env.NEW_ADMIN_ROLE as RoleType) || 'ADMIN';
  
  const nama = process.env.NEW_ADMIN_NAMA;
  const noPegawai = process.env.NEW_ADMIN_NO_PEGAWAI;
  const unitKerja = process.env.NEW_ADMIN_UNIT_KERJA;

  if (!email || !password || !nama || !noPegawai || !unitKerja) {
    console.error('Error: Environment variables NEW_ADMIN_EMAIL, NEW_ADMIN_PASSWORD (atau SUPERADMIN_PASSWORD), NEW_ADMIN_NAMA, NEW_ADMIN_NO_PEGAWAI, dan NEW_ADMIN_UNIT_KERJA wajib diisi.');
    console.error('Script ini tidak memiliki nilai default hardcode untuk argumen wajib tersebut.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists. Updating role to ${role} and status...`);
    await prisma.user.update({
      where: { email },
      data: {
        role,
        aktif: true,
        statusVerifikasi: 'APPROVED',
        deletedAt: null,
        passwordHash, // memperbarui password ke yang baru diberikan
      },
    });
    console.log(`Berhasil mengupdate akun ${email} menjadi ${role} yang aktif.`);
  } else {
    console.log(`User ${email} does not exist. Creating new account...`);
    await prisma.user.create({
      data: {
        nama,
        email,
        noPegawai,
        passwordHash,
        role,
        unitKerja,
        statusVerifikasi: 'APPROVED',
        aktif: true,
      },
    });
    console.log(`Berhasil membuat akun baru ${email} sebagai ${role}.`);
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
