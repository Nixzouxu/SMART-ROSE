import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { createUpdateRcaSchema, addRcaTeamMemberSchema } from './rca.schema';
import { z } from 'zod';
import { KategoriFishbone, JenisPengisian, PeranTim } from '@prisma/client';

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
        timKetua: payload.timKetua,
        timSekretaris: payload.timSekretaris,
        timAnggota: payload.timAnggota,
        observasi: payload.observasi,
        dokumentasi: payload.dokumentasi,
        kronologiSingkat: payload.kronologiSingkat,
        tipeSubInsiden: payload.tipeSubInsiden,
        tindakanSesuaiBands: payload.tindakanSesuaiBands,
        tindakanBands: payload.tindakanBands,
        jenisPengisian: payload.jenisPengisian,
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
        teamMembers: true,
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
          timKetua: payload.timKetua,
          timSekretaris: payload.timSekretaris,
          timAnggota: payload.timAnggota,
          observasi: payload.observasi,
          dokumentasi: payload.dokumentasi,
          kronologiSingkat: payload.kronologiSingkat,
          tipeSubInsiden: payload.tipeSubInsiden,
          tindakanSesuaiBands: payload.tindakanSesuaiBands,
          tindakanBands: payload.tindakanBands,
          jenisPengisian: payload.jenisPengisian,
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
          teamMembers: true,
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

  async addTeamMember(reportId: string, payload: RcaTeamMemberInput) {
    const existing = await prisma.rootCauseAnalysis.findUnique({
      where: { reportId },
    });
    if (!existing) {
      throw new ApiError(404, 'RCA tidak ditemukan');
    }
    return prisma.rcaTeamMember.create({
      data: {
        rcaId: existing.id,
        nama: payload.nama,
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
}

export const rcaService = new RcaService();
