/**
 * General health check endpoint for production monitoring
 * Used by Docker health checks and load balancers
 */

export default defineEventHandler(async (event) => {
  try {
    // Import Prisma client dynamically to avoid initialization issues
    const { PrismaClient } = await import('@prisma-app/client');
    
    // Check database connection with proper error handling
    const prisma = new PrismaClient();
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'connected'
      };
    } catch (dbError) {
      await prisma.$disconnect();
      
      // Return degraded status if database is unavailable but app is running
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: 'disconnected',
        error: 'Database connection failed'
      };
    }
  } catch (error) {
    console.error('Health check failed:', error);
    
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});