import { z } from 'zod';

/**
 * Membuat field enum yang bersifat optional dan toleran terhadap nilai kosong dari form HTML.
 *
 * Masalah yang diselesaikan:
 *   Saat frontend mengirimkan string kosong ("") atau null untuk field enum opsional
 *   (umum terjadi pada elemen <select> yang belum dipilih), Zod akan menolak nilainya
 *   karena "" bukan anggota enum yang valid.
 *
 * Solusi:
 *   Nilai "" (string kosong) dan null dikonversi ke `undefined` sebelum validasi enum,
 *   sehingga Zod memperlakukannya sebagai "tidak diisi" dan lolos validasi optional.
 *
 * Tipe inferensi (z.infer):
 *   Menghasilkan `T[number] | undefined` — identik dengan z.enum(values).optional(),
 *   tanpa ada kebocoran tipe dari preprocess.
 *
 * @example
 *   statusPasienSaatInsiden: optionalEnum(['RAWAT_INAP', 'RAWAT_JALAN', 'IGD', 'LAIN_LAIN']),
 *   // Menerima: undefined, null, "", "RAWAT_INAP", "IGD"
 *   // Menolak:  "rawat_inap", "Rawat Inap", "INVALID"
 */
export const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((val) => (val === '' || val === null ? undefined : val), z.enum(values).optional());
