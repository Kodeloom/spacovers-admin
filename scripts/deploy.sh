#!/bin/bash

# Warehouse Administrator Production Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
APP_NAME="warehouse-admin"
DEPLOY_USER="deploy"
BACKUP_DIR="/backups"
LOG_FILE="/var/log/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Check if running as correct user
check_user() {
    if [ "$USER" != "$DEPLOY_USER" ]; then
        error "This script must be run as the $DEPLOY_USER user"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed"
    fi
    
    # Check if PostgreSQL client is available
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client is not installed"
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating database backup..."
    
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable is not set"
    fi
    
    BACKUP_FILE="$BACKUP_DIR/warehouse_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Create backup directory if it doesn't exist
    mkdir -p $BACKUP_DIR
    
    # Create database backup
    pg_dump $DATABASE_URL > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        # Compress backup
        gzip $BACKUP_FILE
        success "Database backup created: $BACKUP_FILE.gz"
    else
        error "Failed to create database backup"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    npm ci --only=production
    
    if [ $? -eq 0 ]; then
        success "Dependencies installed successfully"
    else
        error "Failed to install dependencies"
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma migrate deploy
    
    if [ $? -eq 0 ]; then
        success "Database migrations completed successfully"
    else
        error "Database migrations failed"
    fi
}

# Build application
build_application() {
    log "Building application..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        success "Application built successfully"
    else
        error "Application build failed"
    fi
}

# Stop application
stop_application() {
    log "Stopping application..."
    
    pm2 stop $APP_NAME 2>/dev/null || true
    
    success "Application stopped"
}

# Start application
start_application() {
    log "Starting application..."
    
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    
    if [ $? -eq 0 ]; then
        success "Application started successfully"
    else
        error "Failed to start application"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for application to start
    sleep 10
    
    # Check if application is responding
    HEALTH_URL="http://localhost:3000/api/health"
    
    for i in {1..30}; do
        if curl -f -s $HEALTH_URL > /dev/null; then
            success "Health check passed"
            return 0
        fi
        
        log "Waiting for application to respond... (attempt $i/30)"
        sleep 2
    done
    
    error "Health check failed - application is not responding"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep last 30 days of backups
    find $BACKUP_DIR -name "warehouse_backup_*.sql.gz" -mtime +30 -delete
    
    success "Old backups cleaned up"
}

# Main deployment function
deploy() {
    log "Starting deployment to $ENVIRONMENT environment..."
    
    # Pre-deployment checks
    check_user
    check_prerequisites
    
    # Create backup before deployment
    create_backup
    
    # Stop application
    stop_application
    
    # Install dependencies
    install_dependencies
    
    # Run database migrations
    run_migrations
    
    # Build application
    build_application
    
    # Start application
    start_application
    
    # Perform health check
    health_check
    
    # Cleanup
    cleanup_backups
    
    success "Deployment completed successfully!"
    
    # Show application status
    pm2 status $APP_NAME
}

# Rollback function
rollback() {
    log "Starting rollback..."
    
    # Stop current application
    stop_application
    
    # Get the latest backup
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/warehouse_backup_*.sql.gz | head -n1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back to backup: $LATEST_BACKUP"
    
    # Restore database
    gunzip -c $LATEST_BACKUP | psql $DATABASE_URL
    
    if [ $? -eq 0 ]; then
        success "Database restored from backup"
    else
        error "Failed to restore database from backup"
    fi
    
    # Checkout previous version (assuming git tags)
    git checkout HEAD~1
    
    # Reinstall dependencies and rebuild
    install_dependencies
    build_application
    start_application
    health_check
    
    success "Rollback completed successfully!"
}

# Show usage
usage() {
    echo "Usage: $0 [command] [environment]"
    echo ""
    echo "Commands:"
    echo "  deploy     Deploy application (default)"
    echo "  rollback   Rollback to previous version"
    echo "  status     Show application status"
    echo "  logs       Show application logs"
    echo "  restart    Restart application"
    echo ""
    echo "Environments:"
    echo "  production (default)"
    echo "  staging"
    echo ""
    echo "Examples:"
    echo "  $0 deploy production"
    echo "  $0 rollback"
    echo "  $0 status"
}

# Parse command line arguments
COMMAND=${1:-deploy}

case $COMMAND in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        pm2 status $APP_NAME
        ;;
    logs)
        pm2 logs $APP_NAME
        ;;
    restart)
        pm2 restart $APP_NAME
        ;;
    *)
        usage
        exit 1
        ;;
esac