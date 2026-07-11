import { Router } from 'express';
import * as reportsController from './reports.controller';
import * as qrcodeController from './qrcode.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createReportSchema, updateReportSchema, listReportsQuerySchema } from './reports.schema';
import { uploadMiddleware } from '@/middlewares/upload.middleware';
import * as attachmentController from './attachment.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: API untuk pelaporan insiden
 */

// Route Publik
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

// Route User (Authenticate)

/**
 * @openapi
 * /reports:
 *   post:
 *     summary: Create new incident report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authenticate, validate(createReportSchema), reportsController.createReport);

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
router.delete('/me/:id', authenticate, reportsController.deleteDraftReport);

/**
 * @openapi
 * /reports/{id}/attachments:
 *   post:
 *     summary: Upload attachment to report
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Uploaded
 */
router.post(
  '/:id/attachments',
  authenticate,
  uploadMiddleware.single('file'),
  attachmentController.uploadAttachment,
);

export default router;
