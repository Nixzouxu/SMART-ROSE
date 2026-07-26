import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { hashPassword } from '@/utils/password';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { Prisma } from '@prisma/client';
import { sendEmailChangedNotification } from '@/services/email.service';

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

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.query.role as string;
    const search = req.query.search as string;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role === 'ADMIN') {
      where.role = 'ADMIN';
      where.statusVerifikasi = 'APPROVED';
      where.aktif = true;

      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          nama: true,
        },
        orderBy: { nama: 'asc' },
      });

      return res.status(200).json({
        success: true,
        message: 'Daftar admin berhasil diambil',
        data: users,
      });
    }

    if (role && role !== 'ADMIN') {
      where.role = role as any;
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        unitKerja: true,
        statusVerifikasi: true,
        aktif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      message: 'Daftar pengguna berhasil diambil',
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const id = req.params.id as string;
    const { nama, email, role, unitKerja, aktif } = req.body;

    if (adminId === id && aktif === false) {
      throw new ApiError(400, 'Anda tidak dapat menonaktifkan akun Anda sendiri');
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    // TODO: Gunakan flag khusus (misal isSystem: true) di schema daripada hardcode email.
    if (user.email === 'system@smartrose.internal') {
      throw new ApiError(400, 'Akun sistem tidak dapat diubah');
    }

    let emailChanged = false;
    let oldEmail = '';
    if (email && email !== user.email) {
      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ApiError(400, 'Email sudah digunakan oleh akun lain');
      }
      emailChanged = true;
      oldEmail = user.email;
    }

    if (adminId === id && role && role !== user.role) {
      throw new ApiError(400, 'Tidak bisa mengubah role akun sendiri');
    }

    // Validasi ADMIN_UTAMA minimal 1 aktif
    if (user.role === 'ADMIN_UTAMA' && user.aktif === true && user.deletedAt === null) {
      const isRoleChanged = role && role !== 'ADMIN_UTAMA';
      const isDeactivated = aktif === false;
      if (isRoleChanged || isDeactivated) {
        const adminUtamaCount = await db.user.count({
          where: { role: 'ADMIN_UTAMA', aktif: true, deletedAt: null },
        });
        if (adminUtamaCount <= 1) {
          throw new ApiError(
            400,
            'Tidak dapat mengubah role atau menonaktifkan satu-satunya ADMIN_UTAMA yang tersisa',
          );
        }
      }
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(nama && { nama }),
        ...(email && { email }),
        ...(role && { role }),
        ...(unitKerja && { unitKerja }),
        ...(aktif !== undefined && { aktif }),
        ...(emailChanged && { tokenVersion: { increment: 1 } }),
      },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        unitKerja: true,
        statusVerifikasi: true,
        aktif: true,
        createdAt: true,
      },
    });

    if (emailChanged) {
      try {
        await sendEmailChangedNotification({
          oldEmail,
          newEmail: updatedUser!.email,
          nama: updatedUser!.nama,
        });
      } catch (err) {
        console.error('Gagal mengirim notifikasi email berubah', err);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Data pengguna berhasil diperbarui',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const id = req.params.id as string;

    if (adminId === id) {
      throw new ApiError(400, 'Anda tidak dapat menghapus akun Anda sendiri');
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    // TODO: Gunakan flag khusus (misal isSystem: true) di schema daripada hardcode email.
    if (user.email === 'system@smartrose.internal') {
      throw new ApiError(400, 'Akun sistem tidak dapat dihapus atau dinonaktifkan');
    }

    // Validasi ADMIN_UTAMA minimal 1 aktif sebelum soft-delete
    if (user.role === 'ADMIN_UTAMA' && user.aktif === true && user.deletedAt === null) {
      const adminUtamaCount = await db.user.count({
        where: { role: 'ADMIN_UTAMA', aktif: true, deletedAt: null },
      });
      if (adminUtamaCount <= 1) {
        throw new ApiError(400, 'Tidak dapat menghapus satu-satunya ADMIN_UTAMA yang tersisa');
      }
    }

    // Gunakan soft delete agar konsisten dengan fitur lain
    await db.user.update({
      where: { id },
      data: { deletedAt: new Date(), aktif: false, tokenVersion: { increment: 1 } },
    });

    await db.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_USER',
        entity: 'User',
        entityId: id,
        details: { deletedEmail: user.email, deletedRole: user.role, type: 'soft_delete' } as any,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Pengguna berhasil dihapus',
    });
  } catch (error) {
    next(error);
  }
};
