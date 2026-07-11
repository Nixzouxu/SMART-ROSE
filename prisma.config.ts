// prisma.config.ts
// Konfigurasi Prisma 7+: URL database dan konfigurasi lain dipindahkan ke sini
// dari schema.prisma karena perubahan arsitektur di Prisma v7.
//
// File ini dibaca oleh Prisma CLI dan Prisma Client saat startup.
// Pastikan file ini tidak diimport langsung oleh kode aplikasi.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import path from 'path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node-dev -r tsconfig-paths/register --transpile-only ./prisma/seed.ts',
  },
});
