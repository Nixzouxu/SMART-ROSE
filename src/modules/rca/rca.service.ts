import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { createUpdateRcaSchema, addRcaTeamMemberSchema } from './rca.schema';
import { z } from 'zod';
import { KategoriFishbone, JenisPengisian } from '@prisma/client';

type RcaInput = z.infer<typeof createUpdateRcaSchema>['body'];
type RcaTeamMemberInput = z.infer<typeof addRcaTeamMemberSchema>['body'];

export class RcaService {
  async createRca(reportId: string, disusunOlehId: string, payload: RcaInput) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (existing) {
      throw new ApiError(400, 'RCA untuk laporan ini sudah ada');
    }

    return prisma.rootCauseAnalysis.create({
      data: {
        reportId,
        disusunOlehId,
        observasi: payload.observasi,
        dokumentasi: payload.dokumentasi,
        kronologiSingkat: payload.kronologiSingkat,
        tipeSubInsiden: payload.tipeSubInsiden,
        tindakanSesuaiBands: payload.tindakanSesuaiBands,
        tindakanBands: payload.tindakanBands,
        jenisPengisian: payload.jenisPengisian,
        jenisInvestigasi: payload.jenisInvestigasi,
        daftarInterviewee: payload.daftarInterviewee,
        masalahAwal5Why: payload.masalahAwal5Why,
        status: payload.status,
        timelineEntries: {
          create: payload.timelineEntries,
        },
        timePersonGridEntries: {
          create: payload.timePersonGridEntries,
        },
        fiveWhyEntries: {
          create: payload.fiveWhyEntries,
        },
        fishboneEntries: {
          create:
            payload.jenisPengisian === JenisPengisian.TEMPLATE
              ? [
                  {
                    kategori: KategoriFishbone.MAN,
                    penyebab: 'Deskripsikan masalah terkait Manusia',
                    urutan: 1,
                  },
                  {
                    kategori: KategoriFishbone.METHOD,
                    penyebab: 'Deskripsikan masalah terkait Metode',
                    urutan: 2,
                  },
                  {
                    kategori: KategoriFishbone.MATERIAL,
                    penyebab: 'Deskripsikan masalah terkait Material',
                    urutan: 3,
                  },
                  {
                    kategori: KategoriFishbone.MACHINE,
                    penyebab: 'Deskripsikan masalah terkait Mesin/Alat',
                    urutan: 4,
                  },
                ]
              : payload.fishboneEntries,
        },
        rencanaPerbaikanEntries: {
          create: payload.rencanaPerbaikanEntries,
        },
      },
      include: {
        timelineEntries: { orderBy: { urutan: 'asc' } },
        timePersonGridEntries: { orderBy: { urutan: 'asc' } },
        fiveWhyEntries: { orderBy: { urutan: 'asc' } },
        fishboneEntries: { orderBy: { urutan: 'asc' } },
        rencanaPerbaikanEntries: { orderBy: { urutan: 'asc' } },
        teamMembers: true,
      },
    });
  }

  async getRcaByReportId(reportId: string) {
    const rca = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
      include: {
        disusunOleh: { select: { id: true, nama: true, role: true } },
        timelineEntries: { orderBy: { urutan: 'asc' } },
        timePersonGridEntries: { orderBy: { urutan: 'asc' } },
        fiveWhyEntries: { orderBy: { urutan: 'asc' } },
        fishboneEntries: { orderBy: { urutan: 'asc' } },
        rencanaPerbaikanEntries: { orderBy: { urutan: 'asc' } },
        teamMembers: { include: { user: { select: { id: true, nama: true, role: true } } } },
      },
    });

    if (!rca) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }
    return rca;
  }

  async updateRca(reportId: string, payload: RcaInput) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }

    return prisma.$transaction(async (tx) => {
      await tx.rcaTimelineEntry.deleteMany({ where: { rcaId: existing.id } });
      await tx.rcaTimePersonGridEntry.deleteMany({ where: { rcaId: existing.id } });
      await tx.rcaFiveWhy.deleteMany({ where: { rcaId: existing.id } });
      await tx.rcaFishboneEntry.deleteMany({ where: { rcaId: existing.id } });
      await tx.rcaRencanaPerbaikan.deleteMany({ where: { rcaId: existing.id } });

      return tx.rootCauseAnalysis.update({
        where: { id: existing.id },
        data: {
          observasi: payload.observasi,
          dokumentasi: payload.dokumentasi,
          kronologiSingkat: payload.kronologiSingkat,
          tipeSubInsiden: payload.tipeSubInsiden,
          tindakanSesuaiBands: payload.tindakanSesuaiBands,
          tindakanBands: payload.tindakanBands,
          jenisPengisian: payload.jenisPengisian,
          jenisInvestigasi: payload.jenisInvestigasi,
          daftarInterviewee: payload.daftarInterviewee,
          masalahAwal5Why: payload.masalahAwal5Why,
          status: payload.status,
          timelineEntries: {
            create: payload.timelineEntries,
          },
          timePersonGridEntries: {
            create: payload.timePersonGridEntries,
          },
          fiveWhyEntries: {
            create: payload.fiveWhyEntries,
          },
          fishboneEntries: {
            create:
              payload.jenisPengisian === JenisPengisian.TEMPLATE &&
              payload.fishboneEntries.length === 0
                ? [
                    {
                      kategori: KategoriFishbone.MAN,
                      penyebab: 'Deskripsikan masalah terkait Manusia',
                      urutan: 1,
                    },
                    {
                      kategori: KategoriFishbone.METHOD,
                      penyebab: 'Deskripsikan masalah terkait Metode',
                      urutan: 2,
                    },
                    {
                      kategori: KategoriFishbone.MATERIAL,
                      penyebab: 'Deskripsikan masalah terkait Material',
                      urutan: 3,
                    },
                    {
                      kategori: KategoriFishbone.MACHINE,
                      penyebab: 'Deskripsikan masalah terkait Mesin/Alat',
                      urutan: 4,
                    },
                  ]
                : payload.fishboneEntries,
          },
          rencanaPerbaikanEntries: {
            create: payload.rencanaPerbaikanEntries,
          },
        },
        include: {
          timelineEntries: { orderBy: { urutan: 'asc' } },
          timePersonGridEntries: { orderBy: { urutan: 'asc' } },
          fiveWhyEntries: { orderBy: { urutan: 'asc' } },
          fishboneEntries: { orderBy: { urutan: 'asc' } },
          rencanaPerbaikanEntries: { orderBy: { urutan: 'asc' } },
          teamMembers: { include: { user: { select: { id: true, nama: true, role: true } } } },
        },
      });
    });
  }

  async deleteRca(reportId: string) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }

    await prisma.rootCauseAnalysis.delete({
      where: { id: existing.id },
    });
    return true;
  }

  async getTeamMembers(reportId: string) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }
    return prisma.rcaTeamMember.findMany({
      where: { rcaId: existing.id },
      include: {
        user: { select: { id: true, nama: true, role: true } },
      },
    });
  }

  async addTeamMember(reportId: string, payload: RcaTeamMemberInput) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }

    // Validate user
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new ApiError(404, 'User tidak ditemukan');
    if (user.role !== 'ADMIN' && user.role !== 'ADMIN_UTAMA') {
      throw new ApiError(400, 'Hanya ADMIN atau ADMIN_UTAMA yang dapat menjadi tim RCA');
    }

    if (payload.peran === 'KETUA' || payload.peran === 'SEKRETARIS') {
      const existingRole = await prisma.rcaTeamMember.findFirst({
        where: { rcaId: existing.id, peran: payload.peran },
      });
      if (existingRole) {
        return prisma.rcaTeamMember.update({
          where: { id: existingRole.id },
          data: { userId: payload.userId },
        });
      }
    }

    return prisma.rcaTeamMember.create({
      data: {
        rcaId: existing.id,
        userId: payload.userId,
        peran: payload.peran,
      },
    });
  }

  async updateTeamMember(reportId: string, memberId: string, payload: Partial<RcaTeamMemberInput>) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }

    const member = await prisma.rcaTeamMember.findUnique({ where: { id: memberId } });
    if (!member || member.rcaId !== existing.id) {
      throw new ApiError(404, 'Anggota tim tidak ditemukan');
    }

    if (payload.userId) {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) throw new ApiError(404, 'User tidak ditemukan');
      if (user.role !== 'ADMIN' && user.role !== 'ADMIN_UTAMA') {
        throw new ApiError(400, 'Hanya ADMIN atau ADMIN_UTAMA yang dapat menjadi tim RCA');
      }
    }

    const targetPeran = payload.peran || member.peran;
    if (targetPeran === 'KETUA' || targetPeran === 'SEKRETARIS') {
      const existingRole = await prisma.rcaTeamMember.findFirst({
        where: { rcaId: existing.id, peran: targetPeran, id: { not: memberId } },
      });
      if (existingRole) {
        throw new ApiError(400, `Sudah ada ${targetPeran} aktif untuk RCA ini`);
      }
    }

    return prisma.rcaTeamMember.update({
      where: { id: memberId },
      data: {
        userId: payload.userId,
        peran: payload.peran,
      },
    });
  }

  async removeTeamMember(reportId: string, memberId: string) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }
    const member = await prisma.rcaTeamMember.findFirst({
      where: { id: memberId, rcaId: existing.id },
    });
    if (!member) {
      throw new ApiError(404, 'Anggota tim tidak ditemukan');
    }
    await prisma.rcaTeamMember.delete({
      where: { id: memberId },
    });
    return true;
  }

  async persetujuanRca(reportId: string, keputusan: 'setuju' | 'revisi', catatan?: string) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }

    const status = keputusan === 'setuju' ? 'DISETUJUI' : 'PERLU_REVISI';

    return prisma.rootCauseAnalysis.update({
      where: { id: existing.id },
      data: {
        status,
        catatanRevisi: catatan || null,
      },
    });
  }
}

export const rcaService = new RcaService();
