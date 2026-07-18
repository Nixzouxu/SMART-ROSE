import { Router } from 'express';
import * as reportsController from './reports.controller';
import * as qrcodeController from './qrcode.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import {
  createReportPublicSchema,
  updateReportSchema,
  listReportsQuerySchema,
} from './reports.schema';
import {
  uploadMiddleware,
  uploadRcaMiddleware,
  validateMagicBytes,
} from '@/middlewares/upload.middleware';
import * as attachmentController from './attachment.controller';
import { publicRateLimit } from '@/middlewares/publicRateLimit.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { auditLog } from '@/middlewares/audit.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: API untuk pelaporan insiden
 */

// ===== Route Publik =====
/**
 * @openapi
 * /reports/scan/{unitCode}:
 *   get:
 *     summary: Scan QR Code Unit
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: unitCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Info Unit
 *       404:
 *         description: Not found
 */
router.get('/scan/:unitCode', qrcodeController.scan);

/**
 * @openapi
 * /reports/scan/{unitCode}/image:
 *   get:
 *     summary: Download QR Code image
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: unitCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image stream
 *       404:
 *         description: Not found
 */
router.get('/scan/:unitCode/image', qrcodeController.getUnitQrImage);

/**
 * @openapi
 * /reports/track/{trackingNumber}:
 *   get:
 *     summary: Public Tracking Report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report tracking info
 *       404:
 *         description: Not found
 */
router.get('/track/:trackingNumber', reportsController.trackReport);

/**
 * @openapi
 * /reports:
 *   post:
 *     summary: Buat laporan insiden baru (publik, tanpa login)
 *     description: >
 *       Endpoint publik untuk pelaporan insiden tanpa perlu akun. Laporan otomatis berstatus
 *       SUBMITTED dan bersifat anonim. Wajib menyertakan captchaToken dan captchaJawaban
 *       yang diperoleh dari GET /captcha.
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jenisInsiden
 *               - tanggalKejadian
 *               - lokasi
 *               - unitKerja
 *               - kronologi
 *               - dampak
 *               - gradingAwal
 *               - captchaToken
 *               - captchaJawaban
 *             properties:
 *               jenisInsiden:
 *                 type: string
 *                 enum: [KTD, KNC, KTC, KPC, SENTINEL]
 *               tanggalKejadian:
 *                 type: string
 *                 format: date-time
 *               lokasi:
 *                 type: string
 *               unitKerja:
 *                 type: string
 *               kronologi:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               dampak:
 *                 type: string
 *               gradingAwal:
 *                 type: string
 *                 enum: [HIJAU, BIRU, KUNING, MERAH]
 *               captchaToken:
 *                 type: string
 *                 description: Token UUID dari GET /captcha
 *               captchaJawaban:
 *                 type: string
 *                 description: Jawaban soal matematika dari GET /captcha
 *     responses:
 *       201:
 *         description: Laporan berhasil dibuat, mengembalikan trackingNumber
 *       400:
 *         description: Validasi gagal atau captcha salah
 *       429:
 *         description: Terlalu banyak permintaan
 */
router.post(
  '/',
  publicRateLimit,
  validate(createReportPublicSchema),
  auditLog('CREATE_PUBLIC_REPORT', 'Report'),
  reportsController.createReportPublic,
);

/**
 * @openapi
 * /reports/{id}/attachments:
 *   post:
 *     summary: Upload lampiran ke laporan (publik, tanpa login)
 *     description: >
 *       Endpoint publik untuk mengunggah lampiran bukti ke laporan yang baru dibuat.
 *       Pelapor anonim dapat langsung melampirkan foto bukti dari lokasi kejadian.
 *       Hanya menerima file jpg, png, atau pdf dengan ukuran maksimal 5MB.
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID laporan yang baru dibuat
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File lampiran (jpg/png/pdf, maks 5MB)
 *     responses:
 *       201:
 *         description: Lampiran berhasil diunggah
 *       400:
 *         description: File tidak ada, tipe tidak diizinkan, atau ukuran melebihi batas
 *       404:
 *         description: Laporan tidak ditemukan
 *       429:
 *         description: Terlalu banyak permintaan
 */
router.post(
  '/:id/attachments',
  publicRateLimit,
  uploadMiddleware.single('file'),
  validateMagicBytes,
  attachmentController.uploadAttachment,
);

// ===== Route User (Authenticate) =====

/**
 * @openapi
 * /reports/me:
 *   get:
 *     summary: Get my reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/me', authenticate, validate(listReportsQuerySchema), reportsController.getMyReports);

/**
 * @openapi
 * /reports/me/{id}:
 *   get:
 *     summary: Get my report detail
 *     tags: [Reports]
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
 *         description: Report detail
 */
router.get('/me/:id', authenticate, reportsController.getMyReportDetail);

/**
 * @openapi
 * /reports/me/{id}:
 *   put:
 *     summary: Update draft report
 *     tags: [Reports]
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
 *         description: Updated
 */
router.put(
  '/me/:id',
  authenticate,
  validate(updateReportSchema),
  auditLog('UPDATE_MY_REPORT', 'Report', (req) => req.params.id as string),
  reportsController.updateDraftReport,
);

/**
 * @openapi
 * /reports/me/{id}:
 *   delete:
 *     summary: Delete draft report
 *     tags: [Reports]
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
 *         description: Deleted
 */
router.delete(
  '/me/:id',
  authenticate,
  auditLog('DELETE_MY_REPORT', 'Report', (req) => req.params.id as string),
  reportsController.deleteDraftReport,
);

/**
 * @openapi
 * /reports/{id}/rca/attachments:
 *   post:
 *     summary: Upload lampiran RCA ke laporan
 *     tags: [Reports]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Lampiran RCA berhasil diunggah
 */
router.post(
  '/:id/rca/attachments',
  authenticate,
  requireRole(['ADMIN', 'ADMIN_UTAMA']),
  uploadRcaMiddleware.single('file'),
  validateMagicBytes,
  attachmentController.uploadRcaAttachment,
);

export default router;
