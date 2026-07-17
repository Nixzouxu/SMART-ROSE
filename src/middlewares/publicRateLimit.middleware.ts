import rateLimit from 'express-rate-limit';

/**
 * Rate limiter untuk endpoint publik yang rawan dieksploitasi:
 * - POST /reports (buat laporan publik)
 * - GET /captcha (ambil token captcha)
 * - POST /reports/:id/attachments (upload lampiran publik)
 * - POST /chatbot/public/ask (chatbot publik)
 *
 * Batas: maksimal 5 request per IP per 15 menit (sesuai rencana yang disepakati).
 */
export const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP ini, coba lagi setelah 15 menit.',
  },
});
