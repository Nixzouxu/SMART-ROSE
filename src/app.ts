import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/config/swagger';
import { requestLogger } from '@/middlewares/requestLogger.middleware';
import { errorHandler } from '@/middlewares/error.middleware';
import cookieParser from 'cookie-parser';
import authRoutes from '@/modules/auth/auth.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import reportsRoutes from '@/modules/reports/reports.routes';
import { guidesRouter, guidesAdminRouter } from '@/modules/education/guides.routes';
import rcaRoutes, { rcaGlobalRouter } from '@/modules/rca/rca.routes';
import { chatbotRouter, chatbotAdminRouter } from '@/modules/chatbot/chatbot.routes';
import chatbotPublicRouter from '@/modules/chatbot/chatbot.public.routes';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes';
import captchaRoutes from '@/modules/captcha/captcha.routes';
import announcementRoutes from '@/modules/announcement/announcement.routes';
import feedbackRoutes from '@/modules/feedback/feedback.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';

import { globalRateLimit } from '@/middlewares/globalRateLimit.middleware';
import { sanitizeMiddleware } from '@/middlewares/sanitize.middleware';

export function createApp(): Application {
  const app = express();

  // Trust proxy agar rate-limiter dan requestLogger dapat membaca IP asli (via X-Forwarded-For)
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
          .split(',')
          .map((o) => o.trim());
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      maxAge: 3600, // Cache preflight response selama 1 jam untuk mengurangi latency
    }),
  );
  app.use(globalRateLimit);
  app.use(express.json({ limit: '5mb' }));
  app.use(sanitizeMiddleware);
  app.use(cookieParser());
  app.use(requestLogger);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  // Route modul lain di-mount di sini mulai Fase 2 dst
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/reports', rcaRoutes);
  app.use('/api/rca', rcaGlobalRouter);
  app.use('/api/reports', feedbackRoutes);
  app.use('/api/notifications', notificationsRoutes);

  // Fase 5
  app.use('/api/guides', guidesRouter);
  app.use('/api/admin/guides', guidesAdminRouter);
  // Chatbot publik di-mount SEBELUM chatbotRouter (yang pakai authenticate global)
  app.use('/api/chatbot/public', chatbotPublicRouter);
  app.use('/api/chatbot', chatbotRouter);
  app.use('/api/admin/chatbot', chatbotAdminRouter);

  // Fase 6B
  app.use('/api/admin/dashboard', dashboardRoutes);

  // Revisi Pelaporan Publik
  app.use('/api/captcha', captchaRoutes);

  app.use('/api', announcementRoutes);

  app.use(errorHandler); // WAJIB paling akhir, setelah semua route

  return app;
}
