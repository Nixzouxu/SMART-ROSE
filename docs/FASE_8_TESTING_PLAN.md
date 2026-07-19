# FASE 8: RENCANA PENGUJIAN (TESTING & QA)

Dokumen ini mendeskripsikan secara rinci strategi dan cakupan pengujian untuk aplikasi SMART-ROSE yang telah dikembangkan dari Fase 0 hingga Fase 7. Terdapat empat area pengujian utama yang akan dieksekusi secara bertahap.

---

## 1. Unit Testing (menggunakan Jest)
Pengujian pada level unit difokuskan pada modul utilitas (fungsi *helper* / *service*) yang memiliki tingkat kompleksitas tinggi dan kritikal terhadap keamanan serta akurasi perhitungan. Komponen eksternal seperti *database* akan di-mock.

**Cakupan Pengujian:**
1. **Utilitas Enkripsi (`src/utils/encryption.ts`)**
   - [ ] Menguji keberhasilan enkripsi data menjadi string *cipher* yang tepat.
   - [ ] Menguji keberhasilan dekripsi data kembali ke bentuk aslinya (*plaintext*).
   - [ ] Memastikan hasil enkripsi berbeda setiap kali dipanggil (menggunakan IV acak) meskipun datanya sama.
   - [ ] Menangani dengan baik percobaan dekripsi yang menggunakan *tag* autentikasi (GCM) yang salah atau *corrupt* (harus gagal/melempar *error*).
   - [ ] Memastikan enkripsi/dekripsi dengan kunci AES yang salah akan gagal.
   - [ ] **Skenario Fallback:** Menguji utilitas dekripsi ketika membaca *plaintext* mentah (menyimulasikan data laporan lama sebelum Fase 7). Harus dipastikan fungsi melakukan *fallback* dengan sukses dan tidak *crash*.

2. **Kalkulator SLA (`src/utils/sla.ts` atau kalkulasi *deadline* yang ada di dalam *service*)**
   - [ ] Menguji akurasi perhitungan *deadline* sesuai aturan ketat: **HIJAU/BIRU = 14 hari**, dan **KUNING/MERAH = 45 hari**.
   - [ ] **Edge Cases:** Menguji perhitungan tenggat waktu yang melintasi pergantian bulan (misal akhir bulan Februari ke Maret).
   - [ ] **Edge Cases:** Menguji perhitungan tenggat waktu pada tahun kabisat (melintasi 29 Februari).
   - [ ] Menguji status SLA yang dihitung secara dinamis (apakah sudah lewat *deadline* atau tidak).
   - [ ] Memastikan pelaporan risiko awal yang direvisi ke *grading final* akan menyesuaikan *deadline* sesuai *flow*.

3. **Logika *Chatbot Matcher* (`src/modules/chatbot/chatbot.service.ts` atau fungsi NLP ringannya)**
   - [ ] Memastikan kata kunci pertanyaan standar (misal "cara login", "lupa password") mengembalikan jawaban dari basis pengetahuan *chatbot*.
   - [ ] Memastikan pertanyaan yang melenceng atau tingkat keyakinannya (*confidence score* fiktif/regex) terlalu rendah akan dipicu sebagai *fallback* (membutuhkan eskalasi ke Admin).
   - [ ] Menguji pencatatan historis log *chatbot* berhasil menyatu dengan skema *database*.

---

## 2. Integration Testing (menggunakan Supertest)
Pengujian ini tidak melakukan *mocking* ke *database*, melainkan menggunakan *database development* (atau yang dikhususkan untuk *testing* / Redis fiktif) demi membuktikan aliran data lintas *middleware*, *routes*, hingga *controller*.

**Cakupan Pengujian:**
1. **Autentikasi & Otorisasi**
   - [ ] Flow sukses *login* yang mengembalikan token akses, serta validasi skema akses berdasarkan `Role` (User vs Admin Utama).
   - [ ] Menguji perlindungan JWT dengan mengirim token palsu (harus gagal - 401).
   
