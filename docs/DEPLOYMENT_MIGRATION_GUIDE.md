# Deployment Migration Guide

This guide provides instructions for migrating existing production deployments to the updated warehouse scanning system configuration. The recent changes optimize the application for single-container deployment and remove docker-compose dependencies from production environments.

## 🔄 Migration Overview

### What Changed

The application has been updated to:
- **Remove docker-compose requirement** for production deployments
- **Optimize for single-container deployment** (Coolify, Railway, Render compatible)
- **Maintain docker-compose support** for local development only
- **Enhance health checks** and monitoring capabilities
- **Improve deployment compatibility** across hosting platforms

### Migration Impact

- ✅ **Low Risk**: No breaking changes to application functionality
- ✅ **Backward Compatible**: Existing deployments continue to work
- ✅ **Optional Migration**: Can migrate at your convenience
- ✅ **Improved Performance**: Better resource utilization and startup times

## 📋 Pre-Migration Assessment

### Current Deployment Check

Run this assessment to understand your current deployment:

```bash
# Check if you're using docker-compose in production
docker-compose --version 2>/dev/null && echo "Using docker-compose" || echo "Not using docker-compose"

# Check current deployment method
if [ -f "docker-compose.production.yml" ]; then
    echo "Multi-service docker-compose deployment detected"
elif [ -f "Dockerfile" ]; then
    echo "Single-container deployment detected"
else
    echo "Traditional server deployment detected"
fi

# Verify application health
curl -s http://localhost:3000/api/health || echo "Health endpoint not accessible"
```

### Deployment Types

**Type A: Single-Container Deployment (Recommended)**
- Already using Dockerfile directly
- No migration needed, already optimal
- Can update documentation and verification scripts

**Type B: Docker-Compose Production Deployment**
- Currently using docker-compose.production.yml
- Migration recommended for better platform compatibility
- Follow "Docker-Compose to Single-Container Migration" section

**Type C: Traditional Server Deployment**
- Direct Node.js installation on server
- Migration optional, can modernize to containerized deployment
- Follow "Traditional to Container Migration" section

## 🚀 Migration Paths

### Path 1: Docker-Compose to Single-Container Migration

**Recommended for**: Coolify, Railway, Render, and similar platforms

#### Step 1: Backup Current Deployment

```bash
# Create backup directory
mkdir -p migration-backup/$(date +%Y%m%d)

# Backup database
docker-compose exec postgres pg_dump -U warehouse_user warehouse_admin > migration-backup/$(date +%Y%m%d)/database_backup.sql

# Backup environment configuration
cp .env.production migration-backup/$(date +%Y%m%d)/
cp docker-compose.production.yml migration-backup/$(date +%Y%m%d)/

# Backup application data (if any persistent volumes)
docker-compose exec app tar -czf /tmp/app_data.tar.gz /app/data 2>/dev/null || echo "No app data to backup"
```

#### Step 2: Prepare External Database

**Option A: Use Managed Database Service (Recommended)**

```bash
# Example with Neon (PostgreSQL)
# 1. Create account at neon.tech
# 2. Create new database
# 3. Get connection string: postgresql://user:pass@host/dbname

# Import existing data
psql "postgresql://user:pass@new-host/dbname" < migration-backup/$(date +%Y%m%d)/database_backup.sql
```

**Option B: Keep Existing PostgreSQL Container**

```bash
# Expose PostgreSQL port for external access
# Update docker-compose.production.yml:
# ports:
#   - "5432:5432"  # Make accessible externally

# Get connection details
docker-compose exec postgres psql -U warehouse_user -d warehouse_admin -c "SELECT version();"
```

#### Step 3: Update Environment Configuration

```bash
# Create new environment file for single-container deployment
cat > .env.production.new << EOF
# Database (External PostgreSQL)
DATABASE_URL="postgresql://user:pass@external-host:5432/warehouse_admin"

# Authentication
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}"
BETTER_AUTH_URL="${BETTER_AUTH_URL}"

# Application
NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"

# AWS SES (if configured)
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
AWS_SES_REGION="${AWS_SES_REGION}"
FROM_EMAIL="${FROM_EMAIL}"

# QuickBooks (if configured)
QBO_CLIENT_ID="${QBO_CLIENT_ID}"
QBO_CLIENT_SECRET="${QBO_CLIENT_SECRET}"
EOF
```

#### Step 4: Test Single-Container Deployment

```bash
# Build and test locally
docker build -t warehouse-admin-test .

# Test with new configuration
docker run --rm -p 3000:3000 --env-file .env.production.new warehouse-admin-test

# Verify health endpoint
curl http://localhost:3000/api/health

# Expected response: {"status":"healthy","database":"connected",...}
```

#### Step 5: Deploy to New Platform

**For Coolify:**

1. **Create New Project**
   - Connect Git repository
   - Select "Docker" build pack
   - Dockerfile will be automatically detected

2. **Configure Environment Variables**
   - Copy variables from `.env.production.new`
   - Set in Coolify dashboard

