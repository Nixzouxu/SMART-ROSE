import { Request, Response, NextFunction } from 'express';
import { db } from '@/config/db';
import { AuthRequest } from './auth.middleware';

export const auditLog = (
  action: string,
  entity: string,
  getEntityId?: (req: Request) => string | undefined,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Jalankan asinkron tanpa memblokir response
    res.on('finish', () => {
      // Hanya log request yang sukses (skip jika error)
      if (res.statusCode >= 400) return;

      const userId = (req as AuthRequest).user?.userId || null;

      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (Array.isArray(ip)) ip = ip[0];

      const userAgent = req.headers['user-agent'] || null;
      const entityId = (getEntityId ? getEntityId(req) : undefined) || res.locals.entityId;

      // Filter informasi sensitif dari payload jika ada
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, confirmPassword, ...safeBody } = req.body || {};

      db.auditLog
        .create({
          data: {
            userId,
            action,
            entity,
            entityId,
            ipAddress: ip,
            userAgent,
            details: Object.keys(safeBody).length > 0 ? safeBody : null,
          },
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('[AuditLog Error]', error);
        });
    });

    next();
  };
};
