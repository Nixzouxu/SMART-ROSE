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

  describe('hitungDeadlineInvestigasi - kalkulasi batas waktu dan edge cases', () => {
    let originalDateNow: () => number;

    beforeAll(() => {
      originalDateNow = Date.now;
    });

    afterAll(() => {
      Date.now = originalDateNow;
    });

    it('Edge Case: Pergantian Bulan (Bukan Tahun Kabisat)', () => {
      // 25 Februari 2023 10:00:00 UTC
      Date.now = jest.fn(() => new Date('2023-02-25T10:00:00Z').getTime());

      const deadline = hitungDeadlineInvestigasi('HIJAU'); // + 14 hari
      // 25 Feb + 3 hari = 28 Feb
      // + 11 hari = 11 Maret
      expect(deadline.toISOString()).toBe('2023-03-11T10:00:00.000Z');
    });

    it('Edge Case: Tahun Kabisat (Melintasi 29 Februari)', () => {
      // 25 Februari 2024 10:00:00 UTC (2024 is leap year)
      Date.now = jest.fn(() => new Date('2024-02-25T10:00:00Z').getTime());

      const deadline = hitungDeadlineInvestigasi('BIRU'); // + 14 hari
      // 25 Feb + 4 hari = 29 Feb
      // + 10 hari = 10 Maret
      expect(deadline.toISOString()).toBe('2024-03-10T10:00:00.000Z');
    });

    it('Edge Case: Pergantian Tahun', () => {
      // 20 Desember 2024 10:00:00 UTC
      Date.now = jest.fn(() => new Date('2024-12-20T10:00:00Z').getTime());

      const deadline = hitungDeadlineInvestigasi('KUNING'); // + 45 hari
      // Desember = 31 hari
      // 20 Des -> 11 hari sisa di Des (hingga 31 Des)
      // Sisa 34 hari -> Januari 31 hari -> 3 Februari
      expect(deadline.toISOString()).toBe('2025-02-03T10:00:00.000Z');
    });

    it('harus melempar Error untuk grading yang tidak dikenali', () => {
      expect(() => hitungDeadlineInvestigasi('UNGU')).toThrow('Grading tidak dikenali: UNGU');
    });
  });
});
