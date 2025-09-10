# Single Container Deployment Guide

This guide covers deploying the Warehouse Administrator system as a single container, compatible with platforms like Coolify, Railway, Render, and other container hosting services.

## Overview

The application is designed to work as a single container without requiring docker-compose orchestration. The Dockerfile is optimized for production deployment and includes all necessary dependencies.

## Prerequisites

- External PostgreSQL database (managed service recommended)
- Environment variables configured
- Domain name and SSL certificate (handled by hosting platform)

## Environment Variables

Configure these environment variables in your hosting platform:

```bash
# Database (External PostgreSQL required)
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Authentication
BETTER_AUTH_SECRET="your-super-secret-key-here"
BETTER_AUTH_URL="https://yourdomain.com"

# AWS Configuration
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_SES_REGION="us-east-1"
FROM_EMAIL="noreply@yourdomain.com"

# Application Configuration
NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"
NITRO_PORT="3000"
NITRO_HOST="0.0.0.0"
```

## Deployment Platforms

### Coolify

1. **Create New Project**
   - Add your Git repository
   - Select "Docker" as build pack
   - Dockerfile will be automatically detected

2. **Configure Environment Variables**
   - Add all required environment variables in Coolify dashboard
   - Ensure DATABASE_URL points to external PostgreSQL instance

3. **Deploy**
   - Coolify will build using the Dockerfile
   - Application will be available on assigned domain
   - SSL certificate will be automatically managed

### Railway

1. **Connect Repository**
   - Connect your GitHub repository to Railway
   - Railway will detect the Dockerfile automatically

2. **Add Database**
   - Add PostgreSQL service in Railway
   - Copy the DATABASE_URL from Railway dashboard

3. **Configure Variables**
   - Set environment variables in Railway dashboard
   - Deploy the application

### Render

1. **Create Web Service**
   - Connect your repository
   - Select "Docker" as environment
   - Dockerfile will be used automatically

2. **Environment Variables**
   - Configure all required environment variables
   - Add external PostgreSQL database URL

3. **Deploy**
   - Render will build and deploy automatically
   - SSL and domain management included

## Database Setup

Since this is a single-container deployment, you'll need an external PostgreSQL database:

### Managed Database Services

**Recommended Options:**
- **Neon** (PostgreSQL): Free tier available, excellent for development
- **Supabase**: PostgreSQL with additional features
- **AWS RDS**: Enterprise-grade PostgreSQL
- **Google Cloud SQL**: Managed PostgreSQL
- **Azure Database**: PostgreSQL service

### Database Migration

After setting up your external database:

```bash
# Set your database URL
export DATABASE_URL="your-external-database-url"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed initial data (optional)
npx prisma db seed
```

## Health Checks

The application includes a health check endpoint at `/api/health` that:
- Verifies database connectivity
- Returns application status
- Provides uptime information

This endpoint is used by:
- Docker health checks
- Load balancer health checks
- Monitoring systems

## Monitoring

### Application Logs

The application logs to stdout/stderr, which is captured by most hosting platforms:

```bash
# View logs in Coolify
coolify logs follow

# View logs in Railway
railway logs

# View logs in Render
# Available in Render dashboard
```

### Health Monitoring

Set up monitoring using the health endpoint:
- **Uptime monitoring**: Use services like UptimeRobot, Pingdom
- **Application monitoring**: New Relic, DataDog (if supported by platform)

## Performance Considerations

### Resource Requirements

**Minimum Requirements:**
- CPU: 0.5 vCPU
- Memory: 512MB RAM
- Storage: 1GB

**Recommended for Production:**
- CPU: 1 vCPU
- Memory: 1GB RAM
- Storage: 2GB

### Scaling

Most platforms support horizontal scaling:
- **Coolify**: Scale replicas in dashboard
- **Railway**: Adjust scaling settings
- **Render**: Configure auto-scaling

## Security

### Environment Variables

- Never commit environment variables to Git
- Use platform-specific secret management
- Rotate secrets regularly

### Database Security

- Use SSL connections to database
- Restrict database access to application IPs only
- Regular database backups

### Application Security

- HTTPS is enforced (handled by hosting platform)
- Security headers are configured
- Input validation and sanitization implemented

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check if all dependencies are properly installed
npm ci --only=production

# Verify Prisma client generation
npx prisma generate
```

**Database Connection Issues:**
```bash
# Test database connection
npx prisma db pull

# Check DATABASE_URL format
# Should be: postgresql://user:password@host:port/database
```

**Health Check Failures:**
- Verify `/api/health` endpoint is accessible
- Check database connectivity
- Review application logs

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Migration from Docker Compose

If migrating from a docker-compose setup:

1. **Export Database**
   ```bash
   pg_dump $OLD_DATABASE_URL > backup.sql
   ```

2. **Set Up External Database**
   - Create new managed PostgreSQL instance
   - Import backup: `psql $NEW_DATABASE_URL < backup.sql`

3. **Update Environment Variables**
   - Point DATABASE_URL to new external database
   - Remove docker-compose specific variables

4. **Deploy Single Container**
   - Use platform-specific deployment process
   - Verify application functionality

## Cost Optimization

### Free Tier Options

**Development/Testing:**
- **Railway**: $5/month credit
- **Render**: Free tier with limitations
- **Neon**: Free PostgreSQL tier

**Production:**
- Compare pricing across platforms
- Consider resource usage patterns
- Monitor and optimize resource allocation

## Support

### Platform-Specific Documentation

- **Coolify**: [docs.coolify.io](https://docs.coolify.io)
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Render**: [render.com/docs](https://render.com/docs)

### Application Support

For application-specific issues:
- Check application logs first
- Verify environment variables
- Test database connectivity
- Review health check endpoint

---

This single-container deployment approach provides maximum flexibility and compatibility with modern hosting platforms while maintaining all application functionality.