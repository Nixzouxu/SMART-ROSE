import { Request, Response, NextFunction } from 'express';
import * as captchaService from './captcha.service';

/**
 * GET /captcha
 * Endpoint publik: kembalikan token + pertanyaan captcha baru.
 */
export const getCaptcha = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await captchaService.generateCaptcha();
    res.status(200).json({
      success: true,
      message: 'Captcha berhasil dibuat',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
