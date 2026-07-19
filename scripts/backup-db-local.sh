#!/bin/bash
# Script untuk backup database PostgreSQL lokal ke format gzip menggunakan docker exec dan pg_dump.

set -e

# Cek apakah docker berjalan
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker tidak berjalan atau tidak bisa diakses."
    exit 1
fi

CONTAINER_NAME="smartrose-postgres-dev"
DB_USER="smartrose"
DB_NAME="smartrose_dev"

# Setup directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKUP_DIR="${SCRIPT_DIR}/../backups/db"

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "📁 Dibuat folder $BACKUP_DIR"
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/smartrose_${TIMESTAMP}.sql.gz"

echo "⏳ Mulai backup database $DB_NAME dari container $CONTAINER_NAME..."

# Execute pg_dump and gzip
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -F p "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    echo "✅ Backup berhasil! Disimpan di:"
    echo "   $BACKUP_FILE"
    
    # Hitung ukuran file (kompatibel Mac/Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        FILE_SIZE=$(stat -f%z "$BACKUP_FILE")
    else
        FILE_SIZE=$(stat -c%s "$BACKUP_FILE")
    fi
    FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc -q 2>/dev/null || echo "N/A")
    echo "📊 Ukuran file: $FILE_SIZE_MB MB"
else
    echo "❌ Terjadi kesalahan saat melakukan backup."
    rm -f "$BACKUP_FILE"
    exit 1
fi