3. **Deploy and Verify**
   - Monitor build logs
   - Test health endpoint
   - Verify application functionality

#### Step 6: Cleanup Old Deployment

```bash
# After successful migration and verification
# Stop old docker-compose deployment
docker-compose -f docker-compose.production.yml down

# Remove old containers and volumes (CAUTION: Only after data migration confirmed)
# docker-compose -f docker-compose.production.yml down -v
```

### Path 2: Traditional to Container Migration

**For**: Servers running Node.js directly

#### Step 1: Backup Current Installation

```bash
# Backup database
pg_dump warehouse_admin > migration-backup/$(date +%Y%m%d)/database_backup.sql

# Backup application files
tar -czf migration-backup/$(date +%Y%m%d)/app_backup.tar.gz /path/to/warehouse-admin

# Backup environment configuration
cp /path/to/warehouse-admin/.env migration-backup/$(date +%Y%m%d)/
```

#### Step 2: Containerize Application

```bash
# Clone updated repository
git clone https://github.com/yourcompany/warehouse-admin.git warehouse-admin-containerized
cd warehouse-admin-containerized

# Copy environment configuration
cp ../migration-backup/$(date +%Y%m%d)/.env .env.production

# Build container
docker build -t warehouse-admin .
```

#### Step 3: Migrate Database

```bash
# Import data to new database setup
psql $NEW_DATABASE_URL < migration-backup/$(date +%Y%m%d)/database_backup.sql

# Run any new migrations
npx prisma migrate deploy
```

#### Step 4: Deploy Container

```bash
# Deploy using Docker
docker run -d \
  --name warehouse-admin \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  warehouse-admin

# Or deploy to container platform (Coolify, Railway, etc.)
```

### Path 3: Update Existing Single-Container Deployment

**For**: Already using single-container deployment

#### Step 1: Update Application Code

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm ci --only=production

# Rebuild application
npm run build
```

#### Step 2: Update Verification Scripts

```bash
# Run new verification scripts
npm run verify:standalone
npm run verify:production

# If using Coolify
npm run verify:coolify
```

#### Step 3: Redeploy

```bash
# Redeploy using your existing process
# Platform will use updated Dockerfile automatically
```

## 🔧 Configuration Updates

### Environment Variables Changes

**New Required Variables:**
```bash
# These are now explicitly required for single-container deployment
HOST="0.0.0.0"
PORT="3000"
```

**Deprecated Variables:**
```bash
# These are no longer needed for single-container deployment
COMPOSE_PROJECT_NAME  # Only used in docker-compose
POSTGRES_HOST         # Use full DATABASE_URL instead
POSTGRES_PORT         # Use full DATABASE_URL instead
POSTGRES_DB           # Use full DATABASE_URL instead
POSTGRES_USER         # Use full DATABASE_URL instead
POSTGRES_PASSWORD     # Use full DATABASE_URL instead
```

### Health Check Enhancements

The health endpoint (`/api/health`) now provides more detailed information:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "production"
}
```

## 🧪 Testing and Validation

### Pre-Migration Testing

```bash
# Test current deployment
curl -s http://your-domain.com/api/health

# Backup verification
pg_dump $DATABASE_URL > test_backup.sql
psql $DATABASE_URL < test_backup.sql  # Should complete without errors
```

### Post-Migration Testing

```bash
# Health check
curl -s https://new-domain.com/api/health

# Functional testing checklist
# - User authentication works
# - Database operations function
# - Barcode scanning works
# - Reports generate correctly
# - Email notifications work (if configured)
# - QuickBooks integration works (if configured)
```

### Rollback Testing

```bash
# Verify rollback capability
# 1. Stop new deployment
# 2. Start old deployment from backup
# 3. Restore database from backup
# 4. Verify functionality
```

## 🚨 Rollback Procedures

### Emergency Rollback (Docker-Compose)

If issues occur during migration:

```bash
# 1. Stop new deployment
# (Platform-specific: stop in Coolify/Railway dashboard)

# 2. Restore old docker-compose deployment
cd /path/to/old-deployment
docker-compose -f docker-compose.production.yml up -d

# 3. Restore database if needed
docker-compose exec postgres psql -U warehouse_user -d warehouse_admin < migration-backup/$(date +%Y%m%d)/database_backup.sql

# 4. Update DNS to point back to old deployment
# (Update A records or load balancer configuration)

# 5. Verify functionality
curl http://old-domain.com/api/health
```

### Rollback from Single-Container to Traditional

```bash
# 1. Stop container deployment
docker stop warehouse-admin

# 2. Restore traditional deployment
cd /path/to/traditional-deployment
pm2 start ecosystem.config.js --env production

# 3. Restore database
psql warehouse_admin < migration-backup/$(date +%Y%m%d)/database_backup.sql

# 4. Verify functionality
curl http://localhost:3000/api/health
```

## 📊 Migration Timeline

### Recommended Migration Schedule

**Week 1: Planning and Preparation**
- [ ] Assess current deployment type
- [ ] Choose migration path
- [ ] Set up external database (if needed)
- [ ] Prepare new hosting platform account

