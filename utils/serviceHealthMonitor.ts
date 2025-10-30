/**
 * Service Health Monitor
 * Provides health monitoring and fallback mechanisms for critical services
 */

// Service health status
export interface ServiceHealth {
  service: string
  healthy: boolean
  lastCheck: Date
  responseTime?: number
  errorCount: number
  lastError?: string
  consecutiveFailures: number
}

// Health check configuration
interface HealthCheckConfig {
  timeout: number
  retryAttempts: number
  retryDelay: number
  healthThreshold: number // Max consecutive failures before marking unhealthy
}

// Service registry
const serviceRegistry = new Map<string, ServiceHealth>()

// Default health check configuration
const defaultConfig: HealthCheckConfig = {
  timeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  healthThreshold: 3 // Mark unhealthy after 3 consecutive failures
}

/**
 * Initialize service health monitoring
 */
export function initializeServiceHealth(serviceName: string): void {
  if (!serviceRegistry.has(serviceName)) {
    serviceRegistry.set(serviceName, {
      service: serviceName,
      healthy: true,
      lastCheck: new Date(),
      errorCount: 0,
      consecutiveFailures: 0
    })
  }
}

/**
 * Get current health status for a service
 */
export function getServiceHealth(serviceName: string): ServiceHealth | null {
  return serviceRegistry.get(serviceName) || null
}

/**
 * Get health status for all monitored services
 */
export function getAllServiceHealth(): ServiceHealth[] {
  return Array.from(serviceRegistry.values())
}

/**
 * Check if a service is currently healthy
 */
export function isServiceHealthy(serviceName: string): boolean {
  const health = serviceRegistry.get(serviceName)
  return health ? health.healthy : false
}

/**
 * Record a successful service operation
 */
export function recordServiceSuccess(serviceName: string, responseTime?: number): void {
  initializeServiceHealth(serviceName)
  
  const health = serviceRegistry.get(serviceName)!
  health.healthy = true
  health.lastCheck = new Date()
  health.responseTime = responseTime
  health.consecutiveFailures = 0
  
  serviceRegistry.set(serviceName, health)
}

/**
 * Record a service failure
 */
export function recordServiceFailure(serviceName: string, error: string): void {
  initializeServiceHealth(serviceName)
  
  const health = serviceRegistry.get(serviceName)!
  health.lastCheck = new Date()
  health.errorCount += 1
  health.lastError = error
  health.consecutiveFailures += 1
  
  // Mark as unhealthy if consecutive failures exceed threshold
  if (health.consecutiveFailures >= defaultConfig.healthThreshold) {
    health.healthy = false
  }
  
  serviceRegistry.set(serviceName, health)
  
  console.warn(`Service ${serviceName} failure recorded:`, {
    error,
    consecutiveFailures: health.consecutiveFailures,
    healthy: health.healthy
  })
}

/**
 * Perform health check for a service endpoint
 */
export async function performHealthCheck(
  serviceName: string,
  healthCheckFn: () => Promise<boolean>,
  config: Partial<HealthCheckConfig> = {}
): Promise<boolean> {
  const finalConfig = { ...defaultConfig, ...config }
  const startTime = Date.now()
  
  initializeServiceHealth(serviceName)
  
  try {
    // Perform health check with timeout
    const healthCheckPromise = healthCheckFn()
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), finalConfig.timeout)
    })
    
    const isHealthy = await Promise.race([healthCheckPromise, timeoutPromise])
    const responseTime = Date.now() - startTime
    
    if (isHealthy) {
      recordServiceSuccess(serviceName, responseTime)
      return true
    } else {
      recordServiceFailure(serviceName, 'Health check returned false')
      return false
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    recordServiceFailure(serviceName, errorMessage)
    return false
  }
}

/**
 * PO Validation Service Health Check
 */
export async function checkPOValidationHealth(): Promise<boolean> {
  return performHealthCheck('po-validation', async () => {
    try {
      // Perform a lightweight validation check
      const response = await fetch('/api/validation/check-po-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          poNumber: 'HEALTH_CHECK',
          customerId: 'health-check-customer',
          level: 'order'
        })
      })
      
      // We expect this to fail with 401/403 (auth required), but service is responding
      return response.status === 401 || response.status === 403 || response.status === 400
    } catch (error) {
      return false
    }
  })
}

/**
 * Print Queue Service Health Check
 */
export async function checkPrintQueueHealth(): Promise<boolean> {
  return performHealthCheck('print-queue', async () => {
    try {
      // Check if the print queue endpoint is responding
      const response = await fetch('/api/print-queue', {
        method: 'GET'
      })
      
      // We expect this to fail with 401 (auth required), but service is responding
      return response.status === 401 || response.status === 200
    } catch (error) {
      return false
    }
  })
}

