import { z } from 'zod';
import {
  StatusRca,
  KategoriFishbone,
  StatusRencanaPerbaikan,
  PeranTim,
  JenisPengisian,
  JenisInvestigasi,
} from '@prisma/client';

export const rcaTimelineSchema = z.object({
  waktu: z.string().min(1, 'Waktu harus diisi'),
  kejadian: z.string().min(1, 'Kejadian harus diisi'),
  informasiTambahan: z.string().optional(),
  goodPractice: z.string().optional(),
  masalahPelayanan: z.string().optional(),
  urutan: z.number().int().min(1),
});

export const rcaTimePersonGridSchema = z.object({
  staf: z.string().min(1, 'Staf harus diisi'),
  waktu: z.string().min(1, 'Waktu harus diisi'),
  deskripsi: z.string().min(1, 'Deskripsi harus diisi'),
  urutan: z.number().int().min(1),
});

export const rcaFiveWhySchema = z.object({
  urutan: z.number().int().min(1).max(5),
  jawaban: z.string().min(1, 'Jawaban harus diisi'),
});

export const rcaFishboneSchema = z.object({
  kategori: z.nativeEnum(KategoriFishbone),
  penyebab: z.string().min(1, 'Penyebab harus diisi'),
  urutan: z.number().int().min(1),
});

export const rcaRencanaPerbaikanSchema = z.object({
  akarMasalah: z.string().min(1, 'Akar masalah harus diisi'),
  rekomendasiSolusi: z.string().min(1, 'Rekomendasi solusi harus diisi'),
  tindakanPerbaikan: z.string().min(1, 'Tindakan perbaikan harus diisi'),
  pelaksana: z.string().min(1, 'Pelaksana harus diisi'),
  targetWaktu: z.string().min(1, 'Target waktu harus diisi'),
  status: z.nativeEnum(StatusRencanaPerbaikan).optional(),
  urutan: z.number().int().min(1),
});

export const createUpdateRcaSchema = z.object({
  body: z.object({
    observasi: z.string().optional(),
    dokumentasi: z.string().optional(),
    kronologiSingkat: z.string().min(1, 'Kronologi singkat harus diisi'),
    tipeSubInsiden: z.string().optional(),
    tindakanSesuaiBands: z.string().optional(),
    tindakanBands: z.string().optional(),
    jenisPengisian: z.nativeEnum(JenisPengisian).optional(),
    jenisInvestigasi: z.nativeEnum(JenisInvestigasi).optional(),
    daftarInterviewee: z.array(z.string()).default([]),
    masalahAwal5Why: z.string().min(1, 'Masalah awal 5 Why harus diisi'),
    status: z.nativeEnum(StatusRca).optional(),
    timelineEntries: z.array(rcaTimelineSchema).default([]),
    timePersonGridEntries: z.array(rcaTimePersonGridSchema).default([]),
    fiveWhyEntries: z
      .array(rcaFiveWhySchema)
      .default([])
      .refine((val) => val.length === 0 || val.length === 5, {
        message: 'Five Why harus kosong atau tepat berisi 5 item',
      }),
    fishboneEntries: z.array(rcaFishboneSchema).default([]),
    rencanaPerbaikanEntries: z.array(rcaRencanaPerbaikanSchema).default([]),
  }),
});

export const addRcaTeamMemberSchema = z.object({
  body: z.object({
    userId: z.string({ required_error: 'User ID wajib diisi' }).uuid('Format User ID tidak valid'),
    peran: z.nativeEnum(PeranTim),
  }),
});

export const updateRcaTeamMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Format User ID tidak valid').optional(),
    peran: z.nativeEnum(PeranTim).optional(),
  }),
});

export const persetujuanRcaSchema = z.object({
  body: z.object({
    keputusan: z.enum(['setuju', 'revisi']),
    catatan: z.string().optional(),
  }),
});
