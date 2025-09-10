# Docker Setup Guide

This document explains the Docker configuration for the Warehouse Administrator application.

## Overview

The application supports multiple deployment scenarios:

1. **Single Container Production** (Recommended)
2. **Development with Docker Compose**
3. **Multi-Service Production with Docker Compose** (Optional)

## Files Structure

```
├── Dockerfile                     # Production-ready single container
├── docker-compose.yml            # Development environment only
├── docker-compose.production.yml  # Optional multi-service production
└── docs/
    ├── DOCKER_SETUP.md           # This file
    ├── SINGLE_CONTAINER_DEPLOYMENT.md
    └── PRODUCTION_DEPLOYMENT.md
```

## Single Container Deployment (Production)

The `Dockerfile` is optimized for single-container deployment and includes:

- Multi-stage build for optimization
- Production-only dependencies
- Non-root user for security
- Health check endpoint
- No docker-compose dependencies

### Key Features:
- ✅ Coolify compatible
- ✅ Railway compatible
- ✅ Render compatible
- ✅ Works with external PostgreSQL
- ✅ Includes health checks
- ✅ Security hardened

### Build and Run:
```bash
# Build the image
docker build -t warehouse-admin .

# Run with external database
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e BETTER_AUTH_URL="https://yourdomain.com" \
  warehouse-admin
```

## Development Environment

Use `docker-compose.yml` for local development:

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

This includes:
- Application container
- PostgreSQL database
- Volume mounts for development

## Production Multi-Service (Optional)

The `docker-compose.production.yml` provides a complete production stack:

- Application container
- PostgreSQL database
- Redis cache
- Nginx reverse proxy
- Backup service
- Monitoring (Prometheus/Grafana)

**Note:** This is optional and not required for most deployments.

## Health Checks

The application includes a health endpoint at `/api/health` that:
- Checks database connectivity
- Returns application status
- Provides uptime information

## Validation

Run the validation script to ensure Docker setup is correct:

```bash
node scripts/validate-dockerfile.js
```

This validates:
- Dockerfile structure
- Health endpoint existence
- No docker-compose build dependencies
- Required commands and optimizations

## Environment Variables

Required for all deployments:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

See deployment guides for complete environment variable lists.

## Migration from Docker Compose

If migrating from a docker-compose setup to single container:

1. Export your database
2. Set up external PostgreSQL service
3. Update environment variables
4. Deploy using single container method

## Troubleshooting

### Build Issues
- Ensure all dependencies are in package.json
- Check Prisma schema is valid
- Verify ZenStack configuration

### Runtime Issues
- Check DATABASE_URL format
- Verify external database connectivity
- Review application logs
- Test health endpoint: `curl http://localhost:3000/api/health`

### Platform-Specific Issues
- **Coolify**: Ensure port 3000 is exposed
- **Railway**: Check environment variables are set
- **Render**: Verify Dockerfile is in root directory

## Security Considerations

- Application runs as non-root user
- Only production dependencies included
- Health checks don't expose sensitive data
- Environment variables properly handled
- SSL/TLS handled by hosting platform

---

For detailed deployment instructions, see:
- [Single Container Deployment](./SINGLE_CONTAINER_DEPLOYMENT.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)