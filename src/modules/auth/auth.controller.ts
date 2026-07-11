import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { env } from '@/config/env';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil, menunggu persetujuan admin',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password } = req.body;
    const result = await authService.loginStepOne(identifier, password);

    if (result.requiresOtp) {
      res.status(200).json({
        success: true,
        message: 'OTP telah dikirim ke email Anda',
        requiresOtp: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        email: (result as any).email,
      });
      return;
    }

    // Jika user biasa, set cookie refresh token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { accessToken, refreshToken } = result as any;
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyLoginOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.loginStepTwoOtp(email, otp);

    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token tidak ditemukan' });
      return;
    }

    // Dalam skenario asilnya userId didapat dari verifikasi refreshToken
    const decoded = jwt.decode(token) as { userId: string };

    if (!decoded || !decoded.userId) {
      res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
      return;
    }

    const { accessToken } = await authService.refreshAccessToken(decoded.userId, token);

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const token = req.cookies?.refreshToken;

    if (token) {
      await authService.logoutUser(userId, token);
    }

    res.clearCookie('refreshToken');
    res.status(200).json({
      success: true,
      message: 'Berhasil logout',
    });
  } catch (error) {
    next(error);
  }
};

// Alasan keamanan:
// Refresh token disimpan dalam httpOnly cookie untuk mencegah akses dari client-side script (XSS).
// Cookie ini juga harus dikirim dengan opsi secure: true di production (HTTPS).
const setRefreshTokenCookie = (res: Response, token: string) => {
  const isProduction = env.NODE_ENV === 'production';
  // Parse expiration string like "1y" into ms (approx 365 days)
  const maxAge = 365 * 24 * 60 * 60 * 1000;

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge,
  });
};
