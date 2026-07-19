import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { db as prisma } from '@/config/db';

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const action = req.query.action as string;
    const targetId = req.query.targetId as string;

    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (action) where.action = action;
    if (targetId) where.entityId = targetId;

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil audit log',
      data: {
        items,
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};
