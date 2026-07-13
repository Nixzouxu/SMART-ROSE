// src/config/sla.test.ts
// Unit test untuk konfigurasi SLA: SLA_HARI dan hitungDeadlineInvestigasi.
//
// Aturan bisnis: HIJAU/BIRU = 14 hari, KUNING/MERAH = 45 hari

import { SLA_HARI, hitungDeadlineInvestigasi } from './sla';

describe('SLA Config', () => {
  describe('SLA_HARI - angka deadline per grading (aturan keselamatan pasien)', () => {
    it('harus mendefinisikan deadline 14 hari untuk HIJAU (risiko rendah)', () => {
      expect(SLA_HARI['HIJAU']).toBe(14);
    });

    it('harus mendefinisikan deadline 14 hari untuk BIRU (risiko sedang-rendah)', () => {
      expect(SLA_HARI['BIRU']).toBe(14);
    });

    it('harus mendefinisikan deadline 45 hari untuk KUNING (risiko sedang-tinggi)', () => {
      expect(SLA_HARI['KUNING']).toBe(45);
    });

    it('harus mendefinisikan deadline 45 hari untuk MERAH (sentinel - paling menyeluruh)', () => {
      expect(SLA_HARI['MERAH']).toBe(45);
    });
  });

  describe('hitungDeadlineInvestigasi - kalkulasi UTC berbasis milidetik', () => {
    // Toleransi: hanya selisih eksekusi (hitungan ms - bukan jam)
    // Pakai 0.001 hari = ~86 detik, cukup longgar untuk CI tapi jauh lebih ketat dari 0.5 hari
    const TOLERANSI_HARI = 0.001;

    it('harus mengembalikan Date sekitar 14 hari dari sekarang untuk HIJAU', () => {
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('HIJAU');
      const setelah = Date.now();
      // Gunakan midpoint agar tidak terpengaruh latensi eksekusi kode
      const midpoint = (sebelum + setelah) / 2;
      const selisihHari = (deadline.getTime() - midpoint) / (24 * 60 * 60 * 1000);

      expect(selisihHari).toBeGreaterThanOrEqual(14 - TOLERANSI_HARI);
      expect(selisihHari).toBeLessThanOrEqual(14 + TOLERANSI_HARI);
    });

    it('harus mengembalikan Date sekitar 14 hari dari sekarang untuk BIRU', () => {
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('BIRU');
      const setelah = Date.now();
      const midpoint = (sebelum + setelah) / 2;
      const selisihHari = (deadline.getTime() - midpoint) / (24 * 60 * 60 * 1000);

      expect(selisihHari).toBeGreaterThanOrEqual(14 - TOLERANSI_HARI);
      expect(selisihHari).toBeLessThanOrEqual(14 + TOLERANSI_HARI);
    });

    it('harus mengembalikan Date sekitar 45 hari dari sekarang untuk KUNING', () => {
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('KUNING');
      const setelah = Date.now();
      const midpoint = (sebelum + setelah) / 2;
      const selisihHari = (deadline.getTime() - midpoint) / (24 * 60 * 60 * 1000);

      expect(selisihHari).toBeGreaterThanOrEqual(45 - TOLERANSI_HARI);
      expect(selisihHari).toBeLessThanOrEqual(45 + TOLERANSI_HARI);
    });

    it('harus mengembalikan Date sekitar 45 hari dari sekarang untuk MERAH', () => {
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('MERAH');
      const setelah = Date.now();
      const midpoint = (sebelum + setelah) / 2;
      const selisihHari = (deadline.getTime() - midpoint) / (24 * 60 * 60 * 1000);

      expect(selisihHari).toBeGreaterThanOrEqual(45 - TOLERANSI_HARI);
      expect(selisihHari).toBeLessThanOrEqual(45 + TOLERANSI_HARI);
    });

    it('harus melempar Error untuk grading yang tidak dikenali', () => {
      expect(() => hitungDeadlineInvestigasi('UNGU')).toThrow('Grading tidak dikenali: UNGU');
    });

    it('harus mengembalikan instance Date', () => {
      const result = hitungDeadlineInvestigasi('KUNING');
      expect(result).toBeInstanceOf(Date);
    });

    it('deadline harus selalu lebih besar dari sekarang (untuk semua grading)', () => {
      const sekarang = new Date();
      for (const grading of ['HIJAU', 'BIRU', 'KUNING', 'MERAH']) {
        const deadline = hitungDeadlineInvestigasi(grading);
        expect(deadline.getTime()).toBeGreaterThan(sekarang.getTime());
      }
    });

    it('implementasi harus konsisten UTC: tidak bergantung timezone lokal server', () => {
      // Verifikasi bahwa selisih antara deadline dan sekarang adalah TEPAT N*86400000 ms
      // (bukan bergantung pada midnight lokal yang berbeda-beda per timezone)
      const sebelum = Date.now();
      const deadline = hitungDeadlineInvestigasi('KUNING');
      const setelah = Date.now();

      // Selisih seharusnya adalah 45 * 86400000 ms, dengan toleransi hanya beberapa ms
      const HARI = 45;
      const EXPECTED_MS = HARI * 24 * 60 * 60 * 1000;
      const TOLERANSI_MS = 100; // 100 ms toleransi waktu eksekusi kode

      const selisihMs = deadline.getTime() - (sebelum + setelah) / 2;
      expect(Math.abs(selisihMs - EXPECTED_MS)).toBeLessThan(TOLERANSI_MS);
    });
  });
});
