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
import rcaRoutes from '@/modules/rca/rca.routes';
import { chatbotRouter, chatbotAdminRouter } from '@/modules/chatbot/chatbot.routes';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Route modul lain di-mount di sini mulai Fase 2 dst
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/reports', rcaRoutes);

  // Fase 5
  app.use('/api/guides', guidesRouter);
  app.use('/api/admin/guides', guidesAdminRouter);
  app.use('/api/chatbot', chatbotRouter);
  app.use('/api/admin/chatbot', chatbotAdminRouter);

  // Fase 6B
  app.use('/api/admin/dashboard', dashboardRoutes);

  app.use(errorHandler); // WAJIB paling akhir, setelah semua route

  return app;
}
