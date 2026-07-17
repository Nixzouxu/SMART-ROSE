import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import * as announcementController from './announcement.controller';
import { createAnnouncementSchema, updateAnnouncementSchema } from './announcement.schema';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Announcement
 *   description: API untuk pengumuman
 */

// User routes (any authenticated user)
router.use('/announcements', authenticate);

/**
 * @openapi
 * /announcements:
 *   get:
 *     summary: Mendapatkan daftar pengumuman untuk user (filter sesuai role)
 *     tags: [Announcement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar pengumuman
 */
router.get('/announcements', announcementController.getUserAnnouncements);

// Admin routes
router.use('/admin/announcements', authenticate, requireRole(['ADMIN', 'ADMIN_UTAMA']));

/**
 * @openapi
 * /admin/announcements:
 *   get:
 *     summary: Mendapatkan semua pengumuman (Admin)
 *     tags: [Announcement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua pengumuman
 */
router.get('/admin/announcements', announcementController.getAdminAnnouncements);

/**
 * @openapi
 * /admin/announcements:
 *   post:
 *     summary: Membuat pengumuman baru
 *     tags: [Announcement]
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
 *               - isi
 *             properties:
 *               judul:
 *                 type: string
 *               isi:
 *                 type: string
 *               targetRole:
 *                 type: string
 *                 enum: [SEMUA, USER, ADMIN]
 *     responses:
 *       201:
 *         description: Pengumuman berhasil dibuat
 */
router.post(
  '/admin/announcements',
  validate(createAnnouncementSchema),
  announcementController.createAnnouncement,
);

/**
 * @openapi
 * /admin/announcements/{id}:
 *   put:
 *     summary: Mengubah pengumuman
 *     tags: [Announcement]
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
 *               isi:
 *                 type: string
 *               targetRole:
 *                 type: string
 *                 enum: [SEMUA, USER, ADMIN]
 *     responses:
 *       200:
 *         description: Pengumuman berhasil diubah
 */
router.put(
  '/admin/announcements/:id',
  validate(updateAnnouncementSchema),
  announcementController.updateAnnouncement,
);

/**
 * @openapi
 * /admin/announcements/{id}:
 *   delete:
 *     summary: Menghapus pengumuman
 *     tags: [Announcement]
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
 *         description: Pengumuman berhasil dihapus
 */
router.delete('/admin/announcements/:id', announcementController.deleteAnnouncement);

export default router;
