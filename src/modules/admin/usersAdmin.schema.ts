import { z } from 'zod';

export const updateUserSchema = z.object({
  body: z
    .object({
      nama: z.string().min(3, 'Nama minimal 3 karakter').optional(),
      email: z.string().email('Format email tidak valid').optional(),
      role: z.enum(['ADMIN', 'ADMIN_UTAMA']).optional(),
      unitKerja: z.string().min(1, 'Unit kerja tidak boleh kosong').optional(),
      aktif: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Minimal 1 field harus dikirim untuk update',
    }),
  params: z.object({
    id: z.string().uuid('ID tidak valid'),
  }),
});

export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID tidak valid'),
  }),
});

export type UpdateUserBody = z.infer<typeof updateUserSchema>['body'];
