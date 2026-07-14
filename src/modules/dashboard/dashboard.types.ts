// src/modules/dashboard/dashboard.types.ts
// Type definitions untuk response dashboard analitik.

export interface StatusCount {
  status: string;
  count: number;
}

export interface JenisInsidenCount {
  jenisInsiden: string;
  count: number;
}

export interface GradingCount {
  grading: string;
  count: number;
}

export interface UnitKerjaCount {
  unitKerja: string;
  count: number;
}

export interface TrendItem {
  bulan: string;
  count: number;
}

export interface DashboardSummary {
  total: number;
  overdue: number;
  byStatus: StatusCount[];
  byJenisInsiden: JenisInsidenCount[];
}
