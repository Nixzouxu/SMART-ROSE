import redis from '@/config/redis';
import { sendMail } from '@/utils/mailer';
import { logger } from '@/utils/logger';
import { ApiError } from '@/utils/apiError';

const OTP_EXPIRY = 5 * 60; // 5 minutes

export const generateAndSendOtp = async (email: string): Promise<void> => {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in Redis with TTL
  const key = `otp:${email}`;
  await redis.set(key, otp, 'EX', OTP_EXPIRY);

  // Send via email
  const subject = 'Kode OTP Login SMART-ROSE';
  const text = `Kode OTP Anda adalah ${otp}. Kode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Kode OTP Login</h2>
      <p>Kode OTP Anda adalah <strong>${otp}</strong>.</p>
      <p>Kode ini berlaku selama 5 menit.</p>
      <p>Jangan berikan kode ini kepada siapapun.</p>
    </div>
  `;

  await sendMail(email, subject, text, html);
  logger.info({ email }, 'OTP generated and sent successfully');
};

export const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
  const key = `otp:${email}`;
  const storedOtp = await redis.get(key);

  if (!storedOtp) {
    throw new ApiError(400, 'OTP tidak ditemukan atau sudah kadaluarsa');
  }

  if (storedOtp !== otp) {
    throw new ApiError(400, 'OTP tidak valid');
  }

  // Delete after successful verification
  await redis.del(key);
  return true;
};
