import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '@/utils/apiError';
import { logger } from '@/utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validate = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Update request body with parsed values (useful for transforms)
      if (parsed.body) req.body = parsed.body;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zodError = error as any;
        const issues: z.ZodIssue[] = zodError.issues || zodError.errors || [];

        // Log detail validasi gagal — hanya nama field, alasan, dan kode error.
        // Nilai input TIDAK dicatat untuk mencegah kebocoran data sensitif pasien.
        logger.warn(
          {
            event: 'VALIDATION_FAILED',
            method: req.method,
            path: req.path,
            fields: issues.map((e) => ({
              field: e.path.join('.'),
              reason: e.message,
              code: e.code,
            })),
          },
          'Validasi request gagal',
        );

        const message = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(new ApiError(400, `Validasi gagal: ${message}`));
      }
      next(error);
    }
  };
};
