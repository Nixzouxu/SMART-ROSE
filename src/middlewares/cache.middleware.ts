import { Request, Response, NextFunction } from 'express';
import redis from '@/config/redis';
import { logger } from '@/utils/logger';

interface CacheOptions {
  keyPrefix?: string;
  ttl?: number;
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Hanya untuk GET request
    if (req.method !== 'GET') {
      return next();
    }

    const { keyPrefix = 'cache', ttl = 300 } = options;

    try {
      // Buat key berdasarkan prefix dan original URL (termasuk query params)
      const key = `${keyPrefix}:${req.originalUrl}`;
      const cachedData = await redis.get(key);

      if (cachedData) {
        logger.info(`[Redis Cache] HIT: ${key}`);
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cachedData));
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json untuk menyimpan ke cache sebelum dikirim
      const originalJson = res.json.bind(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.json = (body: any) => {
        // Simpan ke cache hanya jika response sukses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(key, ttl, JSON.stringify(body)).catch((err) => {
            logger.error(`[Redis Cache] Error setting cache for ${key}:`, err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error({ err: error }, '[Redis Cache] Error');
      // Jika redis error, lanjut tanpa cache
      next();
    }
  };
};
