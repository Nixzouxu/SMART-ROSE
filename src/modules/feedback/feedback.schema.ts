import { z } from 'zod';
import { JenisFeedback } from '@prisma/client';

export const createFeedbackSchema = z.object({
  body: z.object({
    catatan: z.string().min(1, 'Catatan harus diisi'),
    jenis: z.nativeEnum(JenisFeedback),
  }),
});