2. **Siklus Hidup Laporan Insiden & Flow RCA (*End-to-End Core Flow*)**
   - [ ] **Create:** Laporan masuk oleh publik/User (menghasilkan status `DRAFT` atau `SUBMITTED`).
   - [ ] **Upload Lampiran:** Menembak *endpoint* validasi *magic bytes* dan menguji pengunggahan gambar/PDF. Menguji perlakuan terhadap format `.docx` dan `.xlsx` untuk lampiran reguler.
   - [ ] **Investigasi:** Memindahkan status ke `DALAM_INVESTIGASI`.
   - [ ] **RCA Kompleks (6 Sub-Tabel):** Menyimulasikan pengisian terstruktur RCA secara lengkap sebelum divalidasi final:
     1. Menetapkan Tim Investigasi (Ketua, Anggota).
     2. Menambahkan *Timeline Kronologi*.
     3. Mengisi matriks *Time-Person-Grid*.
     4. Menambahkan analisis *5 Why*.
     5. Menambahkan analisis *Fishbone*.
     6. Mengajukan dan merumuskan *Rencana Perbaikan*.
   - [ ] **Upload Lampiran RCA:** Menambahkan lampiran khusus RCA dengan validasi dokumen (PDF/DOCX/XLSX). Menguji secara spesifik **penolakan** terhadap file gambar (`.jpg`) yang dikirim menyamar/direname.
   - [ ] **Finalisasi:** Mengubah status laporan menjadi `SELESAI`.

3. **Negative Testing Khusus**
   - [ ] **403 Forbidden:** Memastikan perlindungan *role* (contoh: *User* biasa mencoba mengakses *endpoint* ekspor laporan massal akan ditolak secara mutlak).
   - [ ] **409 Conflict:** Memastikan laporan yang sudah dikunci (berstatus `SELESAI`) menolak segala percobaan pembaruan (*update*).
   - [ ] **413 Payload Too Large:**
     - Menguji batas ketat **5MB** untuk lampiran laporan reguler.
     - Menguji batas ketat **10MB** untuk lampiran dokumen RCA.

4. **Notifikasi dan Pengumuman**
   - [ ] Memastikan pengumuman sistem (Announcement) dapat dikirimkan ke target (misal: SEMUA peran).
   - [ ] *Fetch list* notifikasi milik seorang pengguna terdaftar.

---

## 3. Load Testing (menggunakan Autocannon)
Karena aplikasi ini menargetkan penggunaan terpadu di Rumah Sakit di mana insiden/kepanikan pelaporan mungkin terjadi (atau ada *crawler* pihak luar pada laman publik), performa adalah kunci.

**Cakupan Pengujian:**
1. **Endpoint Laporan Publik (`POST /api/reports`)**
   - [ ] Menyimulasikan serbuan trafik 1.000 *request* secara simultan dalam 10 detik.
   - [ ] Memastikan persentase kelolosan tinggi, tidak terjadi kebocoran memori (Redis dapat menahan CAPTCHA token).
   - [ ] Menguji bagaimana *rate limiter* merespons lonjakan (apakah akan di-*throttle* dengan status 429).

2. **Dashboard Realtime (`GET /api/dashboard/stats`)**
   - [ ] Menyimulasikan aktivitas 50-100 staf admin RS yang me-*refresh* *dashboard* secara bersamaan.
   - [ ] Mengukur waktu respons rata-rata (harus optimal karena *query aggregasi*).

---

## 4. Panduan User Acceptance Testing (UAT)
Akan dibuat dokumen skenario manual (`docs/UAT_SCENARIOS.md`) yang didesain agar pihak direksi, admin mutu RS, maupun staf medis bisa melakukan uji coba langsung ke antarmuka aplikasi.
(Penyusunan langkah-langkah UAT akan dilakukan setelah semua *automated test* lulus 100%).

*Rencana ini akan dilaksanakan berurutan mulai dari Unit -> Integration -> Load Testing.*
