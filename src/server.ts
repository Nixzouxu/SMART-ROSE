import 'dotenv/config';
import { env } from '@/config/env';
import { createApp } from '@/app';
import { logger } from '@/utils/logger';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`🚀 SMART-ROSE API berjalan di ${env.APP_URL} (port ${env.PORT})`);
  logger.info(`📄 Swagger docs: ${env.APP_URL}/api/docs`);
});
