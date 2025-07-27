#!/bin/bash

# Create the directory structure
mkdir -p dentarad-pacs/{docker/{scripts,orthanc-config,nginx,init-db.sql},volumes/{postgres,orthanc,ssl,logs,backup}}

cd dentarad-pacs

# Create .env.example
cat > .env.example << 'EOF'
# Database Configuration
POSTGRES_PASSWORD=your_secure_postgres_password_here

# Orthanc Authentication
ORTHANC_USERNAME=admin
ORTHANC_PASSWORD=your_secure_orthanc_password_here

# SSL Configuration
DOMAIN_NAME=pacs.yourdomain.com
SSL_EMAIL=admin@yourdomain.com

# Optional: Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=your-backup-bucket

# Security
JWT_SECRET=your_jwt_secret_for_api_access
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: orthanc-postgres
    environment:
      POSTGRES_DB: orthanc
      POSTGRES_USER: orthanc
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    networks:
      - orthanc-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orthanc -d orthanc"]
      interval: 30s
      timeout: 10s
      retries: 3

  orthanc:
    image: orthancteam/orthanc:24.10.1
    container_name: orthanc-server
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - orthanc_data:/var/lib/orthanc/db
      - ./docker/orthanc-config/orthanc.json:/etc/orthanc/orthanc.json:ro
      - logs:/var/log
    networks:
      - orthanc-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8042/system"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: orthanc-nginx
    depends_on:
      - orthanc
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ssl_data:/etc/nginx/ssl
      - logs:/var/log/nginx
    networks:
      - orthanc-network
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    container_name: orthanc-certbot
    volumes:
      - ssl_data:/etc/letsencrypt
      - logs:/var/log/letsencrypt
    command: echo "Certbot container ready"
    restart: "no"

  backup:
    image: postgres:15-alpine
    container_name: orthanc-backup
    depends_on:
      - postgres
    volumes:
      - backup_data:/backup
      - orthanc_data:/var/lib/orthanc/db:ro
      - ./docker/scripts/backup.sh:/backup.sh:ro
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      BACKUP_RETENTION_DAYS: ${BACKUP_RETENTION_DAYS:-30}
    networks:
      - orthanc-network
    command: /bin/sh -c "while true; do sleep 86400; /backup.sh; done"
    restart: unless-stopped

networks:
  orthanc-network:
    driver: bridge

volumes:
  postgres_data:
    name: orthanc_postgres_data
  orthanc_data:
    name: orthanc_dicom_data
  ssl_data:
    name: orthanc_ssl_data
  logs:
    name: orthanc_logs
  backup_data:
    name: orthanc_backup_data
EOF

# Create Orthanc configuration
mkdir -p docker/orthanc-config
cat > docker/orthanc-config/orthanc.json << 'EOF'
{
  "Name": "DentaRad PACS",
  "HttpPort": 8042,
  "DicomPort": 4242,
  
  "RemoteAccessAllowed": true,
  "AuthenticationEnabled": true,
  "RegisteredUsers": {
    "admin": "ORTHANC_PASSWORD_PLACEHOLDER",
    "viewer": "ORTHANC_PASSWORD_PLACEHOLDER",
    "uploader": "ORTHANC_PASSWORD_PLACEHOLDER"
  },
  
  "PostgreSQL": {
    "EnableIndex": true,
    "EnableStorage": false,
    "Host": "postgres",
    "Port": 5432,
    "Database": "orthanc",
    "Username": "orthanc",
    "Password": "POSTGRES_PASSWORD_PLACEHOLDER"
  },
  
  "Plugins": [
    "/usr/share/orthanc/plugins",
    "/usr/share/orthanc/plugins/libOrthancDicomWeb.so",
    "/usr/share/orthanc/plugins/libOrthancPostgreSQL.so"
  ],
  
  "DicomWeb": {
    "Enable": true,
    "Root": "/dicom-web/",
    "EnableWado": true,
    "EnableQido": true,
    "EnableStow": true,
    "StudiesMetadata": "MainDicomTags",
    "SeriesMetadata": "Full",
    "Host": "0.0.0.0",
    "Port": 8042,
    "Ssl": false
  },
  
  "HttpHeaders": {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, Origin, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Max-Age": "86400"
  },
  
  "StorageDirectory": "/var/lib/orthanc/db",
  "IndexDirectory": "/var/lib/orthanc/db",
  "StorageCompression": true,
  "MaximumStorageSize": 100000,
  "MaximumPatientCount": 10000,
  
  "LogLevel": "default",
  "LogFile": "/var/log/orthanc.log",
  "VerboseEnabled": true,
  "TraceEnabled": false,
  
  "StableAge": 60,
  "StrictAet": false,
  "DicomAssociationCloseDelay": 5,
  "DicomTlsEnabled": false,
  
  "JobsHistorySize": 10,
  "SaveJobs": true,
  "OverwriteInstances": false,
  
  "LimitFindInstances": 1000,
  "LimitFindResults": 1000,
  "LimitJobs": 10,
  
  "HttpRequestTimeout": 60,
  "HttpTimeout": 60,
  
  "UserMetadata": {
    "DentaRad-CaseId": 1024,
    "DentaRad-ClinicId": 1025,
    "DentaRad-UploadedBy": 1026,
    "DentaRad-UploadDate": 1027
  },
  
  "DefaultEncoding": "Latin1",
  "DeidentifyLogs": true,
  
  "MallocArenaMax": 5,
  "HttpDescribeErrors": true,
  
  "WebDav": {
    "Enable": false
  }
}
EOF

