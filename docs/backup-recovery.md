# Panduan Backup & Recovery Database SMART-ROSE

Dokumen ini menjelaskan prosedur manual untuk melakukan backup dan pemulihan (recovery) database PostgreSQL lokal yang berjalan di dalam Docker container.

## 1. Proses Backup

Kami menyediakan dua script untuk memudahkan proses backup:

### Untuk Pengguna Windows (PowerShell)
Gunakan script `backup-db-local.ps1` jika Anda menggunakan native PowerShell.
```powershell
.\scripts\backup-db-local.ps1
```

### Untuk Pengguna Linux / Mac / WSL
Gunakan script `backup-db-local.sh`. Pastikan file ini memiliki izin eksekusi (`chmod +x scripts/backup-db-local.sh`).
```bash
./scripts/backup-db-local.sh
```

**Catatan:**
- Script akan membuat file backup di folder `backups/db/`.
- File akan disimpan dalam format terkompresi `smartrose_YYYY-MM-DD_HH-mm-ss.sql.gz`.

## 2. Proses Recovery (Pemulihan)

Jika Anda perlu merestore database dari file backup (misalnya `smartrose_2023-10-25_14-30-00.sql.gz`), ikuti langkah-langkah berikut.

**Perhatian:** Pastikan tidak ada koneksi aktif yang mengubah data selama proses restore untuk menghindari konflik.

### Langkah-langkah (Cross-Platform)

1. Buka terminal (Bash atau PowerShell).
2. Ekstrak file dan jalankan perintah restore ke dalam container Docker. Anda dapat melakukannya dalam satu perintah:

**PowerShell:**
```powershell
# Extract file .gz dan pipe ke psql di dalam docker container
gunzip -c .\backups\db\nama_file_backup.sql.gz | docker exec -i smartrose-postgres-dev psql -U smartrose -d smartrose_dev
```
*(Catatan: Anda mungkin memerlukan tools pihak ketiga atau Git Bash jika `gunzip` tidak tersedia secara default di PowerShell Windows Anda, atau gunakan aplikasi seperti 7-Zip untuk mengekstrak `.sql` lalu gunakan `Get-Content nama_file.sql | docker exec ...`)*

**Bash (Linux / Mac / WSL):**
```bash
gunzip -c ./backups/db/nama_file_backup.sql.gz | docker exec -i smartrose-postgres-dev psql -U smartrose -d smartrose_dev
```

### Reset Database Secara Penuh (Opsional)
Jika Anda ingin menghapus semua data sebelum restore:
```bash
# Menjatuhkan semua skema (hati-hati!)
docker exec -it smartrose-postgres-dev psql -U smartrose -d smartrose_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```
Lalu jalankan langkah restore di atas.

## 3. Catatan Penting
- Folder `backups/db` diabaikan oleh Git (`.gitignore`).
- Pastikan Docker container `smartrose-postgres-dev` dalam keadaan berjalan ("healthy") saat melakukan proses backup atau restore.
- Kredensial default yang digunakan adalah user: `smartrose` dan database: `smartrose_dev`.
