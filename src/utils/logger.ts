import pino from 'pino';
import { env } from '@/config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        }
      : {
          targets: [
            { target: 'pino/file', options: { destination: 1 } }, // stdout
            {
              target: 'pino-roll',
              options: {
                file: 'logs/smartrose',
                frequency: 'daily',
                mkdir: true,
                extension: '.log',
              },
            },
          ],
        },
});
