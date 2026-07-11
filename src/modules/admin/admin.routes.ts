import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import * as userManagementController from './userManagement.controller';
import * as reportsAdminController from './reportsAdmin.controller';
import { validate } from '@/middlewares/validate.middleware';
import {
  adminListReportsQuerySchema,
  createReportSchema,
  updateReportSchema,
} from '@/modules/reports/reports.schema';

const router = Router();

// Semua rute admin butuh autentikasi dan role ADMIN/ADMIN_UTAMA
router.use(authenticate);
router.use(requireRole(['ADMIN', 'ADMIN_UTAMA']));

/**
 * @openapi
 * tags:
 *   name: Admin
 *   description: Admin user management endpoints
 */

/**
 * @openapi
 * /admin/users/pending:
 *   get:
 *     summary: Get all pending users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/users/pending', userManagementController.getPendingUsers);

/**
 * @openapi
 * /admin/users/{id}/approve:
 *   post:
 *     summary: Approve a pending user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post('/users/:id/approve', userManagementController.approveUser);

/**
 * @openapi
 * /admin/users/{id}/reject:
 *   post:
 *     summary: Reject a pending user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.post('/users/:id/reject', userManagementController.rejectUser);

// --- Admin Reports ---

router.get('/reports', validate(adminListReportsQuerySchema), reportsAdminController.listReports);
router.get('/reports/:id', reportsAdminController.getReportDetail);
router.post('/reports', validate(createReportSchema), reportsAdminController.createManualReport);
router.put('/reports/:id', validate(updateReportSchema), reportsAdminController.updateReport);
router.post('/reports/:id/assign', reportsAdminController.assignReport);
router.post('/reports/:id/archive', reportsAdminController.archiveReport);

// Delete permanen khusus ADMIN_UTAMA
router.delete(
  '/reports/:id/hard',
  requireRole(['ADMIN_UTAMA']),
  reportsAdminController.hardDeleteReport,
);

export default router;