/**
 * Database Health Check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  return performHealthCheck('database', async () => {
    try {
      // Use a simple health endpoint that checks database connectivity
      const response = await fetch('/api/health', {
        method: 'GET'
      })
      
      return response.ok
    } catch (error) {
      return false
    }
  })
}

/**
 * Comprehensive system health check
 */
export async function performSystemHealthCheck(): Promise<{
  overall: boolean
  services: ServiceHealth[]
  issues: string[]
  recommendations: string[]
}> {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Check all critical services
  const [poValidationHealthy, printQueueHealthy, databaseHealthy] = await Promise.all([
    checkPOValidationHealth(),
    checkPrintQueueHealth(),
    checkDatabaseHealth()
  ])
  
  // Analyze results
  if (!databaseHealthy) {
    issues.push('Database connectivity issues detected')
    recommendations.push('Check database connection and server status')
  }
  
  if (!poValidationHealthy) {
    issues.push('PO validation service is not responding')
    recommendations.push('PO validation may not work - use manual verification')
  }
  
  if (!printQueueHealthy) {
    issues.push('Print queue service is not responding')
    recommendations.push('Print queue operations may fail - try refreshing the page')
  }
  
  const services = getAllServiceHealth()
  const overall = issues.length === 0
  
  return {
    overall,
    services,
    issues,
    recommendations
  }
}

/**
 * Get fallback recommendations for a failed service
 */
export function getFallbackRecommendations(serviceName: string): {
  canContinue: boolean
  fallbackActions: string[]
  userGuidance: string[]
} {
  switch (serviceName) {
    case 'po-validation':
      return {
        canContinue: true,
        fallbackActions: [
          'Skip automatic PO validation',
          'Use manual verification process',
          'Show warning about manual verification needed'
        ],
        userGuidance: [
          'PO validation is temporarily unavailable',
          'Please manually verify that this PO number is not already in use',
          'Check existing orders and items before proceeding'
        ]
      }
      
    case 'print-queue':
      return {
        canContinue: false,
        fallbackActions: [
          'Disable print queue operations',
          'Show service unavailable message',
          'Suggest manual printing process'
        ],
        userGuidance: [
          'Print queue service is temporarily unavailable',
          'Please print packing slips manually from individual orders',
          'Contact IT support if the problem persists'
        ]
      }
      
    case 'database':
      return {
        canContinue: false,
        fallbackActions: [
          'Show system maintenance message',
          'Disable all data operations',
          'Suggest trying again later'
        ],
        userGuidance: [
          'System is temporarily unavailable due to database issues',
          'Please try again in a few minutes',
          'Contact IT support if the problem persists'
        ]
      }
      
    default:
      return {
        canContinue: false,
        fallbackActions: [
          'Show generic error message',
          'Suggest page refresh',
          'Recommend contacting support'
        ],
        userGuidance: [
          'A system service is temporarily unavailable',
          'Please refresh the page and try again',
          'Contact support if the problem continues'
        ]
      }
  }
}

/**
 * Auto-recovery mechanism for services
 */
export async function attemptServiceRecovery(serviceName: string): Promise<boolean> {
  const health = getServiceHealth(serviceName)
  if (!health || health.healthy) {
    return true // Already healthy or not monitored
  }
  
  console.log(`Attempting recovery for service: ${serviceName}`)
  
  // Wait a bit before attempting recovery
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Attempt health check
  let recovered = false
  switch (serviceName) {
    case 'po-validation':
      recovered = await checkPOValidationHealth()
      break
    case 'print-queue':
      recovered = await checkPrintQueueHealth()
      break
    case 'database':
      recovered = await checkDatabaseHealth()
      break
  }
  
  if (recovered) {
    console.log(`Service ${serviceName} recovered successfully`)
  } else {
    console.warn(`Service ${serviceName} recovery failed`)
  }
  
  return recovered
}

/**
 * Start periodic health monitoring
 */
export function startHealthMonitoring(intervalMs: number = 60000): () => void {
  const interval = setInterval(async () => {
    try {
      await performSystemHealthCheck()
    } catch (error) {
      console.error('Health monitoring error:', error)
    }
  }, intervalMs)
  
  // Return cleanup function
  return () => clearInterval(interval)
}

/**
 * Reset service health status (useful for testing or manual recovery)
 */
export function resetServiceHealth(serviceName: string): void {
  if (serviceRegistry.has(serviceName)) {
    const health = serviceRegistry.get(serviceName)!
    health.healthy = true
    health.errorCount = 0
    health.consecutiveFailures = 0
    health.lastError = undefined
    health.lastCheck = new Date()
    serviceRegistry.set(serviceName, health)
    
    console.log(`Service ${serviceName} health status reset`)
  }
}

/**
 * Clear all service health data
 */
export function clearAllServiceHealth(): void {
  serviceRegistry.clear()
  console.log('All service health data cleared')
}