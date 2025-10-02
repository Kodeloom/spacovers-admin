# Warehouse Priority Items Display - Design Document

## Overview

This design document outlines the technical implementation for adding a priority order items display panel to the warehouse kiosk interface. The solution will split the current full-width kiosk layout into a two-panel design: scanning functionality on the left (60%) and a scrollable priority items list on the right (40%). The design ensures the scan input remains the primary focused element while providing real-time visibility into urgent order items.

## Architecture

### Current System Integration
- **Frontend**: Vue.js component modification of existing `pages/warehouse/kiosk.vue`
- **Backend**: New API endpoint for priority items data
- **Database**: Existing Prisma models (Order, OrderItem, ItemProcessingLog)
- **Real-time Updates**: Polling mechanism for priority list updates
- **Focus Management**: Enhanced focus control system

### New Components
- **PriorityItemsPanel**: Vue component for the right-side priority display
- **Priority Items API**: Backend endpoint for filtered priority items
- **Focus Guard Service**: Enhanced focus management utility
- **Priority Items Composable**: Vue composable for priority items state management

## Components and Interfaces

### 1. Priority Items Panel Component (`components/warehouse/PriorityItemsPanel.vue`)

```vue
<template>
  <div class="priority-panel">
    <div class="priority-header">
      <Icon name="heroicons:exclamation-triangle" class="h-6 w-6 text-orange-500" />
      <h3 class="text-lg font-semibold text-white">Priority Items</h3>
      <span class="text-sm text-gray-300">({{ priorityItems.length }})</span>
    </div>
    
    <div class="priority-list-container" @click="$emit('refocus')">
      <div v-if="loading" class="loading-state">
        <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6" />
        <span>Loading priority items...</span>
      </div>
      
      <div v-else-if="priorityItems.length === 0" class="empty-state">
        <Icon name="heroicons:check-circle" class="h-12 w-12 text-green-400" />
        <p class="text-gray-300">No urgent items</p>
        <p class="text-sm text-gray-400">All items are on track</p>
      </div>
      
      <div v-else class="priority-items-scroll" @scroll="$emit('refocus')">
        <PriorityItem 
          v-for="item in priorityItems" 
          :key="item.id"
          :item="item"
          @click="$emit('refocus')"
        />
      </div>
    </div>
  </div>
</template>
```

### 2. Priority Item Component (`components/warehouse/PriorityItem.vue`)

```vue
<template>
  <div class="priority-item" :class="{ 'urgent': item.isUrgent }" @click="$emit('refocus')">
    <div class="item-header">
      <div class="order-info">
        <span class="order-number">{{ item.orderNumber }}</span>
        <span class="customer-name">{{ item.customerName }}</span>
      </div>
      <div class="urgency-indicator" v-if="item.isUrgent">
        <Icon name="heroicons:fire" class="h-4 w-4 text-red-500" />
      </div>
    </div>
    
    <div class="item-details">
      <p class="item-name">{{ item.itemName }}</p>
      <div class="status-info">
        <span class="status-badge" :class="getStatusClass(item.status)">
          {{ getStatusDisplayName(item.status) }}
        </span>
        <span class="created-date">{{ formatDate(item.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>
```

### 3. Priority Items Composable (`composables/usePriorityItems.ts`)

```typescript
interface PriorityItem {
  id: string;
  orderNumber: string;
  itemName: string;
  customerName: string;
  status: string;
  isUrgent: boolean;
  createdAt: Date;
  orderCreatedAt: Date;
}

interface PriorityItemsState {
  items: PriorityItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const usePriorityItems = () => {
  const state = reactive<PriorityItemsState>({
    items: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  const fetchPriorityItems = async () => {
    try {
      state.loading = true;
      state.error = null;
      
      const response = await $fetch('/api/warehouse/priority-items');
      
      if (response.success) {
        state.items = response.data;
        state.lastUpdated = new Date();
      }
    } catch (error) {
      console.error('Failed to fetch priority items:', error);
      state.error = 'Failed to load priority items';
    } finally {
      state.loading = false;
    }
  };

  // Auto-refresh every 30 seconds
  const refreshInterval = setInterval(fetchPriorityItems, 30000);

  onUnmounted(() => {
    clearInterval(refreshInterval);
  });

  return {
    priorityItems: readonly(toRef(state, 'items')),
    loading: readonly(toRef(state, 'loading')),
    error: readonly(toRef(state, 'error')),
    lastUpdated: readonly(toRef(state, 'lastUpdated')),
    fetchPriorityItems,
    refresh: fetchPriorityItems
  };
};
```