**Week 2: Testing and Staging**
- [ ] Create staging environment with new configuration
- [ ] Test migration process in staging
- [ ] Validate all functionality works
- [ ] Prepare rollback procedures

**Week 3: Production Migration**
- [ ] Schedule maintenance window
- [ ] Execute migration during low-traffic period
- [ ] Monitor application performance
- [ ] Verify all functionality
- [ ] Update documentation

**Week 4: Cleanup and Optimization**
- [ ] Remove old deployment resources
- [ ] Optimize new deployment configuration
- [ ] Update monitoring and alerting
- [ ] Train team on new deployment process

## 🔍 Troubleshooting

### Common Migration Issues

**Database Connection Failures**
```bash
# Symptom: Health check returns database connection error
# Solution: Verify DATABASE_URL format and credentials
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database

# Test connection manually
psql $DATABASE_URL -c "SELECT version();"
```

**Build Failures in New Platform**
```bash
# Symptom: Docker build fails in Coolify/Railway
# Solution: Check build logs for specific errors

# Common fixes:
# 1. Clear npm cache
npm cache clean --force

# 2. Rebuild Prisma client
npx prisma generate

# 3. Check Node.js version compatibility
node --version  # Should be 18+
```

**Environment Variable Issues**
```bash
# Symptom: Application starts but functionality broken
# Solution: Verify all required environment variables are set

# Check in container
docker exec -it container-name env | grep -E "(DATABASE_URL|BETTER_AUTH)"

# Verify format
node -e "console.log(process.env.DATABASE_URL ? 'DATABASE_URL set' : 'DATABASE_URL missing')"
```

**Performance Issues After Migration**
```bash
# Symptom: Slower response times
# Solution: Check resource allocation and database performance

# Monitor resource usage
docker stats container-name

# Check database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
```

## 📞 Support and Resources

### Migration Support

**Before Migration:**
- Review this guide thoroughly
- Test migration process in staging environment
- Prepare rollback procedures
- Schedule appropriate maintenance window

**During Migration:**
- Monitor application logs continuously
- Test functionality immediately after deployment
- Keep rollback procedures ready
- Document any issues encountered

**After Migration:**
- Monitor performance for 24-48 hours
- Verify all integrations work correctly
- Update team documentation
- Schedule cleanup of old resources

### Additional Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [Single Container Deployment](./SINGLE_CONTAINER_DEPLOYMENT.md) - Platform-specific guides
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Advanced production setup
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment verification

### Emergency Contacts

**Technical Issues:**
- System Administrator: [contact-info]
- Database Administrator: [contact-info]
- Platform Support: [platform-specific-support]

**Business Impact:**
- Technical Lead: [contact-info]
- Product Owner: [contact-info]
- Operations Manager: [contact-info]

## ✅ Migration Completion Checklist

### Technical Verification
- [ ] Application builds successfully in new environment
- [ ] Health endpoint returns healthy status
- [ ] Database connectivity verified
- [ ] All environment variables configured correctly
- [ ] SSL certificate working (HTTPS)
- [ ] Domain name resolving correctly

### Functional Verification
- [ ] User authentication working
- [ ] Barcode scanning functionality operational
- [ ] Reports generating correctly
- [ ] Email notifications working (if configured)
- [ ] QuickBooks integration working (if configured)
- [ ] All API endpoints responding correctly

### Performance Verification
- [ ] Response times acceptable
- [ ] Resource usage within expected limits
- [ ] Database queries performing well
- [ ] No memory leaks detected
- [ ] Error rates within normal range

### Documentation Updates
- [ ] Deployment procedures updated
- [ ] Environment configuration documented
- [ ] Rollback procedures tested and documented
- [ ] Team trained on new deployment process
- [ ] Monitoring and alerting updated

### Cleanup Tasks
- [ ] Old deployment resources removed (after verification period)
- [ ] Unused environment variables cleaned up
- [ ] Old backup files archived appropriately
- [ ] DNS records updated (if changed)
- [ ] Load balancer configuration updated (if applicable)

---

## 📝 Migration Log Template

Use this template to document your migration:

```
Migration Date: ___________
Migration Type: [ ] Docker-Compose to Single-Container [ ] Traditional to Container [ ] Update Existing
Performed By: ___________
Downtime: _____ minutes

Pre-Migration Checklist:
[ ] Backup created and verified
[ ] Staging environment tested
[ ] Rollback procedures prepared
[ ] Team notified

Migration Steps Completed:
[ ] Database migrated
[ ] Environment variables configured
[ ] Application deployed
[ ] Functionality verified
[ ] Performance validated

Issues Encountered:
_________________________________
_________________________________

Resolution Actions:
_________________________________
_________________________________

Post-Migration Status:
[ ] All systems operational
[ ] Performance acceptable
[ ] No critical issues
[ ] Team notified of completion

Next Steps:
_________________________________
_________________________________
```

This migration guide ensures a smooth transition to the optimized deployment configuration while maintaining system reliability and providing clear rollback procedures for any issues that may arise.