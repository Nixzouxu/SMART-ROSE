import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { TargetRole } from '@prisma/client';

export const createAnnouncement = async (
  adminId: string,
  data: { judul: string; isi: string; targetRole?: TargetRole },
) => {
  return await db.announcement.create({
    data: {
      adminId,
      judul: data.judul,
      isi: data.isi,
      targetRole: data.targetRole || 'SEMUA',
    },
  });
};

export const updateAnnouncement = async (
  id: string,
  data: { judul?: string; isi?: string; targetRole?: TargetRole },
) => {
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'Pengumuman tidak ditemukan');
  }

  return await db.announcement.update({
    where: { id },
    data,
  });
};

export const deleteAnnouncement = async (id: string) => {
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'Pengumuman tidak ditemukan');
  }

  await db.announcement.delete({ where: { id } });
  return true;
};

export const getAdminAnnouncements = async () => {
  return await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      admin: {
        select: {
          id: true,
          nama: true,
        },
      },
    },
  });
};

export const getUserAnnouncements = async (userRole: string) => {
  return await db.announcement.findMany({
    where: {
      OR: [{ targetRole: 'SEMUA' }, { targetRole: userRole as TargetRole }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      admin: {
        select: {
          id: true,
          nama: true,
        },
      },
    },
  });
};
