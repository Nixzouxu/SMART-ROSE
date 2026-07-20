// src/modules/dashboard/dashboard.controller.ts
// Controller untuk semua endpoint dashboard analitik admin.

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import * as dashboardService from './dashboard.service';
import {
  generateDashboardExcel,
  generateDashboardPdf,
  DashboardData,
} from '@/modules/reports/export.service';
import { ApiError } from '@/utils/apiError';

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
    const { startDate, endDate } = parseDateFilter(req);
    const data = await dashboardService.getTrend(startDate, endDate);
    res.status(200).json({
      success: true,
      message: 'Data tren laporan berhasil diambil',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const exportDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { format, cakupan } = req.body;
    const { startDate, endDate } = parseDateFilter(req);

    if (!Array.isArray(cakupan)) {
      throw new ApiError(400, 'cakupan harus berupa array string');
    }

    const data: DashboardData = {};
    if (cakupan.includes('ringkasanStatistik'))
      data.ringkasanStatistik = await dashboardService.getSummary(startDate, endDate);
    if (cakupan.includes('grafikJenisInsiden'))
      data.grafikJenisInsiden = await dashboardService.getByJenisInsiden(startDate, endDate);
    if (cakupan.includes('grafikGrading'))
      data.grafikGrading = await dashboardService.getByGradingRisiko(startDate, endDate);
    if (cakupan.includes('trenBulanan'))
      data.trenBulanan = await dashboardService.getTrend(startDate, endDate);

    if (format === 'excel') {
      const buffer = await generateDashboardExcel(data, cakupan);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="export-dashboard.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = await generateDashboardPdf(data, cakupan);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="export-dashboard.pdf"');
      return res.send(buffer);
    } else {
      throw new ApiError(400, 'Format tidak valid. Gunakan excel atau pdf');
    }
  } catch (error) {
    next(error);
  }
};
