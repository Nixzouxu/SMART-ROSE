import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import * as userManagementController from './userManagement.controller';

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

export default router;
