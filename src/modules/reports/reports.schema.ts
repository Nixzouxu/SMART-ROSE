import { z } from 'zod';

export const createReportSchema = z.object({
  body: z.object({
    jenisInsiden: z.enum(['KTD', 'KNC', 'KTC', 'KPC', 'SENTINEL']),
    tanggalKejadian: z.coerce.date(),
    lokasi: z.string().min(1, 'Lokasi wajib diisi'),
    unitKerja: z.string().min(1, 'Unit kerja wajib diisi'),
    kronologi: z
      .string()
      .min(10, 'Kronologi minimal 10 karakter')
      .max(5000, 'Kronologi maksimal 5000 karakter'),
    dampak: z.string().min(1, 'Dampak wajib diisi'),
    gradingAwal: z.enum(['HIJAU', 'BIRU', 'KUNING', 'MERAH']),
    isAnonim: z.boolean().default(false),
    status: z.enum(['DRAFT', 'SUBMITTED']).default('DRAFT'),
  }),
});

export const updateReportSchema = z.object({
  body: z.object({
    jenisInsiden: z.enum(['KTD', 'KNC', 'KTC', 'KPC', 'SENTINEL']).optional(),
    tanggalKejadian: z.coerce.date().optional(),
    lokasi: z.string().optional(),
    unitKerja: z.string().optional(),
    kronologi: z.string().min(10).max(5000).optional(),
    dampak: z.string().optional(),
    gradingAwal: z.enum(['HIJAU', 'BIRU', 'KUNING', 'MERAH']).optional(),
    isAnonim: z.boolean().optional(),
    status: z.enum(['DRAFT', 'SUBMITTED']).optional(),
  }),
});

export const listReportsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
  }),
});

export const adminListReportsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    status: z
      .enum([
        'DRAFT',
        'SUBMITTED',
        'DALAM_INVESTIGASI',
        'MENUNGGU_VERIFIKASI',
        'SELESAI',
        'OVERDUE',
        'ARSIP',
      ])
      .optional(),
    jenisInsiden: z.enum(['KTD', 'KNC', 'KTC', 'KPC', 'SENTINEL']).optional(),
    unitKerja: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});
