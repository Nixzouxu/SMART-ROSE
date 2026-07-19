import { Router } from 'express';
import { createRca, getRca, updateRca, deleteRca, exportRca } from './rca.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createUpdateRcaSchema, addRcaTeamMemberSchema, persetujuanRcaSchema } from './rca.schema';
import { addTeamMember, removeTeamMember, persetujuanRca } from './rca.controller';
import { auditLog } from '@/middlewares/audit.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: RCA
 *   description: Root Cause Analysis API
 */

/**
 * @swagger
 * /reports/{reportId}/rca:
 *   post:
 *     summary: Membuat RCA baru untuk sebuah laporan
 *     tags: [RCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
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
 *               timKetua:
 *                 type: string
 *               timSekretaris:
 *                 type: string
 *               timAnggota:
 *                 type: array
 *                 items:
 *                   type: string
 *               kronologiSingkat:
 *                 type: string
 *               masalahAwal5Why:
 *                 type: string
 *               timelineEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *               timePersonGridEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *               fiveWhyEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *               fishboneEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *               rencanaPerbaikanEntries:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: RCA berhasil dibuat
 *       403:
 *         description: Akses ditolak
 */
router.post('/:reportId/rca', authenticate, validate(createUpdateRcaSchema), createRca);

/**
 * @swagger
 * /reports/{reportId}/rca:
 *   get:
 *     summary: Mengambil data RCA berdasarkan report ID
 *     tags: [RCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RCA berhasil diambil
 *       403:
 *         description: Akses ditolak
 *       404:
 *         description: RCA tidak ditemukan
 */
router.get('/:reportId/rca', authenticate, getRca);

/**
 * @swagger
 * /reports/{reportId}/rca:
 *   put:
 *     summary: Memperbarui data RCA
 *     tags: [RCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: RCA berhasil diperbarui
 *       403:
 *         description: Akses ditolak
 */
router.put('/:reportId/rca', authenticate, validate(createUpdateRcaSchema), updateRca);

/**
 * @swagger
 * /reports/{reportId}/rca:
 *   delete:
 *     summary: Menghapus data RCA (Hanya ADMIN_UTAMA)
 *     tags: [RCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: RCA berhasil dihapus
 *       403:
 *         description: Akses ditolak
 */
router.delete('/:reportId/rca', authenticate, requireRole(['ADMIN_UTAMA']), deleteRca);

/**
 * @swagger
 * /reports/{reportId}/rca/export:
 *   get:
 *     summary: Ekspor dokumen RCA ke Excel atau PDF
 *     tags: [RCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID laporan
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [excel, pdf]
 *         description: Format ekspor (excel atau pdf)
 *     responses:
 *       200:
 *         description: File berhasil digenerate dan siap diunduh
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Format tidak valid (harus excel atau pdf)
 *       403:
 *         description: Akses ditolak
 *       404:
 *         description: Laporan atau RCA tidak ditemukan
 */
router.get('/:reportId/rca/export', authenticate, exportRca);

// Team Member routes
router.post('/:reportId/rca/team', authenticate, validate(addRcaTeamMemberSchema), addTeamMember);
router.delete('/:reportId/rca/team/:memberId', authenticate, removeTeamMember);

/**
 * @swagger
 * /reports/{reportId}/rca/persetujuan:
 *   patch:
 *     summary: Persetujuan RCA oleh Admin Utama
 *     tags: [RCA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
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
 *               keputusan:
 *                 type: string
 *                 enum: [setuju, revisi]
 *               catatan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Persetujuan berhasil
 */
router.patch(
  '/:reportId/rca/persetujuan',
  authenticate,
  requireRole(['ADMIN_UTAMA']),
  validate(persetujuanRcaSchema),
  auditLog('PERSETUJUAN_RCA', 'RCA', (req) => req.params.reportId as string),
  persetujuanRca,
);

export default router;
