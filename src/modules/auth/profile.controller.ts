import { Response, NextFunction } from 'express';
import { db } from '@/config/db';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { ApiError } from '@/utils/apiError';
import { comparePassword, hashPassword } from '@/utils/password';
import { getStorageProvider } from '@/modules/storage/storage.factory';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '@/utils/logger';

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nama: true,
        email: true,
        noPegawai: true,
        role: true,
        unitKerja: true,
        fotoProfilPath: true,
        statusVerifikasi: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    let avatarUrl: string | null = null;
    if (user.fotoProfilPath) {
      const storageProvider = getStorageProvider();
      avatarUrl = await storageProvider.getSignedUrl(user.fotoProfilPath);
    }

    const { fotoProfilPath, ...userWithoutPath } = user;

    res.status(200).json({
      success: true,
      data: {
        ...userWithoutPath,
        avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { nama, unitKerja } = req.body; // hanya bisa update field non-sensitif

    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(nama && { nama }),
        ...(unitKerja && { unitKerja }),
      },
      select: {
        id: true,
        nama: true,
        email: true,
        unitKerja: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    const isValidPassword = await comparePassword(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new ApiError(400, 'Password lama tidak cocok');
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    res.status(200).json({
      success: true,
      message: 'Password berhasil diubah',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body;

    if (!password) {
      throw new ApiError(400, 'Password dibutuhkan untuk konfirmasi');
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new ApiError(400, 'Password salah, konfirmasi penghapusan gagal');
    }

    await db.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Akun berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadPhoto = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      throw new ApiError(400, 'File foto tidak ditemukan dalam request');
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    const storageProvider = getStorageProvider();

    // Map allowed mimetypes to extensions
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = mimeToExt[req.file.mimetype] || '.bin';
    const objectPath = `users/${userId}/profile/${randomUUID()}${ext}`;

    // Upload first
    const result = await storageProvider.upload(objectPath, req.file.buffer, req.file.mimetype);

    // After success, delete old if exists
    if (user.fotoProfilPath) {
      try {
        await storageProvider.delete(user.fotoProfilPath);
      } catch (err) {
        // Log error but don't fail the request
        logger.error({ err }, 'Failed to delete old profile photo');
      }
    }

    await db.user.update({
      where: { id: userId },
      data: { fotoProfilPath: result.path },
    });

    const avatarUrl = await storageProvider.getSignedUrl(result.path);

    res.status(201).json({
      success: true,
      data: { avatarUrl },
    });
  } catch (error) {
    next(error);
  }
};
