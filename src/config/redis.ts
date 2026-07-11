import Redis from 'ioredis';
import { logger } from '@/utils/logger';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  logger.error('REDIS_URL is not defined in environment variables');
  process.exit(1);
}

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export default redis;
