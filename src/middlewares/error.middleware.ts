import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/apiError';
import { logger } from '@/utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
}
