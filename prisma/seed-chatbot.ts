import { db as prisma } from '../src/config/db';

const chatbotData = [
  // Kategori 1 — Definisi & Klasifikasi Insiden
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa itu KPCS?",
    kataKunci: ["kpcs", "kondisi potensial cedera signifikan"],
    jawaban: "KPCS (Kondisi Potensial Cedera Signifikan) adalah kondisi yang berpotensi menimbulkan cedera signifikan atau kejadian sentinel. Contoh konkret: ditemukannya obat diazepam tanpa label high alert di ruang perawatan."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa itu KNC?",
    kataKunci: ["knc", "kejadian nyaris cedera"],
    jawaban: "KNC (Kejadian Nyaris Cedera) adalah insiden yang hampir terjadi namun belum sampai terpapar ke pasien karena berhasil dicegah. Contoh konkret: perawat menyadari dosis obat salah saat hendak menyuntikkan ke pasien, sehingga obat tidak jadi diberikan."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa itu KTC?",
    kataKunci: ["ktc", "kejadian tidak cedera"],
    jawaban: "KTC (Kejadian Tidak Cedera) adalah insiden yang sudah terpapar ke pasien, tetapi tidak timbul cedera. Contoh konkret: pasien salah menerima obat parasetamol dosis dewasa, namun kebetulan pasien tersebut tidak mengalami efek samping atau cedera apapun."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa itu KTD?",
    kataKunci: ["ktd", "kejadian tidak diharapkan"],
    jawaban: "KTD (Kejadian Tidak Diharapkan) adalah insiden yang sudah terpapar ke pasien dan timbul cedera akibat dari proses perawatan, bukan karena penyakit bawaan pasien. Contoh konkret: pasien mengalami reaksi alergi berat akibat kelalaian pengecekan riwayat alergi sebelum pemberian obat."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa itu Sentinel?",
    kataKunci: ["sentinel", "kejadian sentinel"],
    jawaban: "Kejadian Sentinel adalah bentuk KTD yang mengakibatkan kematian, cedera berat, dan/atau permanen yang tidak terkait dengan perjalanan alamiah penyakit pasien. Contoh konkret: patahan jarum 3 cm tertinggal di abdomen pasien pasca operasi."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa bedanya KTC dan KTD?",
    kataKunci: ["beda ktc ktd", "perbedaan insiden"],
    jawaban: "Perbedaan utamanya ada pada dampak ke pasien. Pada KTC (Kejadian Tidak Cedera), insiden sudah mencapai pasien tapi pasien tidak mengalami cedera. Sedangkan pada KTD (Kejadian Tidak Diharapkan), insiden mencapai pasien dan mengakibatkan cedera yang sebenarnya bisa dihindari."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa itu IKP?",
    kataKunci: ["ikp", "insiden keselamatan pasien"],
    jawaban: "IKP atau Insiden Keselamatan Pasien adalah setiap kejadian yang tidak disengaja dan kondisi yang mengakibatkan atau berpotensi mengakibatkan cedera pada pasien yang dapat dicegah (mencakup KPCS, KNC, KTC, KTD, dan Sentinel)."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Kenapa insiden harus dilaporkan?",
    kataKunci: ["kenapa lapor", "wajib lapor insiden"],
    jawaban: "Pelaporan insiden wajib dilakukan bukan untuk mencari siapa yang salah (blame-free culture), melainkan untuk proses pembelajaran. Laporan digunakan untuk menemukan akar masalah (Root Cause) sehingga sistem pelayanan di rumah sakit dapat diperbaiki agar kejadian serupa tidak terulang."
  },

  // Kategori 2 — Alur & SOP Pelaporan
  {
    kategori: "alur-pelaporan",
    pertanyaan: "Bagaimana alur pelaporan insiden di SMART-ROSE?",
    kataKunci: ["alur pelaporan", "cara lapor insiden"],
    jawaban: "1. Siapapun yang melihat/mengalami insiden membuat laporan draft.\n2. Laporkan ke atasan langsung (Kepala Unit).\n3. Kepala Unit melengkapi data dan submit (mengirim) laporan di sistem.\n4. Komite Mutu akan memverifikasi dan menentukan langkah investigasi selanjutnya."
  },
  {
    kategori: "alur-pelaporan",
    pertanyaan: "Berapa lama batas waktu lapor insiden ke Komite Mutu?",
    kataKunci: ["batas waktu lapor", "2x24 jam", "waktu lapor komite mutu", "lapor ke komite mutu", "batas lapor insiden", "kapan harus lapor"],
    jawaban: "Batas waktu maksimal pelaporan insiden secara tertulis/melalui sistem adalah pasti 2x24 jam dihitung sejak kejadian (insiden) tersebut terjadi, sesuai alur resmi."
  },
  {
    kategori: "alur-pelaporan",
    pertanyaan: "Insiden KTD dan Sentinel dilaporkan ke mana?",
    kataKunci: ["ktd sentinel lapor", "knkp"],
    jawaban: "Selain dilaporkan secara internal ke Komite Mutu Rumah Sakit, insiden berjenis KTD dan Sentinel (terutama yang berat) juga harus dilaporkan ke eksternal, yaitu kepada Komite Nasional Keselamatan Pasien (KNKP)."
  },
  {
    kategori: "alur-pelaporan",
    pertanyaan: "Siapa yang wajib melaporkan insiden?",
    kataKunci: ["siapa lapor", "wajib lapor siapa"],
    jawaban: "Setiap staf atau pegawai (termasuk perawat, dokter, farmasi, atau staf non-medis) yang pertama kali menemukan insiden atau terlibat langsung dalam insiden wajib membuat laporan awal."
  },

  // Kategori 3 — Grading Risiko & Bands
  {
    kategori: "grading-bands",
    pertanyaan: "Apa itu Bands risiko?",
    kataKunci: ["bands", "warna grading", "biru", "hijau", "kuning", "merah"],
    jawaban: "Bands risiko (Grading) adalah tingkat keparahan sebuah insiden berdasarkan matriks risiko. Warnanya terbagi empat: Biru (Rendah), Hijau (Sedang), Kuning (Tinggi), dan Merah (Sangat Tinggi/Ekstrim)."
  },
  {
    kategori: "grading-bands",
    pertanyaan: "Grading BIRU butuh investigasi apa?",
    kataKunci: ["biru", "investigasi sederhana biru"],
    jawaban: "Laporan dengan grading warna BIRU (risiko rendah) memerlukan Investigasi Sederhana yang dilakukan oleh Kepala Unit terkait, dan harus diselesaikan maksimal dalam 1 minggu."
  },
  {
    kategori: "grading-bands",
    pertanyaan: "Grading HIJAU butuh investigasi apa?",
    kataKunci: ["hijau", "investigasi sederhana hijau"],
    jawaban: "Laporan dengan grading warna HIJAU (risiko sedang) memerlukan Investigasi Sederhana yang dilakukan oleh Kepala Unit terkait, dan harus diselesaikan maksimal dalam 2 minggu."
  },
  {
    kategori: "grading-bands",
    pertanyaan: "Grading KUNING/MERAH butuh investigasi apa?",
    kataKunci: ["kuning", "merah", "kuning merah", "rca lengkap"],
    jawaban: "Laporan dengan grading warna KUNING (tinggi) dan MERAH (ekstrim) memerlukan Root Cause Analysis (RCA) secara komprehensif yang dilakukan oleh Tim RCA yang dibentuk khusus oleh Direktur/Komite Mutu."
  },
  {
    kategori: "grading-bands",
    pertanyaan: "Berapa lama waktu investigasi sederhana?",
    kataKunci: ["lama investigasi sederhana", "1 minggu", "2 minggu"],
    jawaban: "Waktu maksimal untuk investigasi sederhana adalah 1 minggu untuk grading Biru, dan 2 minggu untuk grading Hijau."
  },
  {
    kategori: "grading-bands",
    pertanyaan: "Berapa lama waktu RCA lengkap?",
    kataKunci: ["lama rca", "45 hari"],
    jawaban: "Waktu maksimal penyelesaian RCA (Root Cause Analysis) lengkap untuk grading Kuning dan Merah adalah 45 hari."
  },
  {
    kategori: "grading-bands",
    pertanyaan: "Bagaimana cara menghitung grading risiko?",
    kataKunci: ["cara hitung grading", "matriks risiko", "frekuensi dampak"],
    jawaban: "Grading Risiko dihitung menggunakan Matriks Risiko dengan rumus: Grading = Frekuensi (Probabilitas) x Dampak (Severity).\nFrekuensi memiliki 5 level mulai dari Jarang (1) sampai Sangat Sering (5).\nDampak juga memiliki 5 level mulai dari Insignificant (1) sampai Catastrophic (5).\nHasil pengalian keduanya akan masuk ke dalam salah satu Bands: Low/Biru, Moderate/Hijau, High/Kuning, atau Extreme/Merah."
  },

  // Kategori 4 — RCA (Root Cause Analysis)
  {
    kategori: "rca",
    pertanyaan: "Apa itu RCA?",
    kataKunci: ["rca", "root cause analysis"],
    jawaban: "RCA atau Root Cause Analysis adalah metode investigasi yang terstruktur dan mendalam untuk mencari akar penyebab (root cause) dari suatu insiden keselamatan pasien agar kejadian yang sama tidak terulang lagi. Ini wajib untuk grading Kuning dan Merah."
  },
  {
    kategori: "rca",
    pertanyaan: "Apa saja langkah-langkah RCA?",
    kataKunci: ["langkah rca", "tahapan rca"],
    jawaban: "Tahapan RCA umumnya meliputi:\n1. Pembentukan Tim\n2. Pengumpulan data & pemetaan kejadian (kronologi)\n3. Identifikasi masalah\n4. Analisis faktor kontributor & akar masalah (menggunakan 5-Why atau Fishbone)\n5. Menyusun rekomendasi dan rencana tindakan."
  },
  {
    kategori: "rca",
    pertanyaan: "Apa itu Fishbone diagram?",
    kataKunci: ["fishbone", "diagram tulang ikan"],
    jawaban: "Fishbone Diagram (Diagram Tulang Ikan / Ishikawa) adalah alat analisis di dalam RCA untuk memetakan faktor-faktor penyebab insiden dari berbagai sisi, misalnya: Manusia (staf), Peralatan, Prosedur/Metode, Lingkungan, dan Material."
  },
  {
    kategori: "rca",
    pertanyaan: "Apa itu 5-Why?",
    kataKunci: ["5 why", "lima why"],
    jawaban: "5-Why adalah teknik menggali akar masalah secara mendalam dengan cara bertanya 'Mengapa' (Why) secara beruntun (biasanya 5 kali) sampai menemukan akar penyebab dasar (root cause) yang jika diatasi dapat mencegah insiden terulang."
  },
  {
    kategori: "rca",
    pertanyaan: "Siapa yang jadi tim investigator RCA?",
    kataKunci: ["tim rca", "tim investigator"],
    jawaban: "Tim RCA adalah tim multidisiplin yang dibentuk khusus, biasanya dipimpin oleh perwakilan Komite Mutu, dan beranggotakan pakar terkait kasus (dokter/perawat spesialis) serta pihak independen yang tidak terlibat langsung pada insiden."
  },
  {
    kategori: "rca",
    pertanyaan: "Apa bedanya investigasi sederhana dan RCA lengkap?",
    kataKunci: ["beda investigasi", "sederhana vs lengkap"],
    jawaban: "Investigasi sederhana ditujukan untuk grading Biru/Hijau, dikerjakan oleh Kepala Unit, dan fokus mencari penyebab langsung. Sedangkan RCA lengkap untuk grading Kuning/Merah, melibatkan tim lintas disiplin, dan menganalisis sistem secara menyeluruh untuk mencari akar masalah paling mendasar."
  },

  // Kategori 5 — SKP (Sasaran Keselamatan Pasien) dsb (sebelumnya ada)
  {
    kategori: "skp",
    pertanyaan: "Apa itu SKP 1 / identifikasi pasien?",
    kataKunci: ["skp 1", "identifikasi pasien", "gelang"],
    jawaban: "SKP 1 adalah keharusan memastikan pasien diidentifikasi dengan benar sebelum diberikan obat, darah, atau tindakan. Cara yang paling standar adalah dengan mengecek minimal 2 identitas (Nama Lengkap dan Tanggal Lahir/No RM) dan mencocokkannya dengan gelang pasien."
  },
  {
    kategori: "skp",
    pertanyaan: "Warna gelang pasien apa saja artinya?",
    kataKunci: ["warna gelang", "pink", "biru", "kuning", "ungu", "merah"],
    jawaban: "Pink: Pasien Perempuan\nBiru: Pasien Laki-Laki\nKuning: Risiko Jatuh\nMerah: Alergi\nUngu: Do Not Resuscitate (DNR)"
  },
  {
    kategori: "skp",
    pertanyaan: "Apa itu SBAR?",
    kataKunci: ["sbar", "komunikasi efektif"],
    jawaban: "SBAR (Situation, Background, Assessment, Recommendation) adalah teknik komunikasi standar yang digunakan tenaga kesehatan saat melaporkan kondisi pasien kepada dokter untuk menghindari kesalahan informasi."
  },
  {
    kategori: "skp",
    pertanyaan: "Apa itu TBaK?",
    kataKunci: ["tbak", "tulis baca konfirmasi"],
    jawaban: "TBaK (Tulis, Baca kembali, Konfirmasi) adalah metode memastikan penerimaan instruksi lisan/via telepon. Penerima instruksi harus Menuliskan instruksi, Membacakan ulang, dan meminta Konfirmasi bahwa yang dicatat sudah benar."
  },
  {
    kategori: "skp",
    pertanyaan: "Berapa lama batas lapor hasil kritis lab?",
    kataKunci: ["hasil kritis", "30 menit"],
    jawaban: "Hasil laboratorium atau pemeriksaan penunjang yang sifatnya kritis/mengancam nyawa harus segera dilaporkan kepada dokter yang merawat selambat-lambatnya dalam waktu 30 menit setelah hasil diverifikasi."
  },
  {
    kategori: "skp",
    pertanyaan: "Apa itu obat High Alert?",
    kataKunci: ["high alert", "obat diwaspadai"],
    jawaban: "Obat High Alert adalah obat yang sangat berisiko tinggi menyebabkan bahaya signifikan pada pasien jika terjadi kesalahan penggunaan (contoh: insulin, heparin, kemoterapi, dan elektrolit konsentrat tinggi)."
  },
  {
    kategori: "skp",
    pertanyaan: "Apa itu LASA/NORUM?",
    kataKunci: ["lasa", "norum", "obat mirip"],
    jawaban: "LASA (Look Alike Sound Alike) atau NORUM (Nama Obat Rupa dan Ucapan Mirip) adalah obat-obatan yang nama, kemasan, atau bentuknya sangat mirip sehingga berisiko tertukar. Obat-obat ini harus diberi label khusus dan tidak boleh diletakkan berdampingan."
  },
  {
    kategori: "skp",
    pertanyaan: "Apa itu Surgical Safety Checklist?",
    kataKunci: ["surgical checklist", "sign in", "time out", "sign out"],
    jawaban: "Adalah prosedur standar dari WHO untuk memastikan keamanan operasi. Terdiri dari 3 tahap:\n1. Sign In (sebelum induksi anestesi)\n2. Time Out (sebelum sayatan kulit pertama)\n3. Sign Out (sebelum pasien keluar kamar operasi)"
  },
  {
    kategori: "skp",
    pertanyaan: "Apa itu skrining risiko jatuh?",
    kataKunci: ["risiko jatuh", "morse fall scale"],
    jawaban: "Skrining risiko jatuh adalah penilaian yang wajib dilakukan pada semua pasien untuk memprediksi seberapa besar kemungkinan pasien terjatuh. Menggunakan instrumen seperti Morse Fall Scale untuk dewasa atau Humpty Dumpty untuk anak."
  },
  {
    kategori: "skp",
    pertanyaan: "Warna gelang risiko jatuh apa?",
    kataKunci: ["gelang kuning", "risiko jatuh"],
    jawaban: "Pasien yang dinilai memiliki risiko jatuh sedang atau tinggi wajib dipasangkan gelang berwarna KUNING."
  },

  // Kategori Tambahan / Dasar Pengetahuan (Baru)
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa itu SP2KP?",
    kataKunci: ["sp2kp", "sistem pelaporan pembelajaran keselamatan pasien"],
    jawaban: "SP2KP (Sistem Pelaporan dan Pembelajaran Keselamatan Pasien) adalah nama resmi sistem pelaporan dan pembelajaran keselamatan pasien di Puskesmas, sesuai aturan Permenkes."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Apa dasar hukum SMART-ROSE / pelaporan insiden di Puskesmas?",
    kataKunci: ["dasar hukum", "regulasi", "permenkes akreditasi"],
    jawaban: "Dasar hukumnya mengacu pada KMK No. HK.01.07/MENKES/165/2023 tentang Standar Akreditasi Puskesmas, khususnya pada Standar 5.4 tentang pelaporan insiden keselamatan pasien dan pengembangan budaya keselamatan."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Kenapa banyak insiden tidak dilaporkan?",
    kataKunci: ["kenapa tidak lapor", "takut lapor", "alasan tidak lapor"],
    jawaban: "Terdapat 5 alasan utama mengapa banyak insiden tidak dilaporkan:\n1. Takut disalahkan atau dihukum oleh atasan.\n2. Merasa insiden terlalu kecil dan tidak penting.\n3. Menganggap proses pelaporan terlalu rumit dan memakan waktu.\n4. Budaya organisasi yang belum terbuka terhadap kesalahan.\n5. Staf tidak tahu bagaimana cara melapor dengan benar.\n\nNamun, sangat penting memegang filosofi 'From Reporting to Learning'. Setiap laporan, sekecil apa pun, bukanlah untuk mencari kesalahan (blame), melainkan kesempatan berharga untuk memperbaiki sistem dan mencegah celaka di kemudian hari."
  },
  {
    kategori: "definisi-insiden",
    pertanyaan: "Siapa saja pengguna aplikasi SMART-ROSE?",
    kataKunci: ["role pengguna", "user admin super admin", "pengguna aplikasi"],
    jawaban: "Terdapat tiga peran (role) utama di SMART-ROSE:\n1. User: Petugas/staf di unit yang melaporkan insiden keselamatan pasien.\n2. Admin: Staf dari unit mutu yang bertugas memverifikasi dan mengelola laporan insiden tersebut.\n3. Super Admin: Pengelola sistem secara menyeluruh yang mengelola aplikasi, role pengguna, sekaligus memberi umpan balik (feedback) atas pelaporan."
  },

  // Kategori 6 — FAQ Teknis Aplikasi
  {
    kategori: "faq-teknis",
    pertanyaan: "Bagaimana cara submit laporan insiden?",
    kataKunci: ["cara submit", "buat laporan"],
    jawaban: "Hanya role dengan akses tertentu (seperti Kepala Unit) yang bisa submit. Buka daftar laporan yang berstatus Draft, periksa kelengkapan data, lalu klik tombol 'Submit'."
  },
  {
    kategori: "faq-teknis",
    pertanyaan: "Bagaimana cara reset password?",
    kataKunci: ["lupa password", "reset password"],
    jawaban: "Klik tombol 'Lupa Password' di halaman Login. Masukkan email Anda. Sistem akan mengirimkan link untuk mengatur ulang password ke email tersebut."
  },
  {
    kategori: "faq-teknis",
    pertanyaan: "Bagaimana cara upload lampiran/foto bukti?",
    kataKunci: ["upload lampiran", "upload foto"],
    jawaban: "Di dalam form pengisian laporan, terdapat bagian 'Lampiran'. Anda bisa mengklik atau men-drag file/foto bukti kejadian ke kotak tersebut sebelum menyimpan laporan."
  },
  {
    kategori: "faq-teknis",
    pertanyaan: "Kenapa status laporan saya masih Draft?",
    kataKunci: ["status draft", "laporan belum submit"],
    jawaban: "Status Draft berarti laporan baru disimpan tapi belum dikirim. Laporan hanya akan masuk ke Komite Mutu jika Anda atau Kepala Unit Anda menekan tombol Submit."
  },
  {
    kategori: "faq-teknis",
    pertanyaan: "Apa arti status OVERDUE?",
    kataKunci: ["overdue", "terlambat"],
    jawaban: "Status OVERDUE (Terlambat) menandakan bahwa proses investigasi (baik sederhana maupun RCA) telah melewati batas waktu SLA yang telah ditentukan (misal lebih dari 7 hari untuk Biru)."
  },
  {
    kategori: "faq-teknis",
    pertanyaan: "Bagaimana cara cek status laporan saya?",
    kataKunci: ["cek status", "lacak laporan"],
    jawaban: "Buka menu 'Laporan Saya' di navigasi. Di sana akan terlihat semua laporan yang Anda buat beserta statusnya (Draft, Terkirim, Sedang Diinvestigasi, atau Selesai)."
  },

  // Kategori 7 — Panduan Penggunaan Aplikasi
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara pertama kali login ke SMART-ROSE?",
    kataKunci: ["cara login pertama", "login awal"],
    jawaban: "Buka halaman awal web SMART-ROSE. Masukkan email dan password yang telah diberikan oleh admin rumah sakit. Kemudian klik tombol Login."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Saya belum punya akun, bagaimana cara daftar?",
    kataKunci: ["belum punya akun", "cara daftar"],
    jawaban: "Pendaftaran akun baru dilakukan oleh Admin atau tim IT rumah sakit Anda. Silakan hubungi atasan Anda atau admin sistem untuk meminta dibuatkan akun pengguna baru."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara kerja kode OTP saat login?",
    kataKunci: ["kode otp", "kode verifikasi login"],
    jawaban: "Jika fitur keamanan OTP diaktifkan, setelah memasukkan email dan password yang benar, aplikasi akan mengirimkan 6 angka (kode OTP) ke email Anda. Buka email Anda, catat angka tersebut, lalu masukkan ke kolom yang tersedia di layar."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Kenapa kode OTP saya tidak masuk ke email?",
    kataKunci: ["otp tidak masuk", "kode tidak datang"],
    jawaban: "1. Pastikan Anda mengetik email dengan benar.\n2. Cek folder Spam atau Junk di kotak masuk email Anda.\n3. Tunggu sekitar 1-2 menit.\nJika masih belum masuk, klik tombol 'Kirim Ulang OTP' di layar."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Setelah login, saya harus ke menu mana untuk lapor insiden?",
    kataKunci: ["menu lapor", "mulai lapor insiden"],
    jawaban: "Setelah login, klik tombol navigasi 'Buat Laporan Baru' atau pilih menu 'Laporan Insiden' lalu klik tombol '+ Tambah Laporan'."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Apa saja yang harus saya isi saat membuat laporan insiden baru?",
    kataKunci: ["isi laporan", "form laporan insiden"],
    jawaban: "Anda perlu mengisi data pasien, kronologi kejadian secara rinci, waktu kejadian, jenis insiden (KNC/KTC/KTD/Sentinel), dan tindakan pertama yang langsung Anda lakukan. Anda juga bisa melampirkan foto bukti."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara menyimpan laporan tanpa langsung mengirim (draft)?",
    kataKunci: ["simpan draft", "belum kirim laporan"],
    jawaban: "Setelah mengisi form laporan, cukup klik tombol 'Simpan'. Laporan Anda akan tersimpan dengan status 'Draft' dan bisa Anda lanjutkan atau edit kembali nanti."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara mengirim/submit laporan yang sudah saya buat?",
    kataKunci: ["submit laporan", "kirim laporan final"],
    jawaban: "Buka laporan Anda yang masih berstatus 'Draft'. Di bagian paling bawah (atau atas), akan ada tombol 'Kirim' atau 'Submit'. Klik tombol tersebut. Catatan: Laporan yang sudah dikirim tidak bisa diedit kembali oleh pelapor."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Setelah laporan dikirim, apa yang terjadi selanjutnya?",
    kataKunci: ["setelah submit", "proses selanjutnya"],
    jawaban: "Laporan akan diterima oleh Kepala Unit dan Komite Mutu. Mereka akan menilai grading (warna risiko) insiden tersebut dan menentukan apakah butuh Investigasi Sederhana atau RCA. Anda dapat melacak status progresnya di aplikasi."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara melihat riwayat laporan yang pernah saya buat?",
    kataKunci: ["riwayat laporan", "laporan saya"],
    jawaban: "Klik menu 'Laporan Saya' atau 'Riwayat'. Di sana Anda akan melihat daftar semua laporan yang pernah Anda buat beserta status terakhirnya."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara mengedit laporan yang sudah terlanjur dikirim?",
    kataKunci: ["edit laporan terkirim", "ubah laporan"],
    jawaban: "Secara aturan keamanan data, laporan yang sudah berstatus Terkirim tidak bisa diubah langsung oleh pelapor. Jika ada data krusial yang salah, silakan segera hubungi Kepala Unit Anda atau Admin sistem untuk mengembalikannya ke status Draft."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Saya admin, bagaimana cara melihat semua laporan dari semua unit?",
    kataKunci: ["admin lihat semua laporan", "dashboard admin", "admin liat semua data"],
    jawaban: "Gunakan menu 'Semua Laporan' di menu samping. Anda akan melihat daftar laporan dari seluruh unit. Anda juga bisa menggunakan fitur filter (cari berdasarkan tanggal, unit, atau warna grading)."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara admin mengubah status sebuah laporan?",
    kataKunci: ["ubah status laporan", "admin update status"],
    jawaban: "Buka detail dari suatu laporan. Sebagai admin/verifikator, Anda akan melihat pilihan untuk memperbarui status (misal dari 'Sedang Diinvestigasi' menjadi 'Selesai'). Pilih status baru, lalu simpan perubahan."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara mengisi RCA untuk laporan grading kuning/merah?",
    kataKunci: ["isi rca", "cara mengisi rca"],
    jawaban: "Jika Anda adalah anggota Tim RCA, buka laporan berstatus Kuning/Merah. Anda akan melihat tab (menu tambahan) bernama 'Form RCA'. Masuk ke halaman tersebut untuk mengisi tahap-tahap analisis akar masalah."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara menambahkan anggota tim investigasi RCA?",
    kataKunci: ["tambah tim rca", "anggota investigasi"],
    jawaban: "Admin atau Ketua Tim dapat membuka halaman detail laporan, masuk ke tab 'Tim RCA', lalu klik tombol 'Tambah Anggota' dan pilih nama staf dari daftar pengguna sistem."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara mengunduh/export laporan jadi PDF?",
    kataKunci: ["export pdf", "unduh laporan"],
    jawaban: "Buka detail laporan yang ingin Anda unduh. Di sudut atas biasanya terdapat tombol 'Unduh' atau 'Export'. Pilih format PDF. Dokumen laporan akan langsung tersimpan di komputer/HP Anda."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara mengunduh laporan jadi Excel?",
    kataKunci: ["export excel", "unduh excel"],
    jawaban: "Di halaman daftar 'Semua Laporan', Anda dapat memfilter laporan sesuai kriteria yang diinginkan. Lalu klik tombol 'Export Data' dan pilih format Excel (.xlsx) untuk mengunduh rekapitulasi data laporan."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara melihat notifikasi di aplikasi?",
    kataKunci: ["lihat notifikasi", "cek notifikasi"],
    jawaban: "Klik ikon lonceng yang ada di bagian kanan atas layar aplikasi. Daftar pemberitahuan baru (seperti laporan ditugaskan kepada Anda atau batas waktu hampir habis) akan muncul di situ."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara mengubah foto profil saya?",
    kataKunci: ["ubah foto profil", "upload foto profil"],
    jawaban: "Klik nama atau ikon profil Anda di sudut kanan atas, pilih menu 'Pengaturan Akun' atau 'Profil Saya'. Dari sana, klik pada foto lama Anda untuk mengunggah foto baru dari galeri/komputer."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Bagaimana cara logout dari aplikasi?",
    kataKunci: ["cara logout", "keluar aplikasi"],
    jawaban: "Klik ikon profil Anda di kanan atas layar, lalu pilih opsi 'Logout' atau 'Keluar' pada menu yang muncul."
  },
  {
    kategori: "panduan-aplikasi",
    pertanyaan: "Apa itu Audit Log dan siapa yang bisa melihatnya?",
    kataKunci: ["audit log", "riwayat aktivitas"],
    jawaban: "Audit Log adalah catatan riwayat aktivitas di sistem, mencatat siapa yang mengubah, menghapus, atau melihat suatu laporan dan kapan aktivitas itu dilakukan. Fitur ini umumnya hanya bisa dilihat oleh pengguna dengan peran Admin (Superuser)."
  },

  // Kategori 8 — Troubleshooting
  {
    kategori: "troubleshooting",
    pertanyaan: "Saya sudah submit tapi laporan tidak muncul di daftar, kenapa?",
    kataKunci: ["laporan tidak muncul", "submit tapi hilang"],
    jawaban: "Kemungkinan layar Anda belum diperbarui (refresh) atau ada masalah saat memuat data. Coba muat ulang halaman (tekan F5). Jika laporan masih tidak ada, cek kembali apakah Anda menggunakan akun yang benar dan cek menu 'Laporan Saya'."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Halaman jadi putih kosong / blank, harus bagaimana?",
    kataKunci: ["halaman putih", "halaman kosong blank", "halaman saya blank", "layar putih kosong", "aplikasi blank", "tampilan kosong"],
    jawaban: "Ini biasa terjadi jika jaringan terputus tiba-tiba atau cache peramban (browser) penuh. Coba tutup aplikasi, pastikan koneksi internet stabil, lalu buka ulang browser Anda. Jika menggunakan komputer, coba hapus cache (Ctrl+Shift+Delete) lalu akses ulang."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Saya login lalu ke-logout sendiri, kenapa?",
    kataKunci: ["logout sendiri", "ke-logout otomatis"],
    jawaban: "Sistem memiliki fitur keamanan otomatis yang akan mengeluarkan Anda (logout) jika tidak ada aktivitas selama beberapa waktu. Anda cukup melakukan login kembali untuk melanjutkan pekerjaan."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Loading lama sekali saat buka aplikasi, apa yang harus saya lakukan?",
    kataKunci: ["loading lama", "lemot"],
    jawaban: "Loading lama biasanya disebabkan oleh koneksi internet yang lemah di area Anda. Coba gunakan jaringan Wi-Fi rumah sakit yang lebih stabil. Anda juga bisa mencoba refresh halaman (memuat ulang) beberapa kali."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Tombol Kirim/Submit tidak bisa diklik, kenapa?",
    kataKunci: ["tombol tidak bisa diklik", "tombol disabled"],
    jawaban: "Pastikan Anda sudah mengisi semua kolom/isian yang bertanda wajib (biasanya ada tanda bintang merah). Tombol Submit tidak akan aktif jika masih ada data penting (seperti waktu, unit kejadian, atau kronologi) yang masih kosong."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "File PDF yang saya unduh isinya kosong/rusak, apa penyebabnya?",
    kataKunci: ["pdf kosong", "pdf rusak"],
    jawaban: "Proses unduhan mungkin terputus sebelum selesai, atau perangkat Anda tidak memiliki aplikasi pembaca PDF yang sesuai. Coba unduh ulang dokumen tersebut dengan koneksi yang stabil, lalu buka menggunakan aplikasi seperti Adobe Acrobat atau langsung via browser (Chrome/Edge)."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Saya lupa password dan tidak bisa reset, harus bagaimana?",
    kataKunci: ["lupa password tidak bisa reset", "stuck reset password"],
    jawaban: "Jika Anda sudah meminta reset password namun email tidak kunjung masuk, atau link error saat diklik, segera hubungi Admin Sistem/Tim IT rumah sakit untuk meminta diresetkan password secara manual."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Saya dapat pesan error saat submit laporan, apa yang harus saya lakukan?",
    kataKunci: ["pesan error", "gagal submit"],
    jawaban: "Catat atau foto (screenshot) pesan error berwarna merah yang muncul di layar. Coba logout dan login kembali, lalu ulangi. Jika error masih terjadi, kirimkan foto error tersebut ke Admin IT."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Kenapa saya tidak bisa membuka halaman RCA untuk laporan saya?",
    kataKunci: ["tidak bisa buka rca", "halaman rca kosong"],
    jawaban: "Halaman form RCA hanya bisa diakses jika Anda ditambahkan secara resmi sebagai Anggota Tim Investigasi oleh atasan. Hubungi Ketua Tim RCA atau Admin untuk memastikan nama Anda sudah terdaftar di tim laporan tersebut."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Aplikasi minta saya login ulang terus-menerus, kenapa?",
    kataKunci: ["login ulang terus", "minta login lagi"],
    jawaban: "Ini mungkin karena ada masalah dengan 'Cookie' di browser Anda yang tidak tersimpan dengan benar. Coba bersihkan (clear) cache dan cookie browser, gunakan tab Incognito (Private window), atau gunakan browser lain."
  },
  {
    kategori: "troubleshooting",
    pertanyaan: "Siapa yang harus saya hubungi kalau masalah tidak juga selesai?",
    kataKunci: ["hubungi siapa", "kontak bantuan"],
    jawaban: "Jangan khawatir. Anda dapat menghubungi Tim IT Helpdesk Rumah Sakit atau Staf Komite Mutu terdekat yang bertanggung jawab atas pengelolaan sistem SMART-ROSE untuk mendapatkan bantuan lebih lanjut."
  }
];

async function main() {
  let countUpserted = 0;
  for (const item of chatbotData) {
    const existing = await prisma.chatbotKnowledge.findFirst({
      where: {
        pertanyaan: item.pertanyaan
      }
    });

    if (existing) {
      await prisma.chatbotKnowledge.update({
        where: { id: existing.id },
        data: {
          kategori: item.kategori,
          kataKunci: item.kataKunci,
          jawaban: item.jawaban
        }
      });
    } else {
      await prisma.chatbotKnowledge.create({
        data: item
      });
    }
    countUpserted++;
  }
  
  console.log(`Berhasil memproses (upsert) ${countUpserted} baris data chatbot FAQ.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
