// src/modules/dashboard/dashboard.service.ts
// Semua query agregat ke database Report menggunakan Prisma groupBy dan count.

import { db } from '@/config/db';
import { Prisma } from '@prisma/client';

/**
 * Ringkasan total laporan, breakdown by status, by jenis insiden, dan jumlah overdue.
 */
export const getSummary = async (startDate?: Date, endDate?: Date) => {
  const dateFilter =
    startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : startDate
        ? { createdAt: { gte: startDate } }
        : endDate
          ? { createdAt: { lte: endDate } }
          : {};

  const [total, byStatus, byJenis, overdue] = await Promise.all([
    db.report.count({ where: { ...dateFilter, deletedAt: null } }),

    db.report.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { ...dateFilter, deletedAt: null },
    }),

    db.report.groupBy({
      by: ['jenisInsiden'],
      _count: { id: true },
      where: { ...dateFilter, deletedAt: null },
    }),

    db.report.count({
      where: {
        ...dateFilter,
        deletedAt: null,
        status: 'OVERDUE',
      },
    }),
  ]);

  return {
    total,
    overdue,
    byStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count.id,
    })),
    byJenisInsiden: byJenis.map((row) => ({
      jenisInsiden: row.jenisInsiden,
      count: row._count.id,
    })),
  };
};

/**
 * Jumlah laporan per jenis insiden.
 */
export const getByJenisInsiden = async (startDate?: Date, endDate?: Date) => {
  const dateFilter =
    startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : startDate
        ? { createdAt: { gte: startDate } }
        : endDate
          ? { createdAt: { lte: endDate } }
          : {};

  const rows = await db.report.groupBy({
    by: ['jenisInsiden'],
    _count: { id: true },
    where: { ...dateFilter, deletedAt: null },
    orderBy: { _count: { id: 'desc' } },
  });

  return rows.map((row) => ({
    jenisInsiden: row.jenisInsiden,
    count: row._count.id,
  }));
};

/**
 * Jumlah laporan per grading risiko.
 */
export const getByGradingRisiko = async (startDate?: Date, endDate?: Date) => {
  const dateFilter =
    startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : startDate
        ? { createdAt: { gte: startDate } }
        : endDate
          ? { createdAt: { lte: endDate } }
          : {};

  const rows = await db.report.groupBy({
    by: ['gradingAwal'],
    _count: { id: true },
    where: { ...dateFilter, deletedAt: null },
    orderBy: { _count: { id: 'desc' } },
  });

  return rows.map((row) => ({
    grading: row.gradingAwal,
    count: row._count.id,
  }));
};

/**
 * Jumlah laporan per unit kerja, top 10.
 */
export const getByUnitKerja = async (startDate?: Date, endDate?: Date) => {
  const dateFilter =
    startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : startDate
        ? { createdAt: { gte: startDate } }
        : endDate
          ? { createdAt: { lte: endDate } }
          : {};

  const rows = await db.report.groupBy({
    by: ['unitKerja'],
    _count: { id: true },
    where: { ...dateFilter, deletedAt: null },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  return rows.map((row) => ({
    unitKerja: row.unitKerja,
    count: row._count.id,
  }));
};

/**
 * Tren laporan per bulan.
 * Default 12 bulan terakhir jika tidak ada filter startDate/endDate.
 * Menggunakan raw query karena Prisma groupBy tidak mendukung date_trunc langsung.
 */
export const getTrend = async (startDate?: Date, endDate?: Date) => {
  let dateFilterSql: Prisma.Sql;

  if (startDate && endDate) {
    dateFilterSql = Prisma.sql`AND created_at >= ${startDate} AND created_at <= ${endDate}`;
  } else if (startDate) {
    dateFilterSql = Prisma.sql`AND created_at >= ${startDate}`;
  } else if (endDate) {
    dateFilterSql = Prisma.sql`AND created_at <= ${endDate}`;
  } else {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    dateFilterSql = Prisma.sql`AND created_at >= ${twelveMonthsAgo}`;
  }

  const rows = await db.$queryRaw<{ bulan: string; count: bigint }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS bulan,
      COUNT(id)::bigint AS count
    FROM reports
    WHERE
      deleted_at IS NULL
      ${dateFilterSql}
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `;

  return rows.map((row) => ({
    bulan: row.bulan,
    count: Number(row.count),
  }));
};
