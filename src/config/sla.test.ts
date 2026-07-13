// src/config/sla.test.ts
// Unit test untuk konfigurasi SLA: SLA_HARI dan hitungDeadlineInvestigasi.

import { SLA_HARI, hitungDeadlineInvestigasi } from './sla';

describe('SLA Config', () => {
  describe('SLA_HARI', () => {
    it('harus mendefinisikan deadline 90 hari untuk HIJAU', () => {
      expect(SLA_HARI['HIJAU']).toBe(90);
    });

    it('harus mendefinisikan deadline 60 hari untuk BIRU', () => {
      expect(SLA_HARI['BIRU']).toBe(60);
    });

    it('harus mendefinisikan deadline 45 hari untuk KUNING', () => {
      expect(SLA_HARI['KUNING']).toBe(45);
    });

    it('harus mendefinisikan deadline 14 hari untuk MERAH', () => {
      expect(SLA_HARI['MERAH']).toBe(14);
    });
  });

  describe('hitungDeadlineInvestigasi', () => {
    it('harus mengembalikan Date sekitar 90 hari dari sekarang untuk HIJAU', () => {
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('HIJAU');
      const setelah = Date.now();

      const selisihMs = deadline.getTime() - (sebelum + setelah) / 2;
      const selisihHari = selisihMs / (1000 * 60 * 60 * 24);

      expect(selisihHari).toBeGreaterThanOrEqual(89.9);
      expect(selisihHari).toBeLessThanOrEqual(90.1);
    });

    it('harus mengembalikan Date sekitar 45 hari dari sekarang untuk KUNING', () => {
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('KUNING');
      const setelah = Date.now();

      const selisihMs = deadline.getTime() - (sebelum + setelah) / 2;
      const selisihHari = selisihMs / (1000 * 60 * 60 * 24);

      expect(selisihHari).toBeGreaterThanOrEqual(44.9);
      expect(selisihHari).toBeLessThanOrEqual(45.1);
    });

    it('harus mengembalikan Date sekitar 14 hari dari sekarang untuk MERAH', () => {
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('MERAH');
      const setelah = Date.now();

      const selisihMs = deadline.getTime() - (sebelum + setelah) / 2;
      const selisihHari = selisihMs / (1000 * 60 * 60 * 24);

      expect(selisihHari).toBeGreaterThanOrEqual(13.9);
      expect(selisihHari).toBeLessThanOrEqual(14.1);
    });

    it('harus melempar Error untuk grading yang tidak dikenali', () => {
      expect(() => hitungDeadlineInvestigasi('UNGU')).toThrow('Grading tidak dikenali: UNGU');
    });

    it('harus mengembalikan instance Date', () => {
      const result = hitungDeadlineInvestigasi('BIRU');
      expect(result).toBeInstanceOf(Date);
    });

    it('deadline harus lebih besar dari sekarang', () => {
      const sekarang = new Date();
      const deadline = hitungDeadlineInvestigasi('MERAH');
      expect(deadline.getTime()).toBeGreaterThan(sekarang.getTime());
    });
  });
});