### 4. Enhanced Focus Guard (`utils/focusGuard.ts`)

```typescript
export class FocusGuard {
  private targetElement: HTMLElement | null = null;
  private checkInterval: number | null = null;
  private isActive = false;

  constructor(private intervalMs = 300) {}

  startGuarding(element: HTMLElement) {
    this.targetElement = element;
    this.isActive = true;
    
    // Immediate focus
    this.focusTarget();
    
    // Set up interval checking
    this.checkInterval = setInterval(() => {
      if (this.isActive && this.shouldRefocus()) {
        this.focusTarget();
      }
    }, this.intervalMs);

    // Add global click handler
    document.addEventListener('click', this.handleGlobalClick);
    document.addEventListener('scroll', this.handleGlobalScroll, true);
  }

  stopGuarding() {
    this.isActive = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('scroll', this.handleGlobalScroll, true);
  }

  private shouldRefocus(): boolean {
    return this.targetElement && 
           document.activeElement !== this.targetElement &&
           !this.isLogoutButton(document.activeElement as HTMLElement);
  }

  private focusTarget() {
    if (this.targetElement && this.isActive) {
      this.targetElement.focus();
    }
  }

  private handleGlobalClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!this.isLogoutButton(target)) {
      setTimeout(() => this.focusTarget(), 10);
    }
  };

  private handleGlobalScroll = () => {
    setTimeout(() => this.focusTarget(), 10);
  };

  private isLogoutButton(element: HTMLElement): boolean {
    return element?.closest('button[data-logout]') !== null;
  }
}
```

## Data Models

### 1. Priority Items API Response

```typescript
interface PriorityItemsResponse {
  success: boolean;
  data: PriorityItem[];
  meta: {
    totalCount: number;
    lastUpdated: string;
  };
}

interface PriorityItem {
  id: string;
  orderNumber: string;
  itemName: string;
  customerName: string;
  status: 'PENDING' | 'CUTTING';
  isUrgent: boolean;
  createdAt: string;
  orderCreatedAt: string;
  estimatedDueDate?: string;
}
```

### 2. Database Query Structure

```typescript
// Priority items query with proper filtering and sorting
const priorityItemsQuery = {
  where: {
    itemStatus: {
      in: ['PENDING', 'CUTTING']
    },
    order: {
      orderStatus: {
        not: 'CANCELLED'
      }
    }
  },
  include: {
    order: {
      select: {
        orderNumber: true,
        customerName: true,
        createdAt: true,
        isUrgent: true,
        estimatedDueDate: true
      }
    }
  },
  orderBy: [
    { order: { isUrgent: 'desc' } },
    { order: { createdAt: 'asc' } },
    { createdAt: 'asc' }
  ],
  take: 50 // Limit for performance
};
```

## Error Handling

### 1. API Error Handling

```typescript
// Priority Items API with comprehensive error handling
export default defineEventHandler(async (event) => {
  try {
    const priorityItems = await prisma.orderItem.findMany(priorityItemsQuery);
    
    const formattedItems = priorityItems.map(item => ({
      id: item.id,
      orderNumber: item.order.orderNumber,
      itemName: item.itemName,
      customerName: item.order.customerName,
      status: item.itemStatus,
      isUrgent: item.order.isUrgent || false,
      createdAt: item.createdAt.toISOString(),
      orderCreatedAt: item.order.createdAt.toISOString(),
      estimatedDueDate: item.order.estimatedDueDate?.toISOString()
    }));

    return {
      success: true,
      data: formattedItems,
      meta: {
        totalCount: formattedItems.length,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Priority items API error:', error);
    
    return {
      success: false,
      error: 'Failed to fetch priority items',
      data: [],
      meta: {
        totalCount: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }
});
```

