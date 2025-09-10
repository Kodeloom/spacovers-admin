# Production Deployment Guide

This guide covers the complete process for deploying the Warehouse Administrator system to production.

## Deployment Options

Choose the deployment method that best fits your infrastructure:

1. **Single Container Deployment** (Recommended for most users)
   - Compatible with Coolify, Railway, Render, and similar platforms
   - Requires external PostgreSQL database
   - See [Single Container Deployment Guide](./SINGLE_CONTAINER_DEPLOYMENT.md)

2. **Multi-Service Docker Compose** (Advanced users)
   - Includes PostgreSQL, Redis, Nginx, and monitoring
   - Requires server management
   - Covered in this document

3. **Traditional Server Deployment**
   - Direct installation on VPS/dedicated server
   - Maximum control and customization
   - Covered in this document

## Prerequisites

Before deploying to production, ensure:

1. ✅ All testing has been completed successfully
2. ✅ Database schema is finalized and migrated
3. ✅ Environment variables are configured
4. ✅ AWS SES is set up and verified
5. ✅ SSL certificates are ready
6. ✅ Domain name is configured
7. ✅ Backup strategy is in place

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Authentication
BETTER_AUTH_SECRET="your-super-secret-key-here"
BETTER_AUTH_URL="https://yourdomain.com"

# AWS Configuration
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_SES_REGION="us-east-1"
FROM_EMAIL="noreply@yourdomain.com"

# Email Configuration
SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"

# QuickBooks Integration (Optional)
QBO_CLIENT_ID="your-qbo-client-id"
QBO_CLIENT_SECRET="your-qbo-client-secret"
QBO_REDIRECT_URI="https://yourdomain.com/api/quickbooks/callback"
QBO_WEBHOOK_VERIFIER_TOKEN="your-webhook-verifier-token"

# Application Configuration
NODE_ENV="production"
NUXT_PUBLIC_APP_NAME="Warehouse Administrator"
NUXT_PUBLIC_COMPANY_NAME="Your Company Name"
```

### Security Considerations

1. **Secrets Management**: Use a secure secrets management system (AWS Secrets Manager, Azure Key Vault, etc.)
2. **Database Security**: Ensure database is not publicly accessible
3. **SSL/TLS**: Use HTTPS for all communications
4. **CORS**: Configure CORS properly for your domain
5. **Rate Limiting**: Implement rate limiting for API endpoints

## Database Setup

### 1. Production Database

```bash
# Create production database
createdb warehouse_admin_production

# Set up database user with limited permissions
CREATE USER warehouse_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE warehouse_admin_production TO warehouse_app;
GRANT USAGE ON SCHEMA public TO warehouse_app;
GRANT CREATE ON SCHEMA public TO warehouse_app;
```

### 2. Run Migrations

```bash
# Set production database URL
export DATABASE_URL="postgresql://warehouse_app:secure_password@host:port/warehouse_admin_production"

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed initial data (if needed)
npx prisma db seed
```

### 3. Database Backup Strategy

Set up automated backups:

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="warehouse_backup_$DATE.sql"

pg_dump $DATABASE_URL > /backups/$BACKUP_FILE

# Compress backup
gzip /backups/$BACKUP_FILE

# Upload to cloud storage (AWS S3, etc.)
aws s3 cp /backups/$BACKUP_FILE.gz s3://your-backup-bucket/database/

# Clean up old backups (keep last 30 days)
find /backups -name "warehouse_backup_*.sql.gz" -mtime +30 -delete
```

## AWS SES Configuration

### 1. Verify Domain

```bash
# Add these DNS records to your domain:
# TXT record: _amazonses.yourdomain.com
# CNAME records for DKIM verification
```

### 2. Configure Sending Limits

1. Request production access (remove sandbox mode)
2. Set appropriate sending limits
3. Configure bounce and complaint handling
4. Set up SNS notifications for delivery status

### 3. Email Templates

Ensure email templates are production-ready:
- Test with real email addresses
- Verify HTML rendering across email clients
- Check spam score and deliverability

