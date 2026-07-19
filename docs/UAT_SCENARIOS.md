# Panduan Pengujian Penerimaan Pengguna (UAT) - SMART-ROSE

Dokumen ini merupakan panduan bagi Bapak/Ibu Kepala Puskesmas, Tim Mutu, dan Tenaga Kesehatan (Perawat/Dokter) untuk melakukan uji coba (User Acceptance Testing) terhadap sistem pelaporan insiden SMART-ROSE. 

Mohon ikuti langkah-langkah di bawah ini untuk memastikan aplikasi sudah berjalan sesuai dengan alur kerja di rumah sakit/puskesmas.

---

## Skenario 1: Pelaporan Insiden oleh Perawat/Staf (Tanpa Login)
**Tujuan:** Memastikan tenaga kesehatan di lapangan dapat melaporkan insiden dengan cepat dan mudah tanpa harus memiliki atau mengingat akun login.

**Langkah-langkah Uji Coba:**
1. Buka halaman utama aplikasi pelaporan insiden (halaman publik).
2. Isi formulir pelaporan dengan lengkap, termasuk:
   - Jenis Insiden (misal: KTD atau Kejadian Tidak Diharapkan)
   - Tanggal dan waktu kejadian
   - Lokasi kejadian (misal: Ruang IGD)
   - Kronologi singkat kejadian
3. Jawab pertanyaan keamanan (Captcha) berupa soal matematika sederhana di bagian bawah formulir untuk membuktikan Anda bukan robot komputer.
4. Tekan tombol **"Kirim Laporan"**.
5. Setelah berhasil, catat **Nomor Pelacakan (Tracking Number)** yang muncul di layar.
6. Coba unggah foto bukti kejadian (misal: foto lantai licin atau alat medis) menggunakan format `.pdf` atau `.jpg`.

**Hasil yang Diharapkan:** Laporan berhasil terkirim dan sistem memberikan konfirmasi keberhasilan beserta Nomor Pelacakan. Foto bukti kejadian berhasil dilampirkan.

---

## Skenario 2: Penerimaan Laporan oleh Admin Mutu
**Tujuan:** Memastikan Tim Mutu dapat menerima laporan baru dan segera menindaklanjutinya.

**Langkah-langkah Uji Coba:**
1. Login ke dalam sistem menggunakan akun **Admin Mutu**.
2. Buka menu **Daftar Laporan Masuk** di dasbor Anda.
3. Cari laporan baru yang baru saja dibuat oleh perawat pada Skenario 1.
4. Buka detail laporan tersebut dan periksa apakah informasi kronologi dan foto bukti sudah sesuai.
5. Ubah status laporan dari "Diterima" menjadi **"Dalam Investigasi"**.
6. Simpan perubahan.

**Hasil yang Diharapkan:** Admin Mutu dapat melihat laporan baru tersebut dan sukses mengubah statusnya. Sistem menyimpan perubahan status ke "Dalam Investigasi".

---

## Skenario 3: Pengisian Investigasi Mendalam (RCA) oleh Tim Investigasi
**Tujuan:** Memastikan Tim Investigasi dapat mencatat hasil analisis akar masalah (Root Cause Analysis/RCA) dengan lengkap dan sistematis.

**Langkah-langkah Uji Coba:**
1. Dengan menggunakan akun **Admin/Tim Investigasi**, buka kembali laporan yang sudah berstatus "Dalam Investigasi".
2. Masuk ke halaman **Formulir RCA**.
3. Isi ke-6 langkah atau tabel investigasi yang disediakan, mulai dari:
   - Identifikasi Masalah Utama
   - Tim Investigasi yang terlibat
   - Kronologi detail kejadian
   - Analisis 5 Mengapa (5-Why Analysis)
   - Rencana Tindakan Perbaikan
   - Rekomendasi
4. Simpan seluruh isian formulir.
5. Pada bagian lampiran RCA, cobalah unggah dokumen laporan investigasi lengkap dalam bentuk PDF.

**Hasil yang Diharapkan:** Sistem berhasil menyimpan ke-6 tahapan investigasi RCA tanpa terpotong. Dokumen bukti PDF berhasil tersimpan dan tertaut pada laporan tersebut.

---

## Skenario 4: Pengecekan Keamanan dan Kerahasiaan Data (Privasi Pasien)
**Tujuan:** Memastikan bahwa informasi sensitif (seperti kronologi kejadian yang mungkin memuat nama pasien atau detail medis) dilindungi oleh sistem secara ketat.

**Langkah-langkah Uji Coba:**
1. Mintalah bantuan teknisi IT Anda untuk membuka langsung pangkalan data (database) sistem tanpa melalui aplikasi SMART-ROSE.
2. Cari tabel yang menyimpan laporan dari Skenario 1.
3. Lihat pada kolom "Kronologi" atau detail kejadian di pangkalan data tersebut.
4. Bandingkan dengan teks yang ada di layar aplikasi Anda.

**Hasil yang Diharapkan:** Teknisi IT hanya akan melihat teks acak yang tidak bisa dibaca (data terenkripsi) di pangkalan data, sedangkan Anda yang login secara resmi melalui aplikasi tetap dapat membaca tulisan kronologi aslinya dengan jelas.

---

## Skenario 5: Perlindungan Sistem dari Laporan Palsu (Spam)
**Tujuan:** Memastikan sistem tidak bisa dirusak oleh orang iseng yang mengirim ribuan laporan palsu dalam hitungan detik.

**Langkah-langkah Uji Coba:**
1. Buka kembali halaman pelaporan publik tanpa login.
2. Isi formulir namun **sengaja berikan jawaban matematika (Captcha) yang salah**. Tekan kirim. (Sistem harus menolak laporan Anda).
3. Isi formulir dengan benar, lalu mintalah teknisi IT Anda untuk mensimulasikan penekanan tombol "Kirim Laporan" sebanyak 100 kali dalam 1 menit menggunakan alat penguji.

**Hasil yang Diharapkan:** Laporan dengan jawaban Captcha yang salah akan langsung ditolak. Percobaan pengiriman laporan berulang secara massal akan diblokir otomatis oleh sistem pelindung spam dengan peringatan bahwa batas pengiriman telah tercapai.

---
*Dokumen ini digunakan sebagai checklist persetujuan sebelum sistem diresmikan penggunaannya.*
