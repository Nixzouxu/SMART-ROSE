import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import * as userManagementController from './userManagement.controller';
import * as reportsAdminController from './reportsAdmin.controller';
import * as adminJobsController from './adminJobs.controller';
import { validate } from '@/middlewares/validate.middleware';
import {
  adminListReportsQuerySchema,
  createReportSchema,
  updateReportSchema,
} from '@/modules/reports/reports.schema';
import { regradeReportSchema } from './regrade.schema';

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
 * /admin/users:
 *   post:
 *     summary: Create a new admin user (ADMIN_UTAMA only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nama
 *               - email
 *               - noPegawai
 *               - unitKerja
 *             properties:
 *               nama:
 *                 type: string
 *               email:
 *                 type: string
 *               noPegawai:
 *                 type: string
 *               unitKerja:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin user created successfully (returns plain text password once)
 *       400:
 *         description: Validation error or email/noPegawai already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not ADMIN_UTAMA)
 */
router.post('/users', requireRole(['ADMIN_UTAMA']), userManagementController.createAdminUser);

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
/**
 * @openapi
 * tags:
 *   name: Admin Reports
 *   description: API untuk admin reports management
 */

/**
 * @openapi
 * /admin/reports/export:
 *   get:
 *     summary: Export reports list to PDF or Excel
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [excel, pdf]
 *     responses:
 *       200:
 *         description: Download file
 *       400:
 *         description: Format invalid
 */
router.get('/reports/export', reportsAdminController.exportReports);

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     summary: List all reports for admin
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/reports', validate(adminListReportsQuerySchema), reportsAdminController.listReports);
/**
 * @openapi
 * /admin/reports/{id}:
 *   get:
 *     summary: Get report detail for admin
 *     tags: [Admin Reports]
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
router.get('/reports/:id', reportsAdminController.getReportDetail);
/**
 * @openapi
 * /admin/reports:
 *   post:
 *     summary: Create report manually
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/reports', validate(createReportSchema), reportsAdminController.createManualReport);
/**
 * @openapi
 * /admin/reports/{id}:
 *   put:
 *     summary: Update report as admin
 *     tags: [Admin Reports]
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
router.put('/reports/:id', validate(updateReportSchema), reportsAdminController.updateReport);
/**
 * @openapi
 * /admin/reports/{id}/assign:
 *   post:
 *     summary: Assign report
 *     tags: [Admin Reports]
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
 *         description: Assigned
 */
router.post('/reports/:id/assign', reportsAdminController.assignReport);
/**
 * @openapi
 * /admin/reports/{id}/archive:
 *   post:
 *     summary: Archive report
 *     tags: [Admin Reports]
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
 *         description: Archived
 */
router.post('/reports/:id/archive', reportsAdminController.archiveReport);

// Delete permanen khusus ADMIN_UTAMA
/**
 * @openapi
 * /admin/reports/{id}/hard:
 *   delete:
 *     summary: Hard delete report
 *     tags: [Admin Reports]
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
  '/reports/:id/hard',
  requireRole(['ADMIN_UTAMA']),
  reportsAdminController.hardDeleteReport,
);

/**
 * @openapi
 * /admin/reports/{id}/regrade:
 *   put:
 *     summary: Regrade laporan (ubah grading risiko dan hitung ulang deadline SLA)
 *     tags: [Admin Reports]
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
 *             required:
 *               - gradingBaru
 *               - alasan
 *             properties:
 *               gradingBaru:
 *                 type: string
 *                 enum: [HIJAU, BIRU, KUNING, MERAH]
 *               alasan:
 *                 type: string
 *                 minLength: 10
 *     responses:
 *       200:
 *         description: Grading berhasil diubah, deadline baru dihitung dari sekarang (UTC)
 *       400:
 *         description: Input tidak valid
 *       404:
 *         description: Laporan tidak ditemukan
 */
router.put(
  '/reports/:id/regrade',
  validate(regradeReportSchema),
  reportsAdminController.regradeReportHandler,
);

// --- Admin Jobs (manual trigger) ---
/**
 * @openapi
 * /admin/jobs/sla-check:
 *   post:
 *     summary: Trigger SLA check secara manual (ADMIN_UTAMA only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SLA check berhasil dijalankan
 *       403:
 *         description: Hanya ADMIN_UTAMA yang bisa trigger ini
 */
router.post('/jobs/sla-check', requireRole(['ADMIN_UTAMA']), adminJobsController.triggerSlaCheck);

export default router;
