import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '@/utils/token';
import { ApiError } from '@/utils/apiError';
import { db } from '@/config/db';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const verifyAuthToken = async (token: string): Promise<TokenPayload> => {
  try {
    const payload = verifyAccessToken(token);

    // Verify user still exists and not deleted/rejected
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new ApiError(401, 'Autentikasi gagal: User tidak ditemukan');
    }

    if (user.statusVerifikasi !== 'APPROVED') {
      throw new ApiError(403, 'Akses ditolak: Akun belum diverifikasi');
    }

    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('AUTH VERIFICATION ERROR:', err);
    throw new ApiError(401, 'Autentikasi gagal: Token tidak valid atau kadaluarsa');
  }
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Autentikasi gagal: Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await verifyAuthToken(token);
      req.user = payload;
      next();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(401, 'Autentikasi gagal: Token tidak valid atau kadaluarsa');
    }
  } catch (error) {
    next(error);
  }
};
