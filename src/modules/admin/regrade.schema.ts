// src/modules/admin/regrade.schema.ts
// Validasi input untuk endpoint regrading laporan.

import { z } from 'zod';

export const regradeReportSchema = z.object({
  body: z.object({
    gradingBaru: z.enum(['HIJAU', 'BIRU', 'KUNING', 'MERAH']),
    alasan: z
      .string()
      .min(10, 'Alasan regrading minimal 10 karakter')
      .max(2000, 'Alasan regrading maksimal 2000 karakter'),
  }),
});
