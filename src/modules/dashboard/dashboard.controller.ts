// src/modules/dashboard/dashboard.controller.ts
// Controller untuk semua endpoint dashboard analitik admin.

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import * as dashboardService from './dashboard.service';

const parseDateFilter = (req: AuthRequest) => {
  const startDateStr = req.query.startDate as string | undefined;
  const endDateStr = req.query.endDate as string | undefined;
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;
  return { startDate, endDate };
};

export const getSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateFilter(req);
    const data = await dashboardService.getSummary(startDate, endDate);
    res.status(200).json({
      success: true,
      message: 'Ringkasan dashboard berhasil diambil',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getByJenisInsiden = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateFilter(req);
    const data = await dashboardService.getByJenisInsiden(startDate, endDate);
    res.status(200).json({
      success: true,
      message: 'Data per jenis insiden berhasil diambil',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getByGradingRisiko = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateFilter(req);
    const data = await dashboardService.getByGradingRisiko(startDate, endDate);
    res.status(200).json({
      success: true,
      message: 'Data per grading risiko berhasil diambil',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getByUnitKerja = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateFilter(req);
    const data = await dashboardService.getByUnitKerja(startDate, endDate);
    res.status(200).json({
      success: true,
      message: 'Data per unit kerja berhasil diambil',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getTrend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await dashboardService.getTrend();
    res.status(200).json({
      success: true,
      message: 'Data tren laporan berhasil diambil',
      data,
    });
  } catch (error) {
    next(error);
  }
};
