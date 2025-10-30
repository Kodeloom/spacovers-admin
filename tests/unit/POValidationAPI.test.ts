import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEvent } from 'h3'
import checkPODuplicateHandler from '~/server/api/validation/check-po-duplicate.post'
import getOrdersByPOHandler from '~/server/api/orders/by-po/[poNumber]/[customerId].get'

// Mock the auth module
vi.mock('~/server/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn()
    }
  }
}))

// Mock the PO validation service
vi.mock('~/server/lib/POValidationService', () => ({
  poValidationService: {
    checkOrderLevelDuplicate: vi.fn(),
    checkItemLevelDuplicate: vi.fn()
  }
}))

// Mock the database client
vi.mock('~/server/lib/db', () => ({
  getEnhancedPrismaClient: vi.fn()
}))

describe('PO Validation API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/validation/check-po-duplicate', () => {
    it('should require authentication', async () => {
      const { auth } = await import('~/server/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const event = createEvent({
        method: 'POST',
        url: '/api/validation/check-po-duplicate',
        body: JSON.stringify({
          poNumber: 'PO123',
          customerId: 'customer123',
          level: 'order'
        })
      })

      await expect(checkPODuplicateHandler(event)).rejects.toThrow('Unauthorized')
    })

    it('should require proper authorization', async () => {
      const { auth } = await import('~/server/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: 'user123',
          roles: [{ role: { name: 'Warehouse Staff' } }]
        }
      })

      const event = createEvent({
        method: 'POST',
        url: '/api/validation/check-po-duplicate',
        body: JSON.stringify({
          poNumber: 'PO123',
          customerId: 'customer123',
          level: 'order'
        })
      })

      await expect(checkPODuplicateHandler(event)).rejects.toThrow('Insufficient permissions')
    })

    it('should validate request body', async () => {
      const { auth } = await import('~/server/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: 'user123',
          roles: [{ role: { name: 'Office Employee' } }]
        }
      })

      const event = createEvent({
        method: 'POST',
        url: '/api/validation/check-po-duplicate',
        body: JSON.stringify({
          poNumber: '',
          customerId: 'invalid-id',
          level: 'invalid'
        })
      })

      await expect(checkPODuplicateHandler(event)).rejects.toThrow('Validation failed')
    })

    it('should call order level validation service', async () => {
      const { auth } = await import('~/server/lib/auth')
      const { poValidationService } = await import('~/server/lib/POValidationService')
      
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: 'user123',
          roles: [{ role: { name: 'Office Employee' } }]
        }
      })

      vi.mocked(poValidationService.checkOrderLevelDuplicate).mockResolvedValue({
        isDuplicate: false
      })

      const event = createEvent({
        method: 'POST',
        url: '/api/validation/check-po-duplicate',
        body: JSON.stringify({
          poNumber: 'PO123',
          customerId: 'cm123456789012345678',
          level: 'order'
        })
      })

      const result = await checkPODuplicateHandler(event)

      expect(poValidationService.checkOrderLevelDuplicate).toHaveBeenCalledWith(
        'PO123',
        'cm123456789012345678',
        undefined
      )
      expect(result).toEqual({
        success: true,
        data: { isDuplicate: false }
      })
    })

    it('should call item level validation service', async () => {
      const { auth } = await import('~/server/lib/auth')
      const { poValidationService } = await import('~/server/lib/POValidationService')
      
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: 'user123',
          roles: [{ role: { name: 'Admin' } }]
        }
      })

      vi.mocked(poValidationService.checkItemLevelDuplicate).mockResolvedValue({
        isDuplicate: true,
        existingItems: [],
        warningMessage: 'Duplicate found'
      })

      const event = createEvent({
        method: 'POST',
        url: '/api/validation/check-po-duplicate',
        body: JSON.stringify({
          poNumber: 'PO123',
          customerId: 'cm123456789012345678',
          level: 'item',
          excludeOrderItemId: 'oi123456789012345678'
        })
      })

      const result = await checkPODuplicateHandler(event)

      expect(poValidationService.checkItemLevelDuplicate).toHaveBeenCalledWith(
        'PO123',
        'cm123456789012345678',
        'oi123456789012345678'
      )
      expect(result).toEqual({
        success: true,
        data: {
          isDuplicate: true,
          existingItems: [],
          warningMessage: 'Duplicate found'
        }
      })
    })
  })

  describe('GET /api/orders/by-po/[poNumber]/[customerId]', () => {
    it('should require authentication', async () => {
      const { auth } = await import('~/server/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const event = createEvent({
        method: 'GET',
        url: '/api/orders/by-po/PO123/customer123'
      })

      // Mock route parameters
      event.context.params = {
        poNumber: 'PO123',
        customerId: 'customer123'
      }

      await expect(getOrdersByPOHandler(event)).rejects.toThrow('Unauthorized')
    })

    it('should require proper authorization', async () => {
      const { auth } = await import('~/server/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: 'user123',
          roles: [{ role: { name: 'Warehouse Staff' } }]
        }
      })

      const event = createEvent({
        method: 'GET',
        url: '/api/orders/by-po/PO123/customer123'
      })

      event.context.params = {
        poNumber: 'PO123',
        customerId: 'customer123'
      }

      await expect(getOrdersByPOHandler(event)).rejects.toThrow('Insufficient permissions')
    })

    it('should validate route parameters', async () => {
      const { auth } = await import('~/server/lib/auth')
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          id: 'user123',
          roles: [{ role: { name: 'Office Employee' } }]
        }
      })

      const event = createEvent({
        method: 'GET',
        url: '/api/orders/by-po//invalid-id'
      })

      event.context.params = {
        poNumber: '',
        customerId: 'invalid-id'
      }

      await expect(getOrdersByPOHandler(event)).rejects.toThrow('Invalid parameters')
    })
  })
})