### 2. Frontend Error Recovery

```typescript
// Graceful error handling in the composable
const handleError = (error: Error) => {
  console.error('Priority items error:', error);
  
  // Show user-friendly error state
  state.error = 'Unable to load priority items';
  
  // Retry after delay
  setTimeout(() => {
    if (state.error) {
      fetchPriorityItems();
    }
  }, 5000);
};
```

## Testing Strategy

### 1. Component Testing

```typescript
describe('PriorityItemsPanel', () => {
  it('should display priority items correctly', async () => {
    const mockItems = createMockPriorityItems();
    
    const wrapper = mount(PriorityItemsPanel, {
      props: { priorityItems: mockItems }
    });
    
    expect(wrapper.findAll('.priority-item')).toHaveLength(mockItems.length);
  });

  it('should emit refocus on click interactions', async () => {
    const wrapper = mount(PriorityItemsPanel);
    
    await wrapper.find('.priority-list-container').trigger('click');
    
    expect(wrapper.emitted('refocus')).toBeTruthy();
  });

  it('should show empty state when no items', () => {
    const wrapper = mount(PriorityItemsPanel, {
      props: { priorityItems: [] }
    });
    
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No urgent items');
  });
});
```

### 2. Focus Management Testing

```typescript
describe('FocusGuard', () => {
  let focusGuard: FocusGuard;
  let mockInput: HTMLInputElement;

  beforeEach(() => {
    mockInput = document.createElement('input');
    document.body.appendChild(mockInput);
    focusGuard = new FocusGuard(100); // Faster interval for testing
  });

  it('should maintain focus on target element', async () => {
    focusGuard.startGuarding(mockInput);
    
    // Simulate focus loss
    const otherElement = document.createElement('div');
    otherElement.focus();
    
    // Wait for focus guard to act
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(document.activeElement).toBe(mockInput);
  });

  it('should not interfere with logout button', () => {
    const logoutButton = document.createElement('button');
    logoutButton.setAttribute('data-logout', '');
    
    focusGuard.startGuarding(mockInput);
    logoutButton.click();
    
    // Focus should not return to input when logout is clicked
    expect(document.activeElement).not.toBe(mockInput);
  });
});
```

### 3. Integration Testing

```typescript
describe('Kiosk Priority Items Integration', () => {
  it('should maintain scan functionality with priority panel', async () => {
    const { wrapper } = await mountKioskWithPriorityPanel();
    
    // Simulate barcode scan
    const barcodeInput = wrapper.find('input[type="text"]');
    await barcodeInput.setValue('TEST-12345-ABCDEF');
    await barcodeInput.trigger('keyup.enter');
    
    // Verify scan processing works
    expect(wrapper.vm.isProcessing).toBe(true);
    
    // Verify priority panel doesn't interfere
    expect(document.activeElement).toBe(barcodeInput.element);
  });
});
```

## Performance Considerations

### 1. Efficient Data Fetching
- Limit priority items query to 50 items maximum
- Use database indexes on `itemStatus` and `order.isUrgent` fields
- Implement proper pagination if needed for large datasets

### 2. Optimized Rendering
- Use `v-for` with proper keys for efficient list updates
- Implement virtual scrolling if item count exceeds 100
- Debounce scroll events to prevent excessive focus calls

### 3. Memory Management
- Clear intervals on component unmount
- Remove event listeners properly
- Use `readonly` refs to prevent unnecessary reactivity

## Security Considerations

### 1. Data Access Control
- Ensure priority items API respects user permissions
- Validate user has warehouse access before showing priority items
- Filter items based on user's assigned stations if applicable

### 2. Input Validation
- Validate all API parameters
- Sanitize item names and customer data for display
- Implement rate limiting on priority items endpoint

This design provides a comprehensive approach to implementing the priority items display while maintaining the integrity and performance of the existing warehouse kiosk system.