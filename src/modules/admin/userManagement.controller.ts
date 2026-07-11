import { Request, Response, NextFunction } from 'express';
import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';

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
