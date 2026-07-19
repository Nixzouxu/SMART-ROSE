import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { AuthRequest } from './auth.middleware';

export const confirmPasswordMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    const { confirmPassword } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!confirmPassword) {
      throw new ApiError(400, 'Konfirmasi password diperlukan untuk aksi ini');
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    const isMatch = await bcrypt.compare(confirmPassword, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'Konfirmasi password salah');
    }

    next();
  } catch (error) {
    next(error);
  }
};
