// src/modules/dashboard/dashboard.schema.ts
// Validasi query parameter untuk endpoint dashboard (rentang tanggal opsional).

import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  query: z.object({
    startDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'startDate harus berformat tanggal valid (ISO 8601)',
      }),
    endDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'endDate harus berformat tanggal valid (ISO 8601)',
      }),
  }),
});
