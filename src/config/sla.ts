// src/config/sla.ts
// Konfigurasi deadline SLA (Service Level Agreement) berdasarkan grading risiko insiden.
// Deadline dihitung dalam jumlah hari kalender sejak laporan di-grade oleh admin.
//
// Aturan bisnis keselamatan pasien:
// - HIJAU  : insiden risiko rendah (KPC, KNC ringan), deadline 14 hari
// - BIRU   : insiden risiko sedang-rendah, deadline 14 hari
// - KUNING : insiden risiko sedang-tinggi, deadline 45 hari
//            (butuh investigasi lebih menyeluruh)
// - MERAH  : insiden risiko tinggi / Kejadian Sentinel, deadline 45 hari
//            (justru butuh investigasi PALING menyeluruh - bukan diburu-buru)
//
// Logika: insiden paling parah (MERAH/Sentinel) mendapat waktu LEBIH LAMA
// untuk investigasi mendalam, bukan lebih singkat.

export const SLA_HARI: Record<string, number> = {
  HIJAU: 14,
  BIRU: 14,
  KUNING: 45,
  MERAH: 45,
};

/**
 * Menghitung tanggal deadline investigasi dari SEKARANG berdasarkan grading.
 * Deadline selalu dihitung dari saat regrading dilakukan, bukan dari tanggal kejadian.
 *
 * IMPLEMENTASI: Menggunakan penambahan milidetik langsung (Date.now() + N * 86400000)
 * sehingga konsisten dalam UTC dan tidak terpengaruh timezone lokal server.
 * Pola setDate(getDate() + N) berpotensi salah saat tengah malam WIB (jam 00:00-07:00)
 * karena getDate() lokal bisa berbeda dengan getUTCDate().
 *
 * @param grading - GradingRisiko: 'HIJAU' | 'BIRU' | 'KUNING' | 'MERAH'
 * @returns Date - deadline investigasi (disimpan sebagai UTC, tampilkan di WIB di sisi frontend)
 */
export function hitungDeadlineInvestigasi(grading: string): Date {
  const hari = SLA_HARI[grading];
  if (hari === undefined) {
    throw new Error(`Grading tidak dikenali: ${grading}`);
  }
  // Tambah langsung dalam milidetik - tidak bergantung timezone lokal server
  return new Date(Date.now() + hari * 24 * 60 * 60 * 1000);
}