# Create Nginx configuration
mkdir -p docker/nginx
cat > docker/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 1G;
    
    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;
    
    # Upstream
    upstream orthanc {
        server orthanc:8042;
    }
    
    # HTTP Server (redirect to HTTPS)
    server {
        listen 80;
        server_name DOMAIN_NAME_PLACEHOLDER;
        
        # ACME Challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirect all other traffic to HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }
    
    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name DOMAIN_NAME_PLACEHOLDER;
        
        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/DOMAIN_NAME_PLACEHOLDER/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_NAME_PLACEHOLDER/privkey.pem;
        
        # Strong SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # CORS Headers for DICOMweb
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Accept, Authorization, Content-Type, Origin, X-Requested-With" always;
        add_header Access-Control-Max-Age 86400 always;
        
        # Handle preflight requests
        location / {
            if ($request_method = OPTIONS) {
                return 204;
            }
            
            # Apply rate limiting to API calls
            limit_req zone=api burst=20 nodelay;
            
            # Proxy to Orthanc
            proxy_pass http://orthanc;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Buffering
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }
        
        # Special handling for DICOM uploads
        location /dicom-web/stow {
            limit_req zone=upload burst=5 nodelay;
            
            proxy_pass http://orthanc;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Extended timeouts for large uploads
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
            
            # Disable buffering for uploads
            proxy_request_buffering off;
            proxy_buffering off;
        }
    }
}
EOF

# Create database initialization script
cat > docker/init-db.sql << 'EOF'
-- Create the Orthanc database if it doesn't exist
CREATE DATABASE IF NOT EXISTS orthanc;

-- Create a user for Orthanc if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'orthanc') THEN

      CREATE ROLE orthanc LOGIN PASSWORD 'POSTGRES_PASSWORD_PLACEHOLDER';
   END IF;
END
$do$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE orthanc TO orthanc;

-- Connect to the orthanc database and set up extensions
\c orthanc;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';
EOF

# Create backup script
mkdir -p docker/scripts
cat > docker/scripts/backup.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="/backup"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup.log"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "Starting backup process..."

# Backup PostgreSQL database
log "Backing up PostgreSQL database..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h postgres -U orthanc -d orthanc > "$BACKUP_DIR/orthanc-db-$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    log "Database backup completed successfully"
    gzip "$BACKUP_DIR/orthanc-db-$TIMESTAMP.sql"
    log "Database backup compressed"
else
    log "ERROR: Database backup failed"
    exit 1
fi

# Backup DICOM files
log "Backing up DICOM files..."
tar -czf "$BACKUP_DIR/dicom-storage-$TIMESTAMP.tar.gz" -C /var/lib/orthanc/db .

if [ $? -eq 0 ]; then
    log "DICOM files backup completed successfully"
else
    log "ERROR: DICOM files backup failed"
    exit 1
fi

# Cleanup old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "orthanc-db-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "dicom-storage-*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

log "Backup process completed successfully"

# Show backup directory size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Current backup directory size: $BACKUP_SIZE"
EOF

# Create setup script
cat > docker/scripts/setup.sh << 'EOF'
#!/bin/bash

set -e

echo "🏥 DentaRad Orthanc PACS Server Setup"
echo "===================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create required directories
echo "📁 Creating directories..."
mkdir -p volumes/{ssl,logs,backup}

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit the .env file with your configuration:"
    echo "   - DOMAIN_NAME: Your domain name (e.g., pacs.yourdomain.com)"
    echo "   - SSL_EMAIL: Your email for SSL certificates"
    echo "   - POSTGRES_PASSWORD: Secure password for PostgreSQL"
    echo "   - ORTHANC_PASSWORD: Secure password for Orthanc admin user"
    echo ""
    echo "Edit .env file now and run this script again."
    exit 1
fi

# Source environment variables
source .env

# Validate required environment variables
if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$ORTHANC_PASSWORD" ]; then
    echo "❌ Missing required environment variables in .env file"
    echo "Required: DOMAIN_NAME, SSL_EMAIL, POSTGRES_PASSWORD, ORTHANC_PASSWORD"
    exit 1
fi

echo "🔧 Configuring services..."

# Replace placeholders in Orthanc configuration
sed -i "s/POSTGRES_PASSWORD_PLACEHOLDER/$POSTGRES_PASSWORD/g" docker/orthanc-config/orthanc.json
sed -i "s/ORTHANC_PASSWORD_PLACEHOLDER/$ORTHANC_PASSWORD/g" docker/orthanc-config/orthanc.json

