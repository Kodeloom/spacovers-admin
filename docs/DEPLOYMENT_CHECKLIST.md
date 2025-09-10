# Production Deployment Checklist

This checklist ensures all production environment configurations are properly verified before deployment.

## ✅ Pre-Deployment Verification

### Environment Configuration
- [ ] All required environment variables are set
- [ ] DATABASE_URL format is valid and points to external PostgreSQL
- [ ] BETTER_AUTH_SECRET is at least 32 characters
- [ ] BETTER_AUTH_URL matches production domain
- [ ] AWS SES credentials configured (if using email notifications)
- [ ] QuickBooks credentials configured (if using integration)

### Application Build
- [ ] `npm run build` completes successfully
- [ ] Prisma client is generated (`npx prisma generate`)
- [ ] All dependencies are installed
- [ ] No build errors or warnings

### Database Setup
- [ ] External PostgreSQL database is provisioned
- [ ] Database migrations are applied (`npx prisma migrate deploy`)
- [ ] Database connection is tested and working
- [ ] Initial data is seeded (if required)

### Deployment Platform
- [ ] Coolify project is created and configured
- [ ] Repository is connected to deployment platform
- [ ] Environment variables are set in platform dashboard
- [ ] Domain name is configured
- [ ] SSL certificate is set up (automatic with most platforms)

## 🧪 Verification Scripts

Run these scripts to verify deployment readiness:

```bash
# Test standalone deployment compatibility
npm run verify:standalone

# Validate production configuration
npm run verify:production

# Verify Coolify-specific setup
npm run verify:coolify

# Test application startup
npm run verify:startup
```

## 🚀 Deployment Steps

### 1. Final Pre-Deployment Check
```bash
# Ensure everything is committed
git status
git add .
git commit -m "Production deployment ready"
git push origin main
```

### 2. Deploy to Platform
- Trigger deployment in Coolify/Railway/Render
- Monitor build logs for any issues
- Wait for deployment to complete

### 3. Post-Deployment Verification
```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","database":"connected",...}
```

### 4. Functional Testing
- [ ] Application loads successfully
- [ ] User authentication works
- [ ] Database operations function correctly
- [ ] Email notifications work (if configured)
- [ ] QuickBooks integration works (if configured)
- [ ] Barcode scanning functionality works
- [ ] Reports generate correctly

## 🔍 Monitoring Setup

### Health Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alerts for health endpoint failures
- [ ] Monitor application logs for errors

### Performance Monitoring
- [ ] Set up performance monitoring (if available)
- [ ] Monitor resource usage (CPU, memory)
- [ ] Set up alerts for high resource usage

## 🛠️ Troubleshooting

### Common Issues and Solutions

**Build Failures:**
```bash
# Clear cache and rebuild
rm -rf .nuxt .output node_modules
npm install
npm run build
```

**Database Connection Issues:**
```bash
# Test database connection
npx prisma db pull
# Verify DATABASE_URL format
echo $DATABASE_URL
```

**Health Check Failures:**
- Check application logs in platform dashboard
- Verify all environment variables are set
- Test database connectivity
- Check for Prisma client initialization issues

**SSL/Domain Issues:**
- Verify DNS records point to platform
- Check SSL certificate status
- Update BETTER_AUTH_URL to match domain

## 📋 Environment Variables Reference

### Required Variables
```bash
DATABASE_URL="postgresql://user:pass@host:port/database"
BETTER_AUTH_SECRET="your-32-character-secret"
BETTER_AUTH_URL="https://your-domain.com"
NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"
```

### Optional Variables
```bash
# AWS SES (Email)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_SES_REGION="us-east-1"
FROM_EMAIL="noreply@your-domain.com"

# QuickBooks Integration
QBO_CLIENT_ID="your-qbo-client-id"
QBO_CLIENT_SECRET="your-qbo-client-secret"
QBO_REDIRECT_URI="https://your-domain.com/api/quickbooks/callback"
QBO_WEBHOOK_VERIFIER_TOKEN="your-webhook-token"
```

## 🔒 Security Checklist

- [ ] All secrets are stored securely (not in code)
- [ ] Database access is restricted to application only
- [ ] HTTPS is enforced for all connections
- [ ] Security headers are properly configured
- [ ] Input validation is implemented
- [ ] Error messages don't expose sensitive information

## 📊 Performance Optimization

- [ ] Database queries are optimized
- [ ] Proper indexes are in place
- [ ] Caching is configured where appropriate
- [ ] Static assets are optimized
- [ ] Compression is enabled

## 🔄 Backup and Recovery

- [ ] Database backup strategy is in place
- [ ] Backup restoration process is tested
- [ ] Recovery procedures are documented
- [ ] Backup retention policy is defined

## 📞 Support Information

### Emergency Contacts
- Technical Lead: [contact-info]
- System Administrator: [contact-info]
- Database Administrator: [contact-info]

### Documentation Links
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Single Container Deployment](./SINGLE_CONTAINER_DEPLOYMENT.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

## ✅ Sign-off

### Technical Review
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Documentation updated

### Stakeholder Approval
- [ ] Product Owner approval
- [ ] Technical Lead approval
- [ ] Operations team approval

### Deployment Authorization
- [ ] Deployment window scheduled
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Support team notified

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Version:** ___________  
**Environment:** Production  

**Notes:**
_________________________________
_________________________________
_________________________________