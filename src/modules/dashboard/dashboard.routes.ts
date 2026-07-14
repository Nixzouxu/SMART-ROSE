// src/modules/dashboard/dashboard.routes.ts
// Semua endpoint dashboard hanya untuk ADMIN dan ADMIN_UTAMA.
// Cache Redis TTL 5 menit dengan keyPrefix berbeda per endpoint.

import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { cacheMiddleware } from '@/middlewares/cache.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { dashboardQuerySchema } from './dashboard.schema';
import {
  getSummary,
  getByJenisInsiden,
  getByGradingRisiko,
  getByUnitKerja,
  getTrend,
} from './dashboard.controller';

const router = Router();

const adminOnly = [authenticate, requireRole(['ADMIN', 'ADMIN_UTAMA'])];

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Endpoint analitik dashboard untuk Admin
 */

/**
 * @swagger
 * /admin/dashboard/summary:
 *   get:
 *     summary: Ringkasan total laporan, breakdown status, jenis insiden, dan overdue
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter dari tanggal (ISO 8601, opsional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter sampai tanggal (ISO 8601, opsional)
 *     responses:
 *       200:
 *         description: Ringkasan dashboard berhasil diambil
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *             description: HIT jika dari cache, MISS jika dari database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                     byJenisInsiden:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Akses ditolak
 */
router.get(
  '/summary',
  ...adminOnly,
  validate(dashboardQuerySchema),
  cacheMiddleware({ keyPrefix: 'dashboard:summary', ttl: 300 }),
  getSummary,
);

/**
 * @swagger
 * /admin/dashboard/by-jenis:
 *   get:
 *     summary: Jumlah laporan per jenis insiden
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Data per jenis insiden berhasil diambil
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *       403:
 *         description: Akses ditolak
 */
router.get(
  '/by-jenis',
  ...adminOnly,
  validate(dashboardQuerySchema),
  cacheMiddleware({ keyPrefix: 'dashboard:by-jenis', ttl: 300 }),
  getByJenisInsiden,
);

/**
 * @swagger
 * /admin/dashboard/by-grading:
 *   get:
 *     summary: Jumlah laporan per grading risiko
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Data per grading risiko berhasil diambil
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *       403:
 *         description: Akses ditolak
 */
router.get(
  '/by-grading',
  ...adminOnly,
  validate(dashboardQuerySchema),
  cacheMiddleware({ keyPrefix: 'dashboard:by-grading', ttl: 300 }),
  getByGradingRisiko,
);

/**
 * @swagger
 * /admin/dashboard/by-unit:
 *   get:
 *     summary: Jumlah laporan per unit kerja (top 10)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Data per unit kerja berhasil diambil
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *       403:
 *         description: Akses ditolak
 */
router.get(
  '/by-unit',
  ...adminOnly,
  validate(dashboardQuerySchema),
  cacheMiddleware({ keyPrefix: 'dashboard:by-unit', ttl: 300 }),
  getByUnitKerja,
);

/**
 * @swagger
 * /admin/dashboard/trend:
 *   get:
 *     summary: Tren laporan per bulan, 12 bulan terakhir
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data tren laporan berhasil diambil
 *         headers:
 *           X-Cache:
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bulan:
 *                         type: string
 *                         example: "2025-07"
 *                       count:
 *                         type: integer
 *       403:
 *         description: Akses ditolak
 */
router.get(
  '/trend',
  ...adminOnly,
  cacheMiddleware({ keyPrefix: 'dashboard:trend', ttl: 300 }),
  getTrend,
);

export default router;