# Replace placeholders in Nginx configuration
sed -i "s/DOMAIN_NAME_PLACEHOLDER/$DOMAIN_NAME/g" docker/nginx/nginx.conf

# Replace placeholders in database initialization
sed -i "s/POSTGRES_PASSWORD_PLACEHOLDER/$POSTGRES_PASSWORD/g" docker/init-db.sql

echo "🔐 Generating SSL certificates..."

# Start Nginx temporarily for ACME challenge
docker-compose up -d nginx

# Wait for Nginx to be ready
sleep 10

# Generate SSL certificate
docker run --rm -v "$(pwd)/volumes/ssl:/etc/letsencrypt" -v "$(pwd)/volumes/logs:/var/log/letsencrypt" \
    -v "$(pwd)/volumes/ssl:/var/www/certbot" certbot/certbot \
    certonly --webroot --webroot-path=/var/www/certbot \
    --email "$SSL_EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN_NAME"

if [ $? -ne 0 ]; then
    echo "❌ SSL certificate generation failed"
    echo "Please check that:"
    echo "1. Your domain $DOMAIN_NAME points to this server's IP"
    echo "2. Port 80 is open and accessible from the internet"
    echo "3. No other web server is running on port 80"
    exit 1
fi

# Restart Nginx with SSL configuration
docker-compose restart nginx

echo "🚀 Starting all services..."

# Start all services
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T postgres pg_isready -U orthanc -d orthanc > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    sleep 2
    ((timeout--))
done

if [ $timeout -eq 0 ]; then
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

# Wait for Orthanc
echo "Waiting for Orthanc..."
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -sf http://localhost:8042/system > /dev/null 2>&1; then
        echo "✅ Orthanc is ready"
        break
    fi
    sleep 2
    ((timeout--))
done

if [ $timeout -eq 0 ]; then
    echo "❌ Orthanc failed to start"
    exit 1
fi

# Test HTTPS connectivity
echo "Testing HTTPS connectivity..."
if curl -sf "https://$DOMAIN_NAME/system" > /dev/null 2>&1; then
    echo "✅ HTTPS connectivity confirmed"
else
    echo "⚠️  HTTPS test failed, but services are running"
fi

echo ""
echo "🎉 DentaRad PACS Server is now running!"
echo "================================================"
echo ""
echo "📍 Access URLs:"
echo "   Web Interface: https://$DOMAIN_NAME"
echo "   API Endpoint:  https://$DOMAIN_NAME/system"
echo ""
echo "🔑 Default Credentials:"
echo "   Username: admin"
echo "   Password: $ORTHANC_PASSWORD"
echo ""
echo "🔗 DICOMweb Endpoints:"
echo "   WADO-RS: https://$DOMAIN_NAME/dicom-web/wado"
echo "   QIDO-RS: https://$DOMAIN_NAME/dicom-web/qido"
echo "   STOW-RS: https://$DOMAIN_NAME/dicom-web/stow"
echo ""
echo "📋 Next Steps:"
echo "1. Configure your frontend to use these endpoints"
echo "2. Test DICOM upload and retrieval"
echo "3. Set up automated SSL renewal: sudo crontab -e"
echo "   Add: 0 0 1 */2 * $(pwd)/docker/scripts/renew-ssl.sh"
echo ""
echo "🛠️  Management Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Restart:      docker-compose restart"
echo "   Stop:         docker-compose down"
echo "   Update:       docker-compose pull && docker-compose up -d"
echo ""

# Create SSL renewal script
cat > docker/scripts/renew-ssl.sh << 'RENEWAL_EOF'
#!/bin/bash

cd "$(dirname "$0")/.."

# Renew SSL certificate
docker run --rm -v "$(pwd)/volumes/ssl:/etc/letsencrypt" -v "$(pwd)/volumes/logs:/var/log/letsencrypt" \
    certbot/certbot renew --quiet

# Reload Nginx if certificate was renewed
if [ $? -eq 0 ]; then
    docker-compose exec nginx nginx -s reload
fi
RENEWAL_EOF

chmod +x docker/scripts/renew-ssl.sh

echo "✅ Setup complete! SSL renewal script created at docker/scripts/renew-ssl.sh"
EOF

# Make scripts executable
chmod +x docker/scripts/setup.sh
chmod +x docker/scripts/backup.sh

echo "✅ DentaRad PACS deployment files created successfully!"
echo ""
echo "📁 Directory structure:"
echo "   dentarad-pacs/"
echo "   ├── docker-compose.yml"
echo "   ├── .env.example"
echo "   └── docker/"
echo "       ├── orthanc-config/"
echo "       ├── nginx/"
echo "       ├── scripts/"
echo "       └── init-db.sql"
echo ""
echo "🚀 Next steps:"
echo "1. cd dentarad-pacs"
echo "2. cp .env.example .env"
echo "3. Edit .env with your settings"
echo "4. ./docker/scripts/setup.sh"