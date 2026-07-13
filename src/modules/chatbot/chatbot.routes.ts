import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/rbac.middleware';
import { validate } from '@/middlewares/validate.middleware';
import * as chatbotController from './chatbot.controller';
import { askChatbotSchema, answerLogSchema } from './chatbot.schema';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Chatbot
 *   description: Endpoints fitur Chatbot
 */

// Semua rute butuh autentikasi
router.use(authenticate);

/**
 * @openapi
 * /chatbot/ask:
 *   post:
 *     summary: Tanya ke chatbot
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Berhasil memproses pertanyaan chatbot
 */
router.post('/ask', validate(askChatbotSchema), chatbotController.askChatbotHandler);

/**
 * @openapi
 * /chatbot/history:
 *   get:
 *     summary: Ambil riwayat percakapan chatbot untuk user yang login
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Berhasil mengambil riwayat chatbot
 */
router.get('/history', chatbotController.getChatbotHistoryHandler);

// ========================================================
// RUTE ADMIN
// ========================================================
const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole(['ADMIN', 'ADMIN_UTAMA']));

/**
 * @openapi
 * /admin/chatbot/pending:
 *   get:
 *     summary: Ambil daftar pertanyaan chatbot yang menunggu eskalasi ke admin
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Berhasil mengambil log chatbot yang menunggu admin
 */
adminRouter.get('/pending', chatbotController.getPendingChatbotLogsHandler);

/**
 * @openapi
 * /admin/chatbot/{logId}/answer:
 *   put:
 *     summary: Jawab pertanyaan chatbot yang dieskalasi
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jawaban
 *             properties:
 *               jawaban:
 *                 type: string
 *     responses:
 *       200:
 *         description: Berhasil menjawab pertanyaan chatbot
 */
adminRouter.put(
  '/:logId/answer',
  validate(answerLogSchema),
  chatbotController.answerChatbotLogHandler,
);

export { router as chatbotRouter, adminRouter as chatbotAdminRouter };
