# Multi-stage build for production optimization
FROM node:22.15-alpine AS base

WORKDIR /app

COPY . /app

RUN npm ci
RUN npm run build

RUN mkdir -p /app/logs

# Expose port
EXPOSE 3000

# Set environment variables for single-container deployment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# Health check using the new health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application directly (no docker-compose dependencies)
CMD ["node", ".output/server/index.mjs"]