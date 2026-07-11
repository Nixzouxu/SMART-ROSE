import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ApiError } from '@/utils/apiError';
import { RoleType } from '@prisma/client';

/**
 * Middleware untuk membatasi akses berdasarkan role.
 * Harus dipanggil setelah middleware authenticate.
 * @param allowedRoles Array berisi role yang diizinkan untuk mengakses endpoint
 */
export const requireRole = (allowedRoles: RoleType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Autentikasi gagal: Token tidak ditemukan'));
    }

    if (!allowedRoles.includes(req.user.role as RoleType)) {
      return next(
        new ApiError(403, 'Akses ditolak: Role Anda tidak diizinkan mengakses resource ini'),
      );
    }

    next();
  };
};
