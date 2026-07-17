import { randomUUID } from 'crypto';
import redis from '@/config/redis';
import { ApiError } from '@/utils/apiError';

const CAPTCHA_TTL = 300; // 5 menit dalam detik

/**
 * Menghasilkan captcha sederhana (soal matematika dasar).
 * Menyimpan jawaban di Redis dengan key `captcha:<token>` ber-TTL 5 menit.
 * Mengembalikan token + pertanyaan ke client.
 */
export const generateCaptcha = async (): Promise<{ token: string; pertanyaan: string }> => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const jawaban = a + b;
  const token = randomUUID();
  const cacheKey = `captcha:${token}`;

  await redis.setex(cacheKey, CAPTCHA_TTL, String(jawaban));

  return {
    token,
    pertanyaan: `Berapa hasil dari ${a} + ${b}?`,
  };
};

/**
 * Memvalidasi token captcha dan jawaban.
 * Setelah validasi (berhasil atau gagal), token langsung dihapus dari Redis (single-use).
 * Melempar ApiError 400 jika token tidak valid/kadaluarsa atau jawaban salah.
 */
export const verifyCaptcha = async (token: string, jawaban: string): Promise<void> => {
  const cacheKey = `captcha:${token}`;
  const jawabanBenar = await redis.get(cacheKey);

  // Hapus token setelah digunakan (single-use), terlepas hasil validasi
  await redis.del(cacheKey);

  if (!jawabanBenar) {
    throw new ApiError(400, 'Token captcha tidak valid atau sudah kadaluarsa');
  }

  if (jawaban.trim() !== jawabanBenar) {
    throw new ApiError(400, 'Jawaban captcha salah');
  }
};
