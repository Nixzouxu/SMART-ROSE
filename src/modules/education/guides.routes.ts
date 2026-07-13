import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { cacheMiddleware } from '@/middlewares/cache.middleware';
import * as guidesController from './guides.controller';
import { validate } from '@/middlewares/validate.middleware';
import { createGuideSchema, updateGuideSchema, searchGuideSchema } from './guides.schema';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Guides
 *   description: Endpoints panduan penggunaan aplikasi
 */

// Route Publik / User
router.use(authenticate);

/**
 * @openapi
 * /guides/search:
 *   get:
 *     summary: Cari panduan (Fuzzy search pada judul dan konten)
 *     tags: [Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Berhasil mencari panduan
 */
// WAJIB diletakkan SEBELUM /:id agar "search" tidak tertangkap sebagai parameter ID
router.get('/search', validate(searchGuideSchema), guidesController.searchGuidesHandler);

/**
 * @openapi
 * /guides:
 *   get:
 *     summary: Ambil daftar panduan
 *     tags: [Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: kategori
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar panduan
 */
router.get(
  '/',
  cacheMiddleware({ keyPrefix: 'guides:list', ttl: 300 }),
  guidesController.listGuidesHandler,
);

/**
 * @openapi
 * /guides/{id}:
 *   get:
 *     summary: Ambil detail panduan
 *     tags: [Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil mengambil detail panduan
 *       404:
 *         description: Panduan tidak ditemukan
 */
router.get('/:id', guidesController.getGuideDetailHandler);

// ========================================================
// RUTE ADMIN
// ========================================================
const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole(['ADMIN', 'ADMIN_UTAMA']));

/**
 * @openapi
 * /admin/guides:
 *   post:
 *     summary: Buat panduan baru (Admin only)
 *     tags: [Guides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - judul
 *               - kategori
 *               - konten
 *             properties:
 *               judul:
 *                 type: string
 *               kategori:
 *                 type: string
 *                 enum: [cara_pelaporan, tujuan_aplikasi, skenario, edukasi_ikp]
 *               konten:
 *                 type: string
 *               tipeMedia:
 *                 type: string
 *                 enum: [TEXT, IMAGE, VIDEO]
 *               mediaUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Panduan berhasil dibuat
 */
adminRouter.post('/', validate(createGuideSchema), guidesController.createGuideHandler);

/**
 * @openapi
 * /admin/guides/{id}:
 *   put:
 *     summary: Update panduan (Admin only)
 *     tags: [Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               judul:
 *                 type: string
 *               kategori:
 *                 type: string
 *                 enum: [cara_pelaporan, tujuan_aplikasi, skenario, edukasi_ikp]
 *               konten:
 *                 type: string
 *               tipeMedia:
 *                 type: string
 *                 enum: [TEXT, IMAGE, VIDEO]
 *               mediaUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Panduan berhasil diupdate
 *       404:
 *         description: Panduan tidak ditemukan
 */
adminRouter.put('/:id', validate(updateGuideSchema), guidesController.updateGuideHandler);

/**
 * @openapi
 * /admin/guides/{id}:
 *   delete:
 *     summary: Hapus panduan (Admin only)
 *     tags: [Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Panduan berhasil dihapus
 *       404:
 *         description: Panduan tidak ditemukan
 */
adminRouter.delete('/:id', guidesController.deleteGuideHandler);

export { router as guidesRouter, adminRouter as guidesAdminRouter };
