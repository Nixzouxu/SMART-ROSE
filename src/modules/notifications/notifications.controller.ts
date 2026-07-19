import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import * as notificationsService from './notifications.service';

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await notificationsService.getUserNotifications(userId, page, limit);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil riwayat notifikasi',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    await notificationsService.markAsRead(userId, id);
    res.status(200).json({
      success: true,
      message: 'Notifikasi ditandai sudah dibaca',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    await notificationsService.markAllAsRead(userId);
    res.status(200).json({
      success: true,
      message: 'Semua notifikasi ditandai sudah dibaca',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
