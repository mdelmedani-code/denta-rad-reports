# Orthanc + OHIF PACS Deployment Guide

## 🏗️ Infrastructure Setup

### 1. Server Requirements
- **OS**: Ubuntu 22.04 LTS (recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100GB+ for DICOM storage
- **Location**: UK/EU for GDPR compliance

### 2. Orthanc Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Orthanc
sudo apt install orthanc orthanc-dicomweb orthanc-postgresql -y

# Install PostgreSQL for metadata storage
sudo apt install postgresql postgresql-contrib -y
```

### 3. PostgreSQL Configuration

```bash
# Create Orthanc database
sudo -u postgres createdb orthanc
sudo -u postgres createuser orthanc
sudo -u postgres psql -c "ALTER USER orthanc PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE orthanc TO orthanc;"
```

### 4. Orthanc Configuration (`/etc/orthanc/orthanc.json`)

```json
{
  "Name": "DentaRad PACS",
  "HttpPort": 8042,
  "DicomPort": 4242,
  "HttpsPort": 8043,
  "HttpsCertificate": "/etc/ssl/certs/orthanc.crt",
  "HttpsPrivateKey": "/etc/ssl/private/orthanc.key",
  
  "RemoteAccessAllowed": true,
  "AuthenticationEnabled": true,
  "RegisteredUsers": {
    "admin": "secure_admin_password",
    "viewer": "secure_viewer_password"
  },
  
  "PostgreSQL": {
    "EnableIndex": true,
    "EnableStorage": false,
    "Host": "localhost",
    "Port": 5432,
    "Database": "orthanc",
    "Username": "orthanc",
    "Password": "your_secure_password"
  },
  
  "Plugins": [
    "/usr/share/orthanc/plugins",
    "/usr/share/orthanc/plugins/libOrthancDicomWeb.so"
  ],
  
  "DicomWeb": {
    "Enable": true,
    "Root": "/dicom-web/",
    "EnableWado": true,
    "EnableQido": true,
    "EnableStow": true,
    "StudiesMetadata": "MainDicomTags",
    "SeriesMetadata": "Full"
  },
  
  "CorsEnabled": true,
  "CorsOrigins": [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  
  "StorageDirectory": "/var/lib/orthanc/db",
  "IndexDirectory": "/var/lib/orthanc/db",
  "StorageCompression": true,
  "MaximumStorageSize": 100000,
  "MaximumPatientCount": 10000
}
```

### 5. SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo apt install certbot -y
sudo certbot certonly --standalone -d pacs.yourdomain.com

# Copy certificates for Orthanc
sudo cp /etc/letsencrypt/live/pacs.yourdomain.com/fullchain.pem /etc/ssl/certs/orthanc.crt
sudo cp /etc/letsencrypt/live/pacs.yourdomain.com/privkey.pem /etc/ssl/private/orthanc.key
sudo chown orthanc:orthanc /etc/ssl/certs/orthanc.crt /etc/ssl/private/orthanc.key
```

### 6. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/orthanc
server {
    listen 80;
    listen [::]:80;
    server_name pacs.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pacs.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/pacs.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pacs.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # CORS for OHIF
    add_header Access-Control-Allow-Origin "https://yourdomain.com";
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept";

    # Orthanc proxy
    location / {
        proxy_pass http://localhost:8042;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        client_max_body_size 500M;
    }
}
```

## 🔐 Security Configuration

### 1. Firewall Setup
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 2. User Authentication
- Create separate users for different access levels
- Use strong passwords or API keys
- Consider integrating with your existing auth system

### 3. Audit Logging
```json
{
  "VerboseEnabled": true,
  "TraceEnabled": false,
  "LogDirectory": "/var/log/orthanc",
  "LogFile": "orthanc.log",
  "HttpRequestTimeout": 60
}
```

## 📊 Monitoring & Backup

### 1. System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Create backup script
sudo tee /usr/local/bin/orthanc-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/orthanc/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -h localhost -U orthanc orthanc | gzip > $BACKUP_DIR/orthanc-db.sql.gz

# Backup DICOM storage
tar -czf $BACKUP_DIR/dicom-storage.tar.gz /var/lib/orthanc/db

# Upload to cloud storage (configure your provider)
# aws s3 sync $BACKUP_DIR s3://your-backup-bucket/orthanc/
EOF

sudo chmod +x /usr/local/bin/orthanc-backup.sh
```

### 2. Cron Jobs
```bash
# Daily backup at 2 AM
echo "0 2 * * * /usr/local/bin/orthanc-backup.sh" | sudo crontab -
```

## 🔗 Integration with DentaRad

### 1. Update Frontend Configuration
Update the production PACS config in your app:

```typescript
production: {
  dicomweb: {
    wadoRs: 'https://pacs.yourdomain.com/dicom-web/wado',
    qidoRs: 'https://pacs.yourdomain.com/dicom-web/qido',
    stowRs: 'https://pacs.yourdomain.com/dicom-web/stow'
  },
  auth: {
    type: 'orthanc',
    headers: {
      'Authorization': 'Basic ' + btoa('viewer:secure_viewer_password')
    }
  }
}
```

### 2. Upload Workflow
- Modify case upload to use Orthanc STOW-RS
- Store StudyInstanceUID in your database
- Link cases to Orthanc studies

### 3. Viewer Integration
- Generate OHIF URLs with StudyInstanceUID
- Pass authentication tokens securely
- Handle viewer permissions based on user roles

## 🚀 Deployment Checklist

- [ ] Server provisioned with adequate resources
- [ ] PostgreSQL installed and configured
- [ ] Orthanc installed with DICOMweb plugin
- [ ] SSL certificates configured
- [ ] Nginx reverse proxy set up
- [ ] Firewall configured
- [ ] User authentication enabled
- [ ] Backup system implemented
- [ ] Monitoring configured
- [ ] Frontend configuration updated
- [ ] Upload workflow tested
- [ ] Viewer integration tested
- [ ] GDPR compliance verified

## 📋 Testing Commands

```bash
# Test Orthanc API
curl -u admin:password https://pacs.yourdomain.com/system

# Test DICOMweb endpoints
curl -u viewer:password https://pacs.yourdomain.com/dicom-web/studies

# Upload test DICOM
curl -X POST -u viewer:password \
  -H "Content-Type: multipart/related" \
  -F "file=@test.dcm" \
  https://pacs.yourdomain.com/dicom-web/stow/studies

# Query studies
curl -u viewer:password \
  https://pacs.yourdomain.com/dicom-web/qido/studies
```

This setup provides a production-ready PACS system that integrates seamlessly with your DentaRad platform while maintaining GDPR compliance and professional-grade security.