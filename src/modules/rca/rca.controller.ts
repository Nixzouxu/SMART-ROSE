import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware';
import { TokenPayload } from '@/utils/token';
import { rcaService } from './rca.service';
import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { exportRcaToExcel, exportRcaToPdf } from '@/modules/reports/export.service';

const checkAuthorization = async (reportId: string, user: TokenPayload) => {
  if (user.role === 'ADMIN_UTAMA' || user.role === 'ADMIN') {
    return true;
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  if (report.assignedToId !== user.userId) {
    throw new ApiError(403, 'Akses ditolak: Anda tidak memiliki akses ke RCA laporan ini');
  }

  return true;
};

export const createRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const rca = await rcaService.createRca(reportId, req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'RCA berhasil dibuat',
      data: rca,
    });
  } catch (error) {
    next(error);
  }
};

export const initRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new ApiError(404, 'Laporan tidak ditemukan');
    }

    try {
      // Coba ambil RCA yang sudah ada
      const rca = await rcaService.getRcaByReportId(reportId);
      res.status(200).json({
        success: true,
        isNew: false,
        data: rca,
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 404) {
        // RCA belum ada, return format prefill
        res.status(200).json({
          success: true,
          isNew: true,
          prefilledFromReport: {
            kronologiSingkat: report.kronologi,
            masalahAwal5Why: report.kronologi,
            referensiLaporan: {
              jenisInsiden: report.jenisInsiden,
              lokasi: report.lokasi,
              unitKerja: report.unitKerja,
              tanggalKejadian: report.tanggalKejadian,
              gradingAwal: report.gradingAwal,
              dampak: report.dampak,
            },
          },
          emptyForManualInput: {
            timKetua: null,
            timSekretaris: null,
            timAnggota: [],
            observasi: null,
            dokumentasi: null,
            tipeSubInsiden: null,
            tindakanSesuaiBands: null,
            tindakanBands: null,
            daftarInterviewee: [],
            jenisInvestigasi: 'RCA_LENGKAP',
            jenisPengisian: null,
          },
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    next(error);
  }
};

export const getRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const rca = await rcaService.getRcaByReportId(reportId);
    res.status(200).json({
      success: true,
      message: 'RCA berhasil diambil',
      data: rca,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const rca = await rcaService.updateRca(reportId, req.body);
    res.status(200).json({
      success: true,
      message: 'RCA berhasil diperbarui',
      data: rca,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    // Hanya ADMIN_UTAMA yang diijinkan sampai ke endpoint ini (diatur via rbac)
    await rcaService.deleteRca(reportId);
    res.status(200).json({
      success: true,
      message: 'RCA berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const exportRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    const format = req.query.format as string | undefined;

    if (!format || (format !== 'excel' && format !== 'pdf')) {
      throw new ApiError(400, "Parameter format harus 'excel' atau 'pdf'");
    }

    // Otorisasi sama seperti GET RCA: admin atau assignedTo
    await checkAuthorization(reportId, req.user!);

    if (format === 'excel') {
      const buffer = await exportRcaToExcel(reportId);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="rca-${reportId}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } else {
      const buffer = await exportRcaToPdf(reportId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="rca-${reportId}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    }
  } catch (error) {
    next(error);
  }
};

export const getTeamMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const members = await rcaService.getTeamMembers(reportId);
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil anggota tim RCA',
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const addTeamMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    await checkAuthorization(reportId, req.user!);
    const member = await rcaService.addTeamMember(reportId, req.body);
    res.status(201).json({
      success: true,
      message: 'Anggota tim berhasil ditambahkan',
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeamMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    const memberId = req.params.memberId as string;
    await checkAuthorization(reportId, req.user!);
    const member = await rcaService.updateTeamMember(reportId, memberId, req.body);
    res.status(200).json({
      success: true,
      message: 'Anggota tim berhasil diperbarui',
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const removeTeamMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    const memberId = req.params.memberId as string;
    await checkAuthorization(reportId, req.user!);
    await rcaService.removeTeamMember(reportId, memberId);
    res.status(200).json({
      success: true,
      message: 'Anggota tim berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const persetujuanRca = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reportId = req.params.reportId as string;
    const { keputusan, catatan } = req.body;

    const rca = await rcaService.persetujuanRca(reportId, keputusan, catatan);

    res.status(200).json({
      success: true,
      message: 'Persetujuan RCA berhasil diproses',
      data: rca,
    });
  } catch (error) {
    next(error);
  }
};

export const getBandsOptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const options = [
      {
        value: 'BIRU',
        label: 'Biru',
        deskripsi: 'Investigasi Sederhana - Maksimal 1 Minggu (Risiko Rendah)',
      },
      {
        value: 'HIJAU',
        label: 'Hijau',
        deskripsi: 'Investigasi Sederhana - Maksimal 2 Minggu (Risiko Sedang)',
      },
      {
        value: 'KUNING',
        label: 'Kuning',
        deskripsi:
          'Investigasi Komprehensif RCA - Maksimal 45 Hari (Risiko Tinggi, perhatian Top Manajemen)',
      },
      {
        value: 'MERAH',
        label: 'Merah',
        deskripsi:
          'Investigasi Komprehensif RCA - Maksimal 45 Hari (Risiko Ekstrim, perhatian Direktur)',
      },
    ];

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil opsi bands',
      data: options,
    });
  } catch (error) {
    next(error);
  }
};
