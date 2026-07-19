import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '@/utils/apiError';

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
        // Build detailed error messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zodError = error as any;

        const message = (zodError.issues || zodError.errors || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((e: any) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        return next(new ApiError(400, `Validasi gagal: ${message}`));
      }
      next(error);
    }
  };
};
