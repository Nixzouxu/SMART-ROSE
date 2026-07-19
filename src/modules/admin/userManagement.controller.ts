import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { hashPassword } from '@/utils/password';

export const getPendingUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await db.user.findMany({
      where: {
        statusVerifikasi: 'PENDING',
      },
      select: {
        id: true,
        nama: true,
        email: true,
        noPegawai: true,
        unitKerja: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const approveUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    if (user.statusVerifikasi !== 'PENDING') {
      throw new ApiError(400, 'Status user bukan PENDING');
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { statusVerifikasi: 'APPROVED' },
      select: {
        id: true,
        email: true,
        statusVerifikasi: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'User berhasil diapprove',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    if (user.statusVerifikasi !== 'PENDING') {
      throw new ApiError(400, 'Status user bukan PENDING');
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { statusVerifikasi: 'REJECTED' },
      select: {
        id: true,
        email: true,
        statusVerifikasi: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'User berhasil direject',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const createAdminUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nama, email, noPegawai, unitKerja } = req.body;

    if (!nama || !email || !noPegawai || !unitKerja) {
      throw new ApiError(400, 'Semua field (nama, email, noPegawai, unitKerja) wajib diisi');
    }

    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email }, { noPegawai }],
      },
    });

    if (existingUser) {
      throw new ApiError(400, 'Email atau No Pegawai sudah terdaftar');
    }

    // Generate random secure password
    const plainPassword = crypto.randomBytes(8).toString('hex'); // 16 chars hex
    const passwordHash = await hashPassword(plainPassword);

    const newAdmin = await db.user.create({
      data: {
        nama,
        email,
        noPegawai,
        unitKerja,
        passwordHash,
        role: 'ADMIN',
        statusVerifikasi: 'APPROVED',
      },
      select: {
        id: true,
        nama: true,
        email: true,
        noPegawai: true,
        role: true,
        unitKerja: true,
        statusVerifikasi: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Admin berhasil dibuat. Simpan password ini karena hanya ditampilkan sekali.',
      data: {
        user: newAdmin,
        password: plainPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};
