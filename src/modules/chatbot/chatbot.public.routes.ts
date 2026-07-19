import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import * as chatbotController from './chatbot.controller';
import { askChatbotSchema } from './chatbot.schema';
import { publicRateLimit } from '@/middlewares/publicRateLimit.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Chatbot Publik
 *   description: Endpoint chatbot yang dapat diakses tanpa login (untuk pelapor anonim)
 */

/**
 * @openapi
 * /chatbot/public/ask:
 *   post:
 *     summary: Tanya ke chatbot (publik, tanpa login)
 *     description: >
 *       Endpoint publik untuk mengajukan pertanyaan ke chatbot. Pelapor anonim yang tidak
 *       memiliki akun dapat menggunakan layanan ini. Log chatbot akan dibuat dengan userId=null.
 *       Jawaban yang diperoleh dari cache atau knowledge base dikembalikan langsung.
 *       Jika tidak ada jawaban, pertanyaan akan dieskalasi ke Admin.
 *     tags: [Chatbot Publik]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pertanyaan
 *             properties:
 *               pertanyaan:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Pertanyaan yang ingin diajukan
 *     responses:
 *       200:
 *         description: Berhasil memproses pertanyaan chatbot
 *       400:
 *         description: Validasi gagal
 *       429:
 *         description: Terlalu banyak permintaan
 */
router.post(
  '/ask',
  publicRateLimit,
  validate(askChatbotSchema),
  chatbotController.askChatbotPublicHandler,
);

export default router;
