<#
.SYNOPSIS
Script untuk backup database PostgreSQL lokal ke format gzip menggunakan docker exec dan pg_dump.

.DESCRIPTION
Script ini membuat backup dari container smartrose-postgres-dev dan menyimpannya 
ke dalam folder backups/db/ dengan format nama timestamp.

.EXAMPLE
.\scripts\backup-db-local.ps1
#>

$ErrorActionPreference = 'Stop'

# Cek apakah docker berjalan
try {
    $null = docker info
} catch {
    Write-Error "Docker tidak berjalan atau tidak bisa diakses. Pastikan Docker Desktop sudah aktif."
    exit 1
}

# Variabel konfigurasi
$CONTAINER_NAME = "smartrose-postgres-dev"
$DB_USER = "smartrose"
$DB_NAME = "smartrose_dev"

# Buat folder backup kalau belum ada
$BACKUP_DIR = Join-Path -Path $PSScriptRoot -ChildPath "..\backups\db"
if (-not (Test-Path -Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null
    Write-Host "Dibuat folder $BACKUP_DIR" -ForegroundColor Cyan
}

# Timestamp format YYYY-MM-DD_HH-mm-ss
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BACKUP_FILE = Join-Path -Path $BACKUP_DIR -ChildPath "smartrose_$TIMESTAMP.sql.gz"

Write-Host "Mulai backup database $DB_NAME dari container $CONTAINER_NAME..." -ForegroundColor Yellow

try {
    # Jalankan pg_dump di dalam container, kompres pakai gzip, simpan ke lokal
    # Tanda > untuk redirect output stdout ke file
    docker exec $CONTAINER_NAME pg_dump -U $DB_USER -F p $DB_NAME | gzip > $BACKUP_FILE

    Write-Host "Backup berhasil! Disimpan di:" -ForegroundColor Green
    Write-Host $BACKUP_FILE -ForegroundColor Green
    
    # Hitung ukuran file
    $FILE_SIZE = (Get-Item $BACKUP_FILE).Length
    $FILE_SIZE_MB = [math]::Round($FILE_SIZE / 1MB, 2)
    Write-Host "Ukuran file: $FILE_SIZE_MB MB" -ForegroundColor Cyan

} catch {
    Write-Error "Terjadi kesalahan saat melakukan backup: $_"
    exit 1
}
