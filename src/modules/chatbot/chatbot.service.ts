import crypto from 'crypto';
import { db } from '@/config/db';
import redis from '@/config/redis';
import { matchQuestion } from './chatbot.matcher';
import { createNotification } from '@/modules/notifications/notifications.service';
import { ApiError } from '@/utils/apiError';

const CACHE_TTL = 3600; // 1 jam dalam detik

const generateHash = (text: string) => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

export const askChatbot = async (userId: string, pertanyaan: string) => {
  const query = pertanyaan.toLowerCase().trim();
  const cacheKey = `chatbot:${generateHash(query)}`;

  // 1. Cek cache Redis
  const cachedJawaban = await redis.get(cacheKey);
  if (cachedJawaban) {
    // Simpan log dari cache
    const log = await db.chatbotLog.create({
      data: {
        userId,
        pertanyaan: query,
        jawaban: cachedJawaban,
        statusEskalasi: 'TERJAWAB_OTOMATIS',
      },
    });
    return {
      logId: log.id,
      jawaban: cachedJawaban,
      sumber: 'CACHE',
    };
  }

  // 2. Jika tidak ada di cache, lakukan pencocokan (Exact & Fuzzy)
  const match = await matchQuestion(query);

  if (match) {
    // Simpan ke cache
    await redis.setex(cacheKey, CACHE_TTL, match.jawaban);

    // Simpan log
    const log = await db.chatbotLog.create({
      data: {
        userId,
        pertanyaan: query,
        jawaban: match.jawaban,
        statusEskalasi: 'TERJAWAB_OTOMATIS',
      },
    });

    return {
      logId: log.id,
      jawaban: match.jawaban,
      sumber: 'KNOWLEDGE_BASE',
      confidence: match.confidence,
    };
  }

  // 3. Jika tidak ketemu, eskalasi ke Admin
  const log = await db.chatbotLog.create({
    data: {
      userId,
      pertanyaan: query,
      jawaban: null,
      statusEskalasi: 'MENUNGGU_ADMIN',
    },
  });

  // Notifikasi ke semua ADMIN dan ADMIN_UTAMA
  const admins = await db.user.findMany({
    where: {
      role: { in: ['ADMIN', 'ADMIN_UTAMA'] },
      deletedAt: null,
    },
  });

  const pesanNotifikasi = `Pertanyaan Chatbot baru menunggu jawaban dari Anda.`;

  for (const admin of admins) {
    await createNotification(
      admin.id,
      'PENGUMUMAN', // Menggunakan PENGUMUMAN karena tipe eskalasi chatbot ke admin blm ada secara eksplisit, bisa juga pakai tipe lain jika dirasa lebih tepat
      pesanNotifikasi,
    );
  }

  return {
    logId: log.id,
    jawaban:
      'Maaf, saya belum menemukan jawaban yang tepat untuk pertanyaan Anda. Pertanyaan Anda telah diteruskan kepada Admin dan akan segera ditindaklanjuti.',
    sumber: 'ESKALASI',
  };
};

export const getPendingChatbotLogs = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    db.chatbotLog.count({ where: { statusEskalasi: 'MENUNGGU_ADMIN' } }),
    db.chatbotLog.findMany({
      where: { statusEskalasi: 'MENUNGGU_ADMIN' },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nama: true, email: true } },
      },
    }),
  ]);

  return { total, logs, page, limit };
};

export const answerChatbotLog = async (logId: string, adminId: string, jawaban: string) => {
  const log = await db.chatbotLog.findUnique({ where: { id: logId } });
  if (!log) {
    throw new ApiError(404, 'Chatbot Log tidak ditemukan');
  }

  if (log.statusEskalasi !== 'MENUNGGU_ADMIN') {
    throw new ApiError(400, 'Log tidak dalam status MENUNGGU_ADMIN');
  }

  const updatedLog = await db.chatbotLog.update({
    where: { id: logId },
    data: {
      jawaban,
      statusEskalasi: 'DIJAWAB_ADMIN',
    },
  });

  // Notifikasi ke user bahwa pertanyaannya telah dijawab
  await createNotification(
    updatedLog.userId,
    'CHATBOT_DIJAWAB',
    `Pertanyaan Anda telah dijawab oleh Admin.`,
  );

  return updatedLog;
};

export const getChatbotHistory = async (userId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    db.chatbotLog.count({ where: { userId } }),
    db.chatbotLog.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { total, logs, page, limit };
};
