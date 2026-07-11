import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import * as attachmentService from './attachment.service';
import { ApiError } from '@/utils/apiError';

export const uploadAttachment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const reportId = req.params.id as string;

    if (!req.file) {
      throw new ApiError(400, 'File lampiran tidak ditemukan dalam request');
    }

    const attachment = await attachmentService.uploadAttachment(reportId, userId, req.file);

    res.status(201).json({
      success: true,
      message: 'Lampiran berhasil diunggah',
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};
