# Panduan Integrasi Chatbot untuk Frontend (SMART-ROSE)

Dokumen ini berisi panduan teknis bagi tim Frontend untuk mengintegrasikan fitur Chatbot FAQ ke dalam antarmuka pengguna (UI) SMART-ROSE, beserta daftar referensi pertanyaan yang dapat diajukan oleh pengguna.

---

## 1. Spesifikasi Endpoint API (Untuk Pengguna / Pelapor)

Terdapat 2 jenis endpoint untuk mengirim pertanyaan ke Chatbot (publik dan terautentikasi). Frontend wajib memilih endpoint yang sesuai dengan status login pengguna.

### A. Mengirim Pertanyaan ke Chatbot (Publik / Tanpa Login)
Digunakan saat pengguna (pelapor anonim) mengetik dan mengirim pesan di UI Chatbot dari halaman publik.

- **URL:** POST /api/chatbot/public/ask
- **Headers:**
  - Content-Type: application/json
  - *(Tidak perlu Authorization header)*
- **Body Payload (JSON):**
  `json
  {
    "pertanyaan": "String pertanyaan dari user, contoh: apa itu ktd?"
  }
  `

### B. Mengirim Pertanyaan ke Chatbot (Login)
Digunakan saat pengguna (pelapor/pegawai) sudah login. Riwayat percakapannya akan tersimpan dan dihubungkan ke akunnya.

- **URL:** POST /api/chatbot/ask
- **Headers:**
  - Content-Type: application/json
  - Authorization: Bearer <token>
- **Body Payload (JSON):**
  `json
  {
    "pertanyaan": "String pertanyaan dari user, contoh: apa itu ktd?"
  }
  `

**Response Sukses untuk (A) maupun (B) (Match di Knowledge Base) - 200 OK:**
`json
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
`

**Response Eskalasi untuk (A) maupun (B) (Tidak ada jawaban / Diteruskan ke Admin) - 200 OK:**
`json
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
`

### C. Mengambil Riwayat Percakapan (History - Khusus Login)
Digunakan saat UI Chatbot pertama kali dibuka untuk merender histori obrolan sebelumnya.

- **URL:** GET /api/chatbot/history?page=1&limit=20
- **Headers:**
  - Authorization: Bearer <token>
- **Response Sukses - 200 OK:**
  `json
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
  `

---

## 2. Spesifikasi Endpoint API (Untuk Admin - Menjawab Eskalasi)

Endpoint ini khusus digunakan oleh **Admin** / **Admin Utama** untuk menjawab pertanyaan Chatbot yang gagal dijawab otomatis oleh sistem.

### A. Alur Kerja (Workflow) Frontend Admin
1. Admin menerima **Notifikasi** via Socket atau dari endpoint GET /api/notifications/me. Notifikasi ini memiliki 	ipe: "CHATBOT" dan eferensiId: "<UUID_LOG_ID>".
2. Frontend menggunakan eferensiId tersebut untuk mengambil detail pertanyaan via endpoint **GET Detail Pertanyaan** di bawah.
3. Frontend menampilkan UI form untuk memasukkan jawaban.
4. Admin mengirim jawaban via endpoint **POST Jawab Pertanyaan**.

### B. GET Detail Pertanyaan
Mengambil detail satu pertanyaan chatbot.

- **URL:** GET /api/chatbot/pertanyaan/:id *(di mana :id adalah eferensiId dari notifikasi)*
- **Headers:**
  - Authorization: Bearer <token> (Auth: ADMIN / ADMIN_UTAMA)
- **Response Sukses - 200 OK:**
  `json
  {
    "id": "uuid-log-id",
    "pertanyaan": "pertanyaan dari user",
    "namaUser": "Nama Pelapor / Anonim",
    "createdAt": "2026-07-24T12:00:00.000Z",
    "status": "BELUM_TERJAWAB" // atau "TERJAWAB"
  }
  `
- **Response Error - 400 Bad Request:**
  Akan terjadi jika ID log yang diminta merupakan pertanyaan yang sudah dijawab otomatis oleh Chatbot (TERJAWAB_OTOMATIS), karena ini bukan eskalasi.
  `json
  {
    "success": false,
    "message": "Pertanyaan ini bukan merupakan eskalasi ke Admin (TERJAWAB_OTOMATIS)"
  }
  `

### C. POST Jawab Pertanyaan
Mengirim balasan admin untuk pertanyaan yang dieskalasi.

- **URL:** POST /api/chatbot/pertanyaan/:id/jawab
- **Headers:**
  - Content-Type: application/json
  - Authorization: Bearer <token> (Auth: ADMIN / ADMIN_UTAMA)
- **Body Payload (JSON):**
  `json
  {
    "jawaban": "String jawaban admin (min: 3, max: 2000 karakter)"
  }
  `
- **Response Sukses - 200 OK:**
  `json
  {
    "success": true,
    "message": "Berhasil menjawab pertanyaan chatbot",
    "data": {
      "id": "uuid-log-id",
      "pertanyaan": "pertanyaan dari user",
      "jawaban": "jawaban admin",
      "statusEskalasi": "DIJAWAB_ADMIN"
    }
  }
  `
- **Response Error - 400 Bad Request:**
  - Jika jawaban kosong atau < 3 karakter: "Validasi gagal: body.jawaban: Too small..."
  - Jika log pertanyaan sudah pernah dijawab: "Pertanyaan ini sudah dijawab"

---

## 3. Cara Menanyakan dan Rekomendasi Prompt (Kategori FAQ)

Sistem chatbot sudah di-seed dengan **77 variasi data** yang mencakup regulasi resmi (KMK No. 165/2023) dan panduan operasional aplikasi. Algoritma pencarian menggunakan kombinasi *Exact Match* dan *Fuzzy Matching (Fuse.js)*.

Artinya, **pengguna tidak perlu mengetik sama persis (typo ringan dan variasi kalimat didukung)**, selama kata kuncinya relevan.

Berikut adalah referensi pertanyaan (contoh) yang bisa langsung dijawab oleh Chatbot dan bisa dijadikan Chips / Suggestion Buttons di UI Frontend:

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

## 4. Penanganan State pada UI Frontend

Agar pengalaman pengguna (*User Experience*) maksimal, tim Frontend disarankan mengikuti panduan *state* berikut:
1. **Loading State:** Tampilkan animasi "Chatbot sedang mengetik..." (*typing indicator*) selama me-request ke POST /api/chatbot/ask atau /public/ask.
2. **Eskalasi Admin:** Jika response API mengembalikan sumber: "ESKALASI_ADMIN", UI sebaiknya memberikan penanda visual (misal: warna teks sedikit berbeda atau ada ikon *pending*) bahwa pertanyaan ini sedang menunggu jawaban manusia.
3. **Penyegaran Otomatis (Opsional):** Jika ada pertanyaan yang menunggu admin, Frontend dapat melakukan *polling* ringan atau menggunakan notifikasi/WebSocket (jika sudah diimplementasi) untuk merefresh *history* ketika admin sudah membalas.
