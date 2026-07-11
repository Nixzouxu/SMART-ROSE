import { Request, Response, NextFunction } from 'express';
import { db } from '@/config/db';
import { sendMail } from '@/utils/mailer';
import redis from '@/config/redis';
import crypto from 'crypto';
import { hashPassword } from '@/utils/password';
import { ApiError } from '@/utils/apiError';
import { logger } from '@/utils/logger';

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await db.user.findUnique({
      where: { email },
    });

    // Alasan keamanan:
    // Jangan bocorkan status email terdaftar atau tidak.
    // Selalu kembalikan respons sukses yang sama, baik email ada atau tidak,
    // untuk menghindari serangan enumerasi email (user enumeration attack).
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const key = `resetToken:${resetToken}`;

      // Simpan di Redis selama 30 menit
      await redis.set(key, user.id, 'EX', 30 * 60);

      const subject = 'Reset Password SMART-ROSE';
      const text = `Gunakan token berikut untuk mereset password Anda: ${resetToken}`;
      const html = `<p>Gunakan token berikut untuk mereset password Anda: <strong>${resetToken}</strong></p>`;

      await sendMail(email, subject, text, html);
    } else {
      // Log saja untuk internal, tidak ditampilkan ke user
      logger.info({ email }, 'Forgot password requested for non-existent email');
    }

    res.status(200).json({
      success: true,
      message: 'Jika email terdaftar, instruksi reset password telah dikirim.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    const key = `resetToken:${token}`;
    const userId = await redis.get(key);

    if (!userId) {
      throw new ApiError(400, 'Token reset password tidak valid atau sudah kadaluarsa');
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // Hapus token setelah digunakan
    await redis.del(key);

    res.status(200).json({
      success: true,
      message: 'Password berhasil diubah. Silakan login dengan password baru.',
    });
  } catch (error) {
    next(error);
  }
};
