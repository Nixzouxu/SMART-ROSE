import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import * as userManagementController from './userManagement.controller';

const router = Router();

// Semua rute admin butuh autentikasi dan role ADMIN/ADMIN_UTAMA
router.use(authenticate);
router.use(requireRole(['ADMIN', 'ADMIN_UTAMA']));

// User Management
router.get('/users/pending', userManagementController.getPendingUsers);
router.post('/users/:id/approve', userManagementController.approveUser);
router.post('/users/:id/reject', userManagementController.rejectUser);

export default router;
