import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PriorityItem from '~/components/warehouse/PriorityItem.vue'

// Mock Icon component
vi.mock('#components', () => ({
  Icon: {
    name: 'Icon',
    template: '<span data-testid="icon" :class="name"></span>',
    props: ['name']
  }
}))

describe('PriorityItem', () => {
  const createMockItem = (overrides = {}) => ({
    id: '1',
    orderNumber: 'ORD-001',
    itemName: 'Test Item',
    customerName: 'Test Customer',
    status: 'PENDING',
    isUrgent: false,
    createdAt: '2024-01-01T10:00:00Z',
    orderCreatedAt: '2024-01-01T09:00:00Z',
    ...overrides
  })

  const createWrapper = (item = createMockItem()) => {
    return mount(PriorityItem, {
      props: { item }
    })
  }

  it('should render item information correctly', () => {
    const item = createMockItem({
      orderNumber: 'ORD-123',
      customerName: 'John Doe',
      itemName: 'Custom Seat Cover'
    })
    
    const wrapper = createWrapper(item)
    
    expect(wrapper.text()).toContain('ORD-123')
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('Custom Seat Cover')
  })

  it('should display status badge with correct styling', () => {
    const item = createMockItem({ status: 'CUTTING' })
    const wrapper = createWrapper(item)
    
    const statusBadge = wrapper.find('.status-badge')
    expect(statusBadge.exists()).toBe(true)
    expect(statusBadge.classes()).toContain('bg-blue-100')
    expect(statusBadge.classes()).toContain('text-blue-800')
  })

  it('should show urgency indicator for urgent items', () => {
    const item = createMockItem({ isUrgent: true })
    const wrapper = createWrapper(item)
    
    const urgencyIndicator = wrapper.find('.urgency-indicator')
    expect(urgencyIndicator.exists()).toBe(true)
    
    const fireIcon = urgencyIndicator.find('[data-testid="icon"]')
    expect(fireIcon.exists()).toBe(true)
  })

  it('should not show urgency indicator for non-urgent items', () => {
    const item = createMockItem({ isUrgent: false })
    const wrapper = createWrapper(item)
    
    const urgencyIndicator = wrapper.find('.urgency-indicator')
    expect(urgencyIndicator.exists()).toBe(false)
  })

  it('should apply urgent styling for urgent items', () => {
    const item = createMockItem({ isUrgent: true })
    const wrapper = createWrapper(item)
    
    const priorityItem = wrapper.find('.priority-item')
    expect(priorityItem.classes()).toContain('border-red-500')
    expect(priorityItem.classes()).toContain('bg-red-900/20')
  })

  it('should emit refocus event when clicked', async () => {
    const wrapper = createWrapper()
    
    await wrapper.find('.priority-item').trigger('click')
    
    expect(wrapper.emitted('refocus')).toHaveLength(1)
  })

  it('should format date correctly for recent items', () => {
    // Mock current time to be 2 hours after creation
    const createdAt = '2024-01-01T10:00:00Z'
    const item = createMockItem({ createdAt })
    
    const wrapper = createWrapper(item)
    
    expect(wrapper.text()).toContain('2h ago')
  })

  it('should handle different status types correctly', () => {
    const statuses = ['PENDING', 'CUTTING', 'NOT_STARTED_PRODUCTION']
    
    statuses.forEach(status => {
      const item = createMockItem({ status })
      const wrapper = createWrapper(item)
      
      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text().length).toBeGreaterThan(0)
    })
  })

  it('should truncate long item names', () => {
    const item = createMockItem({ 
      itemName: 'This is a very long item name that should be truncated to prevent layout issues'
    })
    const wrapper = createWrapper(item)
    
    const itemName = wrapper.find('.item-name')
    expect(itemName.classes()).toContain('truncate')
  })
})