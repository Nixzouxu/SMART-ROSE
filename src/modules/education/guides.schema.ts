import { z } from 'zod';

export const createGuideSchema = z.object({
  body: z.object({
    judul: z.string().min(3).max(150),
    kategori: z.enum(['cara_pelaporan', 'tujuan_aplikasi', 'skenario', 'edukasi_ikp']),
    konten: z.string().min(10),
    tipeMedia: z.enum(['TEXT', 'IMAGE', 'VIDEO']).default('TEXT'),
    mediaUrl: z.string().url().optional().nullable(),
  }),
});

export const updateGuideSchema = z.object({
  body: createGuideSchema.shape.body.partial(),
});

export const searchGuideSchema = z.object({
  query: z.object({
    q: z.string().min(1),
  }),
});
