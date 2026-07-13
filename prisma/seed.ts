import { db as prisma } from '../src/config/db';
import bcrypt from 'bcrypt';

async function main() {
  // --- User Admin Utama default ---
  const adminEmail = 'admin@smartrose.local';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
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
      },
    });

    console.log('Seed: User ADMIN_UTAMA created with email:', adminEmail);
    console.log('IMPORTANT: Please change this default password immediately!');
  } else {
    console.log('Seed: User ADMIN_UTAMA already exists.');
  }

  // --- User Sistem Otomatis ---
  // Akun ini BUKAN untuk login sungguhan.
  // Digunakan semata-mata sebagai actorId pada ReportHistory untuk aksi
  // otomatis yang dijalankan oleh sistem (misalnya: AUTO_ESCALATE_OVERDUE
  // dari cron job harian). Password hash dibuat acak dan tidak pernah
  // dipakai untuk autentikasi nyata.
  const systemEmail = 'system@smartrose.internal';

  const existingSystemUser = await prisma.user.findUnique({
    where: { email: systemEmail },
  });

  if (!existingSystemUser) {
    // Gunakan bcrypt dengan rounds tinggi pada string random panjang sehingga
    // tidak pernah bisa digunakan untuk login sungguhan.
    const randomSecret =
      `SYSTEM-ONLY-NOT-FOR-LOGIN-${Date.now()}-${Math.random().toString(36)}`;
    const passwordHash = await bcrypt.hash(randomSecret, 12);

    await prisma.user.create({
      data: {
        nama: 'Sistem Otomatis SMART-ROSE',
        email: systemEmail,
        // noPegawai harus unique; gunakan nilai khusus yang tidak mungkin
        // bentrok dengan nomor pegawai sungguhan.
        noPegawai: 'SYS-OTOMATIS-001',
        passwordHash,
        role: 'ADMIN_UTAMA',
        unitKerja: 'SISTEM',
        statusVerifikasi: 'APPROVED',
      },
    });

    console.log('Seed: User Sistem Otomatis SMART-ROSE created with email:', systemEmail);
    console.log('NOTE: Akun ini BUKAN untuk login. Hanya penanda aksi otomatis sistem.');
  } else {
    console.log('Seed: User Sistem Otomatis SMART-ROSE already exists.');
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
