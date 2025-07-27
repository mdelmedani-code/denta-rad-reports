# DentaRad Orthanc PACS Server - Docker Deployment

This Docker Compose setup provides a complete, production-ready PACS system with:
- **Orthanc DICOM Server** with DICOMweb plugin
- **PostgreSQL Database** for metadata storage
- **Nginx Reverse Proxy** with SSL termination
- **Let's Encrypt SSL** certificates
- **Automated Backups** with retention
- **Security hardening** and monitoring

## 🚀 Quick Start

### Prerequisites
- **VPS/Server** with Ubuntu 22.04 LTS (2GB+ RAM, 50GB+ storage)
- **Domain name** pointed to your server's IP
- **Docker** and **Docker Compose** installed

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Logout and login again for group changes
exit
```

### 2. Deploy Orthanc

```bash
# Clone or create directory
mkdir dentarad-pacs && cd dentarad-pacs

# Copy all Docker files from this directory to your server
# (Upload via SCP, SFTP, or git clone)

# Make setup script executable
chmod +x scripts/setup.sh

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Run automated setup
./scripts/setup.sh
```

### 3. Configuration

Edit `.env` with your settings:

```bash
# Your domain name
DOMAIN_NAME=pacs.yourdomain.com

# Your email for SSL certificates
SSL_EMAIL=admin@yourdomain.com

# Secure passwords (generate strong passwords!)
POSTGRES_PASSWORD=your_very_secure_postgres_password
ORTHANC_PASSWORD=your_very_secure_orthanc_password
```

## 🔧 Management

### Daily Operations

```bash
# View logs
docker-compose logs -f orthanc
docker-compose logs -f postgres
docker-compose logs -f nginx

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Update services
docker-compose pull
docker-compose up -d
```

### Backup & Restore

```bash
# Manual backup
docker-compose exec backup /backup.sh

# Restore from backup
# 1. Stop services
docker-compose down

# 2. Restore database
gunzip -c /path/to/backup/orthanc-db.sql.gz | docker-compose exec -T postgres psql -U orthanc -d orthanc

# 3. Restore DICOM files
tar -xzf /path/to/backup/dicom-storage.tar.gz -C ./volumes/

# 4. Start services
docker-compose up -d
```

### SSL Certificate Renewal

```bash
# Manual renewal
./scripts/renew-ssl.sh

# Automatic renewal (add to crontab)
crontab -e
# Add: 0 0 1 */2 * /path/to/dentarad-pacs/scripts/renew-ssl.sh
```

## 🔒 Security Features

### Built-in Security
- **HTTPS only** with strong SSL configuration
- **Rate limiting** on API endpoints
- **CORS protection** for web access
- **Security headers** (HSTS, CSP, etc.)
- **User authentication** with role-based access
- **Audit logging** for all DICOM operations

### User Management

Default users:
- `admin` - Full administrative access
- `viewer` - Read-only access for viewing
- `uploader` - Upload permissions for case submission

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📊 Monitoring

### Health Checks

```bash
# Check service status
docker-compose ps

# Test endpoints
curl -k https://your-domain.com/system
curl -k https://your-domain.com/dicom-web/studies

# Check database
docker-compose exec postgres psql -U orthanc -d orthanc -c "\dt"
```

### Performance Monitoring

```bash
# Resource usage
docker stats

# Disk usage
docker system df
docker-compose exec orthanc du -sh /var/lib/orthanc/db

# Database stats
docker-compose exec postgres psql -U orthanc -d orthanc -c "
  SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del 
  FROM pg_stat_user_tables;"
```

## 🔗 Integration

### DICOMweb Endpoints

Once deployed, your endpoints will be:
- **WADO-RS**: `https://pacs.yourdomain.com/dicom-web/wado`
- **QIDO-RS**: `https://pacs.yourdomain.com/dicom-web/qido`
- **STOW-RS**: `https://pacs.yourdomain.com/dicom-web/stow`

### Frontend Configuration

Update your DentaRad frontend configuration:

```typescript
// In src/config/pacs.ts
production: {
  dicomweb: {
    wadoRs: 'https://pacs.yourdomain.com/dicom-web/wado',
    qidoRs: 'https://pacs.yourdomain.com/dicom-web/qido',
    stowRs: 'https://pacs.yourdomain.com/dicom-web/stow'
  },
  auth: {
    type: 'orthanc',
    headers: {
      'Authorization': 'Basic ' + btoa('viewer:your_password')
    }
  }
}
```

## 📋 Troubleshooting

### Common Issues

1. **SSL Certificate Fails**
   ```bash
   # Check domain DNS
   dig pacs.yourdomain.com
   
   # Verify port 80 access
   curl -I http://pacs.yourdomain.com/.well-known/acme-challenge/test
   ```

2. **Orthanc Won't Start**
   ```bash
   # Check logs
   docker-compose logs orthanc
   
   # Verify configuration
   docker-compose exec orthanc cat /etc/orthanc/orthanc.json
   ```

3. **Database Connection Issues**
   ```bash
   # Test database
   docker-compose exec postgres psql -U orthanc -d orthanc -c "SELECT version();"
   ```

4. **Upload Failures**
   ```bash
   # Check disk space
   df -h
   
   # Verify permissions
   docker-compose exec orthanc ls -la /var/lib/orthanc/db
   ```

### Log Locations

- **Orthanc**: `docker-compose logs orthanc`
- **PostgreSQL**: `docker-compose logs postgres`
- **Nginx**: `docker-compose logs nginx`
- **Backup**: `./volumes/backup/backup.log`

## 🆘 Support

### Configuration Files

- `orthanc-config/orthanc.json` - Orthanc main configuration
- `nginx/nginx.conf` - Web server and SSL configuration
- `.env` - Environment variables and secrets
- `docker-compose.yml` - Service orchestration

### Maintenance Schedule

**Daily**: Automated backups
**Weekly**: Log rotation and cleanup
**Monthly**: SSL certificate check
**Quarterly**: Security updates and dependency updates

This setup provides enterprise-grade DICOM storage and viewing capabilities for your DentaRad platform with professional security and reliability.