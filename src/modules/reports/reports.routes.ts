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
router.get('/scan/:unitCode', qrcodeController.scan);
router.get('/scan/:unitCode/image', qrcodeController.getUnitQrImage);
router.get('/track/:trackingNumber', reportsController.trackReport);

// Route User (Authenticate)

router.post('/', authenticate, validate(createReportSchema), reportsController.createReport);

router.get('/me', authenticate, validate(listReportsQuerySchema), reportsController.getMyReports);

router.get('/me/:id', authenticate, reportsController.getMyReportDetail);

router.put(
  '/me/:id',
  authenticate,
  validate(updateReportSchema),
  reportsController.updateDraftReport,
);

router.delete('/me/:id', authenticate, reportsController.deleteDraftReport);

router.post(
  '/:id/attachments',
  authenticate,
  uploadMiddleware.single('file'),
  attachmentController.uploadAttachment,
);

export default router;
