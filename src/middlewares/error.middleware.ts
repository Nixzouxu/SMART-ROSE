import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApiError } from '@/utils/apiError';
import { logger } from '@/utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Tangani error dari multer (upload file)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ success: false, message: 'Ukuran file melebihi batas maksimal yang diizinkan.' });
    }
    return res.status(400).json({ success: false, message: `Error upload file: ${err.message}` });
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
}
