import { z } from 'zod';
import { optionalEnum } from './zodHelpers';

const STATUS_VALUES = ['RAWAT_INAP', 'RAWAT_JALAN', 'IGD', 'LAIN_LAIN'] as const;

describe('optionalEnum helper', () => {
  const schema = optionalEnum([...STATUS_VALUES]);

  // ── Nilai yang HARUS lolos ──────────────────────────────────────────────

  it('lolos jika field tidak dikirim (undefined)', () => {
    const result = schema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it('lolos jika string kosong ("") dan dikonversi ke undefined', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it('lolos jika null dan dikonversi ke undefined', () => {
    const result = schema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it('lolos dan mengembalikan nilai untuk setiap anggota enum yang valid', () => {
    for (const val of STATUS_VALUES) {
      const result = schema.safeParse(val);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(val);
    }
  });

  // ── Label tampilan dari frontend HARUS dinormalkan ke nilai enum ────────

  it('menormalkan sentence case ke nilai enum ("Rawat Jalan")', () => {
    const result = schema.safeParse('Rawat Jalan');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('RAWAT_JALAN');
  });

  it('menormalkan lowercase ke nilai enum ("rawat_jalan")', () => {
    const result = schema.safeParse('rawat_jalan');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('RAWAT_JALAN');
  });

  it('menormalkan label dengan tanda hubung ke nilai enum ("Lain-lain")', () => {
    const result = schema.safeParse('Lain-lain');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('LAIN_LAIN');
  });

  it('menormalkan label yang punya spasi di awal dan akhir', () => {
    const result = schema.safeParse('  Rawat Inap  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('RAWAT_INAP');
  });

  it('menormalkan singkatan huruf besar yang sudah sama dengan enum ("igd")', () => {
    const result = schema.safeParse('igd');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('IGD');
  });

  // ── Nilai yang HARUS tetap ditolak ──────────────────────────────────────

  it('ditolak untuk nilai string acak yang tidak ada di enum', () => {
    const result = schema.safeParse('INVALID_STATUS');
    expect(result.success).toBe(false);
  });

  it('ditolak untuk label yang mirip tapi bukan anggota enum', () => {
    const result = schema.safeParse('Rawat Darurat');
    expect(result.success).toBe(false);
  });

  it('ditolak untuk angka (tipe salah)', () => {
    const result = schema.safeParse(0);
    expect(result.success).toBe(false);
  });

  it('ditolak untuk boolean (tipe salah)', () => {
    const result = schema.safeParse(false);
    expect(result.success).toBe(false);
  });

  // ── Verifikasi integrasi dengan schema lengkap ──────────────────────────

  it('bekerja dalam konteks object schema: field hilang dianggap undefined (lolos)', () => {
    const objSchema = z.object({ status: optionalEnum([...STATUS_VALUES]) });

    const result = objSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBeUndefined();
  });

  it('bekerja dalam konteks object schema: string kosong dari form dikonversi ke undefined', () => {
    const objSchema = z.object({ status: optionalEnum([...STATUS_VALUES]) });

    const result = objSchema.safeParse({ status: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBeUndefined();
  });

  it('bekerja dalam konteks object schema: nilai enum valid diteruskan apa adanya', () => {
    const objSchema = z.object({ status: optionalEnum([...STATUS_VALUES]) });

    const result = objSchema.safeParse({ status: 'IGD' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('IGD');
  });

  it('bekerja dalam konteks object schema: label "Rawat Jalan" dinormalkan ke RAWAT_JALAN', () => {
    const objSchema = z.object({ status: optionalEnum([...STATUS_VALUES]) });

    const result = objSchema.safeParse({ status: 'Rawat Jalan' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('RAWAT_JALAN');
  });
});
