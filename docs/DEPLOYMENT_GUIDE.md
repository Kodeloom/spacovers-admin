# Deployment Guide

This guide covers all deployment options for the Warehouse Administrator application, with emphasis on the recommended single-container approach.

## 🚀 Quick Start (Recommended)

The application is designed for **single-container deployment** without docker-compose:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

3. **Verify deployment**:
   ```bash
   npm run verify:standalone
   ```

That's it! No docker-compose orchestration required.

## 📋 Deployment Options

### Option 1: Single Container (Recommended)

**Best for**: Production deployments, cloud platforms, managed hosting

**Advantages**:
- ✅ No docker-compose dependencies
- ✅ Compatible with all major hosting platforms
- ✅ Simplified deployment process
- ✅ Better resource utilization
- ✅ Easier scaling and management

**Requirements**:
- Node.js 18+ runtime
- External PostgreSQL database
- Environment variables configured

**Platforms**:
- Coolify
- Railway
- Render
- Heroku
- AWS App Runner
- Google Cloud Run
- Azure Container Instances

### Option 2: Docker Container

**Best for**: Containerized environments, Kubernetes, Docker Swarm

```bash
# Build image
docker build -t warehouse-admin .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e BETTER_AUTH_SECRET="your-secret" \
  warehouse-admin
```

### Option 3: Development with Docker Compose

**Best for**: Local development only

```bash
# Start development environment
docker-compose up -d

# Stop development environment  
docker-compose down
```

> ⚠️ **Important**: Docker-compose is **NOT** required for production and should **NOT** be used in production environments.

## 🔧 Environment Configuration

### Required Variables

```bash
# Database (External PostgreSQL required for production)
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication
BETTER_AUTH_SECRET="your-super-secret-key-minimum-32-characters"
BETTER_AUTH_URL="https://yourdomain.com"

# Application
NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"
```

### Optional Variables

```bash
# AWS SES (for email notifications)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_SES_REGION="us-east-1"
FROM_EMAIL="noreply@yourdomain.com"

# QuickBooks Integration (optional)
QBO_CLIENT_ID="your-qbo-client-id"
QBO_CLIENT_SECRET="your-qbo-client-secret"
```

## 🏗️ Platform-Specific Guides

### Coolify

1. **Create New Project**
   - Connect your Git repository
   - Select "Docker" build pack
   - Dockerfile will be automatically detected

2. **Add PostgreSQL Service**
   - Add PostgreSQL service in Coolify
   - Note the connection details

3. **Configure Environment Variables**
   - Set all required environment variables
   - Use the PostgreSQL connection URL

4. **Deploy**
   - Coolify builds using the Dockerfile
   - No docker-compose files needed

### Railway

1. **Connect Repository**
   - Connect GitHub repository to Railway
   - Railway detects Dockerfile automatically

2. **Add PostgreSQL**
   - Add PostgreSQL service
   - Copy DATABASE_URL from Railway dashboard

3. **Set Environment Variables**
   - Configure all required variables in Railway dashboard

4. **Deploy**
   - Railway handles build and deployment automatically

### Render

1. **Create Web Service**
   - Connect repository
   - Select "Docker" environment
   - Dockerfile used automatically

2. **Configure Database**
   - Add external PostgreSQL service
   - Update DATABASE_URL environment variable

3. **Deploy**
   - Render builds and deploys automatically
   - SSL and domain management included

## 🧪 Verification

### Test Standalone Deployment

```bash
# Verify configuration
npm run verify:standalone

# Test application startup
npm run verify:startup

# Validate production environment
npm run verify:production

# Verify Coolify compatibility
npm run verify:coolify
```

### Manual Verification

1. **Build Test**:
   ```bash
   npm run build
   ```

2. **Startup Test**:
   ```bash
   NODE_ENV=production npm start
   ```

3. **Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```

## 🔍 Troubleshooting

### Common Issues

**Build Failures**:
```bash
# Clear cache and rebuild
rm -rf .nuxt .output node_modules
npm install
npm run build
```

**Database Connection Issues**:
```bash
# Test database connection
npx prisma db pull

# Verify DATABASE_URL format
echo $DATABASE_URL
```

**Health Check Failures**:
- Verify `/api/health` endpoint accessibility
- Check database connectivity
- Review application logs

### Debug Mode

Enable detailed logging:
```bash
export LOG_LEVEL=debug
npm start
```

## 📊 Performance

### Resource Requirements

**Minimum**:
- CPU: 0.5 vCPU
- Memory: 512MB RAM
- Storage: 1GB

**Recommended**:
- CPU: 1 vCPU  
- Memory: 1GB RAM
- Storage: 2GB

### Scaling

Most platforms support horizontal scaling:
- **Coolify**: Adjust replicas in dashboard
- **Railway**: Configure auto-scaling
- **Render**: Set scaling policies

## 🔒 Security

### Best Practices

- Use managed PostgreSQL services
- Enable SSL/TLS (handled by hosting platforms)
- Rotate secrets regularly
- Use platform secret management
- Enable audit logging

### Environment Security

- Never commit `.env` files
- Use platform-specific secret management
- Restrict database access to application IPs
- Regular security updates

## 💰 Cost Optimization

### Free Tier Options

**Development/Testing**:
- Railway: $5/month credit
- Render: Free tier available
- Neon: Free PostgreSQL tier

**Production**:
- Compare pricing across platforms
- Monitor resource usage
- Optimize based on traffic patterns

## 📚 Additional Resources

- [Single Container Deployment](./SINGLE_CONTAINER_DEPLOYMENT.md)
- [Docker Setup Guide](./DOCKER_SETUP.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- [AWS SES Setup](./AWS_SES_SETUP.md)

## ❓ Support

### Quick Checks

1. Verify environment variables are set
2. Test database connectivity
3. Check application logs
4. Verify health endpoint responds

### Platform Documentation

- **Coolify**: [docs.coolify.io](https://docs.coolify.io)
- **Railway**: [docs.railway.app](https://docs.railway.app)  
- **Render**: [render.com/docs](https://render.com/docs)

---

## 🎯 Key Takeaways

- ✅ **Single-container deployment is recommended**
- ✅ **No docker-compose required for production**
- ✅ **Compatible with all major hosting platforms**
- ✅ **External PostgreSQL database required**
- ✅ **Built-in health checks and monitoring**
- ✅ **Optimized for cloud-native deployment**

The application is designed to be cloud-native and platform-agnostic, making it easy to deploy anywhere without complex orchestration requirements.