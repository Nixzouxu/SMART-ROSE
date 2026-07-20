import { db } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { hashPassword, comparePassword } from '@/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/token';
import { generateAndSendOtp, verifyOtp } from './otp.service';
import redis from '@/config/redis';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerUser = async (data: any) => {
  const existingEmail = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existingEmail) {
    throw new ApiError(400, 'Email sudah terdaftar');
  }

  const existingNoPegawai = await db.user.findUnique({
    where: { noPegawai: data.noPegawai },
  });
  if (existingNoPegawai) {
    throw new ApiError(400, 'Nomor pegawai sudah terdaftar');
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await db.user.create({
    data: {
      nama: data.nama,
      email: data.email,
      noPegawai: data.noPegawai,
      passwordHash: hashedPassword,
      unitKerja: data.unitKerja,
      statusVerifikasi: 'PENDING',
      role: 'USER',
    },
    select: {
      id: true,
      nama: true,
      email: true,
      noPegawai: true,
      role: true,
      statusVerifikasi: true,
    },
  });

  return user;
};

export const loginStepOne = async (identifier: string, password: string, deviceToken?: string) => {
  const user = await db.user.findFirst({
    where: {
      OR: [{ email: identifier }, { noPegawai: identifier }],
    },
  });

  if (!user) {
    throw new ApiError(401, 'Kredensial tidak valid');
  }

  if (user.statusVerifikasi !== 'APPROVED') {
    throw new ApiError(403, 'Akun belum diverifikasi oleh admin');
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new ApiError(401, 'Kredensial tidak valid');
  }

  if (user.role === 'ADMIN' || user.role === 'ADMIN_UTAMA') {
    if (deviceToken) {
      try {
        const hashedDeviceToken = crypto.createHash('sha256').update(deviceToken).digest('hex');
        const validDevice = await db.trustedDevice.findUnique({
          where: { deviceToken: hashedDeviceToken },
        });

        if (validDevice && validDevice.userId === user.id && validDevice.expiresAt > new Date()) {
          await db.trustedDevice.update({
            where: { id: validDevice.id },
            data: { lastUsedAt: new Date() },
          });

          logger.info({
            userId: user.id,
            email: user.email,
            msg: 'Login via trusted device, OTP skipped',
          });
          return await issueTokens(user.id, user.role);
        }
      } catch (error) {
        logger.error({ userId: user.id, error }, 'Error validating trusted device');
      }
    }

    await generateAndSendOtp(user.email);
    return {
      requiresOtp: true,
      email: user.email,
    };
  }

  // Jika USER biasa, langsung generate token
  return await issueTokens(user.id, user.role);
};

export const loginStepTwoOtp = async (
  email: string,
  otp: string,
  userAgent?: string,
  ipAddress?: string,
) => {
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, 'User tidak ditemukan');
  }

  if (user.role !== 'ADMIN' && user.role !== 'ADMIN_UTAMA') {
    throw new ApiError(403, 'OTP hanya untuk admin');
  }

  await verifyOtp(email, otp);

  let newDeviceToken: string | undefined;

  let retryCount = 0;
  while (retryCount < 2) {
    try {
      newDeviceToken = crypto.randomBytes(32).toString('hex');
      const hashedDeviceToken = crypto.createHash('sha256').update(newDeviceToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.trustedDevice.create({
        data: {
          userId: user.id,
          deviceToken: hashedDeviceToken,
          userAgent,
          ipAddress,
          expiresAt,
        },
      });
      break; // Success
    } catch (error: unknown) {
      retryCount++;
      if (retryCount >= 2) {
        logger.error({ userId: user.id, error }, 'Failed to create trusted device after retry');
        newDeviceToken = undefined;
      }
    }
  }

  const tokens = await issueTokens(user.id, user.role);
  return { ...tokens, deviceToken: newDeviceToken };
};

export const issueTokens = async (userId: string, role: string) => {
  const payload = { userId, role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Simpan refresh token di Redis untuk di-revoke saat logout.
  // TTL diset 1 tahun sesuai masa berlaku refresh token di env default (365 hari = 31536000 detik)
  const ttl = 365 * 24 * 60 * 60;
  await redis.set(`refreshToken:${userId}:${refreshToken}`, 'active', 'EX', ttl);

  return {
    accessToken,
    refreshToken,
    requiresOtp: false,
  };
};

export const refreshAccessToken = async (userId: string, token: string) => {
  verifyRefreshToken(token);

  const exists = await redis.get(`refreshToken:${userId}:${token}`);
  if (!exists) {
    throw new ApiError(401, 'Refresh token tidak valid atau sudah direvoke');
  }

  // Cek blacklist
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted) {
    throw new ApiError(401, 'Refresh token telah diblacklist');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.statusVerifikasi !== 'APPROVED') {
    throw new ApiError(401, 'User tidak valid atau belum diverifikasi');
  }

  const payload = { userId: user.id, role: user.role };
  const newAccessToken = signAccessToken(payload);

  return { accessToken: newAccessToken };
};

export const logoutUser = async (userId: string, token: string, deviceToken?: string) => {
  await redis.del(`refreshToken:${userId}:${token}`);

  // Tambahkan ke blacklist.
  const ttl = 365 * 24 * 60 * 60; // 1 year fallback
  await redis.set(`blacklist:${token}`, 'revoked', 'EX', ttl);

  if (deviceToken) {
    try {
      const hashedDeviceToken = crypto.createHash('sha256').update(deviceToken).digest('hex');
      await db.trustedDevice.deleteMany({
        where: {
          userId,
          deviceToken: hashedDeviceToken,
        },
      });
    } catch (error) {
      logger.error({ userId, error }, 'Error deleting trusted device on logout');
    }
  }
};
