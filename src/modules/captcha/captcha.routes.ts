import { Router } from 'express';
import * as captchaController from './captcha.controller';
import { publicRateLimit } from '@/middlewares/publicRateLimit.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Captcha
 *   description: Endpoint untuk menghasilkan captcha pelaporan publik
 */

/**
 * @openapi
 * /captcha:
 *   get:
 *     summary: Dapatkan token captcha baru
 *     description: Endpoint publik untuk mendapatkan soal captcha. Token berlaku 5 menit dan hanya dapat digunakan sekali.
 *     tags: [Captcha]
 *     responses:
 *       200:
 *         description: Token captcha berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: UUID token captcha
 *                     pertanyaan:
 *                       type: string
 *                       description: Soal matematika yang harus dijawab
 *       429:
 *         description: Terlalu banyak request
 */
router.get('/', publicRateLimit, captchaController.getCaptcha);

export default router;
