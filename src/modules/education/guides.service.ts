// src/modules/education/guides.service.ts
// Modul ini MURNI berfungsi sebagai PANDUAN PENGGUNAAN APLIKASI.
// Sengaja tidak ada relasi ke skor, kuis, progress belajar, atau sertifikat
// karena bukan merupakan modul pembelajaran formal.

import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { TipeMedia } from '@prisma/client';

export const listGuides = async (kategori?: string) => {
  const where = kategori ? { kategori } : {};
  return await db.guide.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const getGuideDetail = async (id: string) => {
  const guide = await db.guide.findUnique({
    where: { id },
  });

  if (!guide) {
    throw new ApiError(404, 'Guide tidak ditemukan');
  }

  return guide;
};

export const searchGuides = async (q: string) => {
  return await db.guide.findMany({
    where: {
      OR: [
        { judul: { contains: q, mode: 'insensitive' } },
        { konten: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createGuide = async (data: {
  judul: string;
  kategori: string;
  konten: string;
  tipeMedia?: string;
  mediaUrl?: string | null;
}) => {
  return await db.guide.create({
    data: {
      judul: data.judul,
      kategori: data.kategori,
      konten: data.konten,
      tipeMedia: (data.tipeMedia as TipeMedia) || 'TEXT',
      mediaUrl: data.mediaUrl,
    },
  });
};

export const updateGuide = async (
  id: string,
  data: {
    judul?: string;
    kategori?: string;
    konten?: string;
    tipeMedia?: string;
    mediaUrl?: string | null;
  },
) => {
  const guide = await db.guide.findUnique({ where: { id } });
  if (!guide) {
    throw new ApiError(404, 'Guide tidak ditemukan');
  }

  return await db.guide.update({
    where: { id },
    data: {
      ...data,
      tipeMedia: data.tipeMedia ? (data.tipeMedia as TipeMedia) : undefined,
    },
  });
};

export const deleteGuide = async (id: string) => {
  const guide = await db.guide.findUnique({ where: { id } });
  if (!guide) {
    throw new ApiError(404, 'Guide tidak ditemukan');
  }

  return await db.guide.delete({
    where: { id },
  });
};
