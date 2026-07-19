import { Router } from 'express';
import { createFeedback, getFeedback } from './feedback.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { createFeedbackSchema } from './feedback.schema';
import { auditLog } from '@/middlewares/audit.middleware';

const router = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: API untuk feedback laporan
 */

router.post(
  '/:reportId/feedback',
  authenticate,
  requireRole(['ADMIN_UTAMA']),
  validate(createFeedbackSchema),
  auditLog('CREATE_FEEDBACK', 'Feedback', (req) => req.params.reportId as string),
  createFeedback,
);

router.get('/:reportId/feedback', authenticate, getFeedback);

export default router;
