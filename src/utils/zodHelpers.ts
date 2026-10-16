import { z } from 'zod';

/**
 * Menormalkan nilai mentah dari frontend sebelum divalidasi sebagai enum.
 *
 * - "" (string kosong) dan null dianggap tidak diisi (undefined).
 * - Teks diubah ke huruf besar, spasi dan tanda hubung diganti garis bawah.
 *   Contoh: "Rawat Jalan" -> "RAWAT_JALAN", "Lain-lain" -> "LAIN_LAIN".
 * - Hasil normalisasi hanya dipakai kalau memang ada di daftar enum.
 *   Kalau tidak cocok, nilai aslinya dibiarkan supaya tetap ditolak oleh Zod.
 */
const normalizeEnumInput = (val: unknown, values: readonly string[]) => {
  if (val === '' || val === null) return undefined;
  if (typeof val !== 'string') return val;

  const normalized = val
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return values.includes(normalized) ? normalized : val;
};

/**
 * Membuat field enum yang bersifat optional dan toleran terhadap nilai dari form HTML.
 *
 * Masalah yang diselesaikan:
 *   1. Saat frontend mengirimkan string kosong ("") atau null untuk field enum opsional
 *      (umum terjadi pada elemen <select> yang belum dipilih), Zod akan menolak nilainya
 *      karena "" bukan anggota enum yang valid.
 *   2. Saat frontend mengirimkan label tampilan (misalnya "Rawat Jalan") dan bukan
 *      nilai enum (RAWAT_JALAN), Zod akan menolak seluruh laporan.
 *
 * Solusi:
 *   Nilai "" dan null dikonversi ke `undefined`. Nilai teks dinormalkan ke format enum
 *   (huruf besar, spasi dan tanda hubung menjadi garis bawah) sebelum validasi.
 *   Nilai yang tetap tidak cocok setelah normalisasi akan ditolak seperti biasa.
 *
 * Tipe inferensi (z.infer):
 *   Menghasilkan `T[number] | undefined`, identik dengan z.enum(values).optional(),
 *   tanpa ada kebocoran tipe dari preprocess.
 *
 * @example
 *   statusPasienSaatInsiden: optionalEnum(['RAWAT_INAP', 'RAWAT_JALAN', 'IGD', 'LAIN_LAIN']),
 *   // Menerima: undefined, null, "", "RAWAT_INAP", "IGD", "rawat_inap", "Rawat Inap"
 *   // Menolak:  "INVALID"
 */
export const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((val) => normalizeEnumInput(val, values), z.enum(values).optional());
