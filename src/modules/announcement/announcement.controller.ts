import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import * as announcementService from './announcement.service';

export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const adminId = req.user!.userId;
    const announcement = await announcementService.createAnnouncement(adminId, req.body);
    res.status(201).json({
      success: true,
      message: 'Pengumuman berhasil dibuat',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const announcement = await announcementService.updateAnnouncement(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Pengumuman berhasil diubah',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await announcementService.deleteAnnouncement(id);
    res.status(200).json({
      success: true,
      message: 'Pengumuman berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminAnnouncements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const announcements = await announcementService.getAdminAnnouncements();
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar pengumuman',
      data: announcements,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserAnnouncements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user!.role;
    const announcements = await announcementService.getUserAnnouncements(userRole);
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar pengumuman',
      data: announcements,
    });
  } catch (error) {
    next(error);
  }
};
