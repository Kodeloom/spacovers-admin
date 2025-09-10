import { vi } from 'vitest'

// Mock environment variables for testing
process.env.QBO_CLIENT_ID = 'test-client-id'
process.env.QBO_CLIENT_SECRET = 'test-client-secret'
process.env.QBO_ENVIRONMENT = 'sandbox'
process.env.DATABASE_URL = 'file:./test.db'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock Date.now for consistent testing
const mockDate = new Date('2024-01-01T12:00:00Z')
vi.setSystemTime(mockDate)