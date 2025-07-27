#!/bin/bash

set -e

echo "🚀 Setting up DentaRad Orthanc PACS Server"
echo "========================================="

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p ssl logs backup

# Copy environment file
if [ ! -f .env ]; then
    echo "📋 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing."
    echo "   Required settings:"
    echo "   - DOMAIN_NAME: Your domain (e.g., pacs.yourdomain.com)"
    echo "   - SSL_EMAIL: Your email for SSL certificates"
    echo "   - POSTGRES_PASSWORD: Secure database password"
    echo "   - ORTHANC_PASSWORD: Secure Orthanc admin password"
    echo ""
    read -p "Press Enter when you've configured .env file..."
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$ORTHANC_PASSWORD" ]; then
    echo "❌ Missing required environment variables in .env file"
    echo "Please configure: DOMAIN_NAME, SSL_EMAIL, POSTGRES_PASSWORD, ORTHANC_PASSWORD"
    exit 1
fi

echo "🔧 Configuring Orthanc..."

# Replace placeholders in Orthanc configuration
sed -i "s/POSTGRES_PASSWORD_PLACEHOLDER/$POSTGRES_PASSWORD/g" orthanc-config/orthanc.json
sed -i "s/ORTHANC_PASSWORD_PLACEHOLDER/$ORTHANC_PASSWORD/g" orthanc-config/orthanc.json

# Replace domain in nginx configuration
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN_NAME/g" nginx/nginx.conf

echo "🔒 Setting up SSL certificates..."

# Start nginx for Let's Encrypt challenge
echo "Starting temporary nginx for SSL certificate generation..."
docker-compose up -d nginx

# Wait for nginx to be ready
sleep 10

# Generate SSL certificate
echo "Generating SSL certificate for $DOMAIN_NAME..."
docker-compose run --rm certbot

# Restart nginx with SSL
echo "Restarting nginx with SSL..."
docker-compose restart nginx

echo "🐳 Starting all services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are healthy
echo "🔍 Checking service health..."

# Check Postgres
if docker-compose exec postgres pg_isready -U orthanc > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check Orthanc
if curl -f http://localhost:8042/system > /dev/null 2>&1; then
    echo "✅ Orthanc is ready"
else
    echo "❌ Orthanc is not ready"
fi

# Check HTTPS
if curl -f -k https://$DOMAIN_NAME/system > /dev/null 2>&1; then
    echo "✅ HTTPS is working"
else
    echo "⚠️  HTTPS might need a few more minutes to be ready"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo "📍 Orthanc Web Interface: https://$DOMAIN_NAME"
echo "🔑 Username: admin"
echo "🔑 Password: $ORTHANC_PASSWORD"
echo ""
echo "🔗 DICOMweb Endpoints:"
echo "   WADO-RS: https://$DOMAIN_NAME/dicom-web/wado"
echo "   QIDO-RS: https://$DOMAIN_NAME/dicom-web/qido"
echo "   STOW-RS: https://$DOMAIN_NAME/dicom-web/stow"
echo ""
echo "📋 Next Steps:"
echo "1. Test the web interface at https://$DOMAIN_NAME"
echo "2. Update your DentaRad frontend configuration"
echo "3. Test DICOM upload and viewing"
echo "4. Configure automated backups"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Start services: docker-compose up -d"
echo "   Backup data:   ./scripts/backup.sh"

# Create SSL renewal script
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
echo "Renewing SSL certificates..."
docker-compose run --rm certbot renew
docker-compose restart nginx
echo "SSL renewal complete!"
EOF

chmod +x scripts/renew-ssl.sh

echo ""
echo "📅 SSL certificates will expire in 90 days."
echo "   Add this to your crontab for auto-renewal:"
echo "   0 0 1 */2 * /path/to/your/orthanc/scripts/renew-ssl.sh"