## Application Deployment

### Option 1: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: warehouse_admin_production
      POSTGRES_USER: warehouse_app
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

### Option 2: Traditional Server Deployment

```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/yourcompany/warehouse-admin.git
cd warehouse-admin

# Install dependencies
npm ci --only=production

# Set up environment
cp .env.production .env

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Set up PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'warehouse-admin',
    script: '.output/server/index.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

## Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Login rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Main application
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_cache_bypass $http_upgrade;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://app;
        }
    }
}
```

## Monitoring and Logging

### 1. Application Monitoring

Set up monitoring with tools like:
- **Uptime monitoring**: Pingdom, UptimeRobot
- **Performance monitoring**: New Relic, DataDog
- **Error tracking**: Sentry, Rollbar

### 2. Log Management

Configure centralized logging:

```javascript
// Add to nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    logLevel: process.env.LOG_LEVEL || 'info',
    logFormat: process.env.LOG_FORMAT || 'json'
  }
})
```

### 3. Health Checks

Create health check endpoint:

```typescript
// server/api/health.get.ts
export default defineEventHandler(async (event) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      uptime: process.uptime()
    };
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable'
    });
  }
});
```

## Security Hardening

### 1. Server Security

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Set up fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Application Security

- Enable CSRF protection
- Implement proper session management
- Use secure cookies
- Validate all inputs
- Sanitize outputs
- Implement proper error handling

## Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_order_status ON "Order"(orderStatus);
CREATE INDEX idx_order_customer ON "Order"(customerId);
CREATE INDEX idx_item_processing_log_user ON "ItemProcessingLog"(userId);
CREATE INDEX idx_item_processing_log_station ON "ItemProcessingLog"(stationId);
CREATE INDEX idx_item_processing_log_time ON "ItemProcessingLog"(startTime, endTime);

-- Analyze query performance
ANALYZE;
```

### 2. Application Optimization

- Enable gzip compression
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets
- Implement lazy loading

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] DNS records configured

### Deployment

- [ ] Deploy application
- [ ] Run database migrations
- [ ] Verify application starts successfully
- [ ] Test critical functionality
- [ ] Verify email notifications work
- [ ] Test barcode scanning
- [ ] Verify reporting functionality
- [ ] Check error handling

### Post-Deployment

- [ ] Monitor application logs
- [ ] Verify all services are running
- [ ] Test from external network
- [ ] Verify SSL certificate
- [ ] Check performance metrics
- [ ] Test backup and recovery
- [ ] Update documentation
- [ ] Notify stakeholders

## Rollback Plan

In case of deployment issues:

1. **Immediate Rollback**:
   ```bash
   # Stop current version
   pm2 stop warehouse-admin
   
   # Restore previous version
   git checkout previous-release-tag
   npm ci --only=production
   npm run build
   
   # Start application
   pm2 start warehouse-admin
   ```

2. **Database Rollback**:
   ```bash
   # Restore from backup
   pg_restore -d warehouse_admin_production backup_file.sql
   ```

3. **Communication**:
   - Notify users of the rollback
   - Document issues encountered
   - Plan fix and re-deployment

## Maintenance

### Regular Tasks

- **Daily**: Monitor logs and performance
- **Weekly**: Review security alerts and updates
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and test backup/recovery procedures

### Update Process

1. Test updates in staging environment
2. Schedule maintenance window
3. Create backup before updates
4. Deploy updates
5. Verify functionality
6. Monitor for issues

## Support and Documentation

### User Training

- Create user manuals for different roles
- Conduct training sessions
- Set up support channels
- Document common issues and solutions

### Technical Documentation

- API documentation
- Database schema documentation
- Deployment procedures
- Troubleshooting guides

## Contact Information

- **Technical Support**: tech-support@yourcompany.com
- **System Administrator**: sysadmin@yourcompany.com
- **Emergency Contact**: +1-XXX-XXX-XXXX

---

This deployment guide should be customized based on your specific infrastructure and requirements. Always test the deployment process in a staging environment before deploying to production.