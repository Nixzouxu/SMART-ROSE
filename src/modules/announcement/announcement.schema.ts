import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  body: z.object({
    judul: z.string().min(5, 'Judul pengumuman wajib diisi, minimal 5 karakter'),
    isi: z.string().min(10, 'Isi pengumuman wajib diisi, minimal 10 karakter'),
    targetRole: z.enum(['SEMUA', 'USER', 'ADMIN']).optional(),
    isAktif: z.boolean().optional(),
  }),
});

export const updateAnnouncementSchema = z.object({
  body: z.object({
    judul: z.string().min(5).optional(),
    isi: z.string().min(10).optional(),
    targetRole: z.enum(['SEMUA', 'USER', 'ADMIN']).optional(),
  }),
});
