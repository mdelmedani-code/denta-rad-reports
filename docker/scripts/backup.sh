#!/bin/bash

set -e

BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "🔄 Starting backup process..."
echo "Backup directory: $BACKUP_DIR"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
echo "📊 Backing up PostgreSQL database..."
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB | gzip > $BACKUP_DIR/orthanc-db.sql.gz

if [ $? -eq 0 ]; then
    echo "✅ Database backup completed"
else
    echo "❌ Database backup failed"
    exit 1
fi

# Backup Orthanc DICOM storage
echo "💾 Backing up DICOM storage..."
tar -czf $BACKUP_DIR/dicom-storage.tar.gz -C /data orthanc/

if [ $? -eq 0 ]; then
    echo "✅ DICOM storage backup completed"
else
    echo "❌ DICOM storage backup failed"
    exit 1
fi

# Create backup manifest
echo "📋 Creating backup manifest..."
cat > $BACKUP_DIR/manifest.json << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "database_file": "orthanc-db.sql.gz",
  "storage_file": "dicom-storage.tar.gz",
  "database_size": "$(stat -f%z $BACKUP_DIR/orthanc-db.sql.gz 2>/dev/null || stat -c%s $BACKUP_DIR/orthanc-db.sql.gz)",
  "storage_size": "$(stat -f%z $BACKUP_DIR/dicom-storage.tar.gz 2>/dev/null || stat -c%s $BACKUP_DIR/dicom-storage.tar.gz)",
  "orthanc_version": "$(curl -s http://orthanc:8042/system | grep -o '"Version":"[^"]*' | cut -d'"' -f4)",
  "postgresql_version": "$(psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -t -c 'SELECT version();' | head -1 | xargs)"
}
EOF

# Calculate backup size
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo "📦 Backup size: $BACKUP_SIZE"

# Clean up old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find /backup -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

# Optional: Upload to S3 (if configured)
if [ ! -z "$BACKUP_S3_BUCKET" ]; then
    echo "☁️  Uploading backup to S3..."
    if command -v aws &> /dev/null; then
        aws s3 sync $BACKUP_DIR s3://$BACKUP_S3_BUCKET/orthanc-backups/$(basename $BACKUP_DIR)/
        echo "✅ S3 upload completed"
    else
        echo "⚠️  AWS CLI not found, skipping S3 upload"
    fi
fi

echo "✅ Backup process completed successfully"
echo "📁 Backup location: $BACKUP_DIR"

# Log backup completion
echo "$(date): Backup completed - Size: $BACKUP_SIZE" >> /backup/backup.log