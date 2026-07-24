# Panduan Integrasi Chatbot untuk Frontend (SMART-ROSE)

Dokumen ini berisi panduan teknis bagi tim Frontend untuk mengintegrasikan fitur Chatbot FAQ ke dalam antarmuka pengguna (UI) SMART-ROSE, beserta daftar referensi pertanyaan yang dapat diajukan oleh pengguna.

---

## 1. Spesifikasi Endpoint API

Semua endpoint chatbot membutuhkan autentikasi pengguna. Pastikan untuk selalu menyertakan header `Authorization: Bearer <token_jwt>` pada setiap permintaan.

### A. Mengirim Pertanyaan ke Chatbot
Digunakan saat pengguna mengetik dan mengirim pesan di UI Chatbot.

- **URL:** `POST /api/chatbot/ask`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Body Payload (JSON):**
  ```json
  {
    "pertanyaan": "String pertanyaan dari user, contoh: apa itu ktd?"
  }
  ```
- **Response Sukses (Match di Knowledge Base) - `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Berhasil memproses pertanyaan chatbot",
    "data": {
      "logId": "uuid-log-history",
      "jawaban": "Kejadian Tidak Diharapkan (KTD) adalah insiden yang mengakibatkan cedera pada pasien...",
      "sumber": "KNOWLEDGE_BASE",
      "confidence": 1
    }
  }
  ```
- **Response Eskalasi (Tidak ada jawaban / Diteruskan ke Admin) - `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Berhasil memproses pertanyaan chatbot",
    "data": {
      "logId": "uuid-log-history",
      "jawaban": "Maaf, saya belum mengerti. Pertanyaan Anda telah diteruskan ke Admin dan akan segera dijawab.",
      "sumber": "ESKALASI_ADMIN",
      "confidence": 0
    }
  }
  ```

### B. Mengambil Riwayat Percakapan (History)
Digunakan saat UI Chatbot pertama kali dibuka untuk merender histori obrolan sebelumnya.

- **URL:** `GET /api/chatbot/history?page=1&limit=20`
- **Headers:**
  - `Authorization: Bearer <token>`
- **Response Sukses - `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Berhasil mengambil riwayat chatbot",
    "data": {
      "logs": [
        {
          "id": "uuid-log-history",
          "pertanyaan": "apa itu ktd?",
          "jawaban": "Kejadian Tidak Diharapkan (KTD)...",
          "sumberJawaban": "KNOWLEDGE_BASE",
          "statusEskalasi": "SELESAI",
          "createdAt": "2026-07-20T14:26:41.000Z"
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "lastPage": 1
      }
    }
  }
  ```

---

## 2. Cara Menanyakan dan Rekomendasi Prompt (Kategori FAQ)

Sistem chatbot sudah di-seed dengan **77 variasi data** yang mencakup regulasi resmi (KMK No. 165/2023) dan panduan operasional aplikasi. Algoritma pencarian menggunakan kombinasi *Exact Match* dan *Fuzzy Matching (Fuse.js)*.

Artinya, **pengguna tidak perlu mengetik sama persis (typo ringan dan variasi kalimat didukung)**, selama kata kuncinya relevan.

Berikut adalah referensi pertanyaan (contoh) yang bisa langsung dijawab oleh Chatbot dan bisa dijadikan `Chips` / `Suggestion Buttons` di UI Frontend:

### Kategori 1: Definisi & Klasifikasi Insiden
- "Apa itu KNC?" / "Jelaskan KNC"
- "Apa perbedaan KTD dan Sentinel?"
- "Definisi KPCS"
- "Contoh kejadian sentinel"

### Kategori 2: Alur & SOP Pelaporan
- "Berapa lama batas waktu lapor insiden?" (Jawaban: maksimal 2x24 jam)
- "Siapa yang harus lapor ke komite mutu?"
- "Bagaimana alur laporan dari unit ke pusat?"
- "Apakah dokter bisa langsung melapor?"

### Kategori 3: Grading & Investigasi (RCA)
- "Apa itu grading matrix?"
- "Siapa yang melakukan investigasi komprehensif (RCA)?"
- "Kapan pita merah atau kuning diberikan?"
- "Berapa lama waktu investigasi untuk pita biru?"

### Kategori 4: Sasaran Keselamatan Pasien (SKP)
- "Apa saja 6 SKP?"
- "Bagaimana cara identifikasi pasien yang benar?"
- "Aturan obat high alert"
- "Penandaan lokasi operasi (site marking)"

### Kategori 5: Panduan Akun & Login
- "Bagaimana cara daftar?" / "Cara buat akun"
- "Lupa password"
- "Kode OTP tidak masuk di email" / "OTP gak dapet"
- "Akun saya diblokir / dinonaktifkan"

### Kategori 6: Panduan Penggunaan Aplikasi Utama
- "Cara buat laporan baru"
- "Bagaimana cara edit laporan?"
- "Admin liat semua data" / "Cara filter data laporan"
- "Cara ekspor data ke Excel atau PDF"

### Kategori 7: Troubleshooting (Masalah Teknis UI/UX)
- "Halaman blank / layar putih kosong"
- "Gagal upload file lampiran"
- "Tabel data tidak muncul" / "Loading terus menerus"
- "Tombol simpan tidak bisa diklik"

---

## 3. Penanganan State pada UI Frontend

Agar pengalaman pengguna (*User Experience*) maksimal, tim Frontend disarankan mengikuti panduan *state* berikut:
1. **Loading State:** Tampilkan animasi "Chatbot sedang mengetik..." (*typing indicator*) selama me-request ke `POST /api/chatbot/ask`.
2. **Eskalasi Admin:** Jika response API mengembalikan `sumber: "ESKALASI_ADMIN"`, UI sebaiknya memberikan penanda visual (misal: warna teks sedikit berbeda atau ada ikon *pending*) bahwa pertanyaan ini sedang menunggu jawaban manusia.
3. **Penyegaran Otomatis (Opsional):** Jika ada pertanyaan yang menunggu admin, Frontend dapat melakukan *polling* ringan atau menggunakan notifikasi/WebSocket (jika sudah diimplementasi) untuk merefresh *history* ketika admin sudah membalas.
