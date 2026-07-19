import { Router } from 'express';
import { getMyNotifications, markAsRead, markAllAsRead } from './notifications.controller';
import { authenticate } from '@/middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API untuk riwayat notifikasi user
 */

router.use(authenticate);

router.get('/me', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
