const fs = require('fs');

// --- 1. Modify reports.routes.ts ---
let reports = fs.readFileSync('src/modules/reports/reports.routes.ts', 'utf8');

// qrcodeController.scan
reports = reports.replace("router.get('/scan/:unitCode', qrcodeController.scan);", `/**
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
router.get('/scan/:unitCode', qrcodeController.scan);`);

// qrcodeController.getUnitQrImage
reports = reports.replace("router.get('/scan/:unitCode/image', qrcodeController.getUnitQrImage);", `/**
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
router.get('/scan/:unitCode/image', qrcodeController.getUnitQrImage);`);

// trackReport
reports = reports.replace("router.get('/track/:trackingNumber', reportsController.trackReport);", `/**
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
router.get('/track/:trackingNumber', reportsController.trackReport);`);

// createReport
reports = reports.replace("router.post('/', authenticate, validate(createReportSchema), reportsController.createReport);", `/**
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
router.post('/', authenticate, validate(createReportSchema), reportsController.createReport);`);

// getMyReports
reports = reports.replace("router.get('/me', authenticate, validate(listReportsQuerySchema), reportsController.getMyReports);", `/**
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
router.get('/me', authenticate, validate(listReportsQuerySchema), reportsController.getMyReports);`);

// getMyReportDetail
reports = reports.replace("router.get('/me/:id', authenticate, reportsController.getMyReportDetail);", `/**
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
router.get('/me/:id', authenticate, reportsController.getMyReportDetail);`);

// updateDraftReport
reports = reports.replace(`router.put(
  '/me/:id',
  authenticate,
  validate(updateReportSchema),
  reportsController.updateDraftReport,
);`, `/**
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
);`);

// deleteDraftReport
reports = reports.replace("router.delete('/me/:id', authenticate, reportsController.deleteDraftReport);", `/**
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
router.delete('/me/:id', authenticate, reportsController.deleteDraftReport);`);

// uploadAttachment
reports = reports.replace(`router.post(
  '/:id/attachments',
  authenticate,
  uploadMiddleware.single('file'),
  attachmentController.uploadAttachment,
);`, `/**
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
);`);

fs.writeFileSync('src/modules/reports/reports.routes.ts', reports);


// --- 2. Modify admin.routes.ts ---
let admin = fs.readFileSync('src/modules/admin/admin.routes.ts', 'utf8');

admin = admin.replace('// --- Admin Reports ---', `// --- Admin Reports ---
/**
 * @openapi
 * tags:
 *   name: Admin Reports
 *   description: API untuk admin reports management
 */`);

admin = admin.replace("router.get('/reports', validate(adminListReportsQuerySchema), reportsAdminController.listReports);", `/**
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
router.get('/reports', validate(adminListReportsQuerySchema), reportsAdminController.listReports);`);

admin = admin.replace("router.get('/reports/:id', reportsAdminController.getReportDetail);", `/**
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
router.get('/reports/:id', reportsAdminController.getReportDetail);`);

admin = admin.replace("router.post('/reports', validate(createReportSchema), reportsAdminController.createManualReport);", `/**
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
router.post('/reports', validate(createReportSchema), reportsAdminController.createManualReport);`);

admin = admin.replace("router.put('/reports/:id', validate(updateReportSchema), reportsAdminController.updateReport);", `/**
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
router.put('/reports/:id', validate(updateReportSchema), reportsAdminController.updateReport);`);

admin = admin.replace("router.post('/reports/:id/assign', reportsAdminController.assignReport);", `/**
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
router.post('/reports/:id/assign', reportsAdminController.assignReport);`);

admin = admin.replace("router.post('/reports/:id/archive', reportsAdminController.archiveReport);", `/**
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
router.post('/reports/:id/archive', reportsAdminController.archiveReport);`);

admin = admin.replace(`router.delete(
  '/reports/:id/hard',
  requireRole(['ADMIN_UTAMA']),
  reportsAdminController.hardDeleteReport,
);`, `/**
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
);`);

fs.writeFileSync('src/modules/admin/admin.routes.ts', admin);
console.log('Swagger annotations added.');
