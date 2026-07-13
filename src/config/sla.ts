// src/config/sla.ts
// Konfigurasi deadline SLA (Service Level Agreement) berdasarkan grading risiko insiden.
// Deadline dihitung dalam jumlah hari kalender sejak laporan di-grade oleh admin.
//
// Referensi standar:
// - HIJAU  : insiden risiko rendah, 90 hari
// - BIRU   : insiden risiko sedang-rendah, 60 hari
// - KUNING : insiden risiko sedang-tinggi, 45 hari
// - MERAH  : insiden risiko tinggi/sentinel, 14 hari

export const SLA_HARI: Record<string, number> = {
  HIJAU: 90,
  BIRU: 60,
  KUNING: 45,
  MERAH: 14,
};

/**
 * Menghitung tanggal deadline investigasi dari SEKARANG berdasarkan grading.
 * Deadline selalu dihitung dari saat regrading dilakukan, bukan dari tanggal kejadian.
 *
 * @param grading - GradingRisiko: 'HIJAU' | 'BIRU' | 'KUNING' | 'MERAH'
 * @returns Date - deadline investigasi
 */
export function hitungDeadlineInvestigasi(grading: string): Date {
  const hari = SLA_HARI[grading];
  if (hari === undefined) {
    throw new Error(`Grading tidak dikenali: ${grading}`);
  }
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + hari);
  return deadline;
}
