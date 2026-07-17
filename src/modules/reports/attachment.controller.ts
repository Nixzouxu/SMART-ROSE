import { Request, Response, NextFunction } from 'express';
import * as attachmentService from './attachment.service';
import { ApiError } from '@/utils/apiError';

export const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.id as string;

    if (!req.file) {
      throw new ApiError(400, 'File lampiran tidak ditemukan dalam request');
    }

    const attachment = await attachmentService.uploadAttachment(reportId, req.file);

    res.status(201).json({
      success: true,
      message: 'Lampiran berhasil diunggah',
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};
