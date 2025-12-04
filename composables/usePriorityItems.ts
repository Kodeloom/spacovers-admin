import { usePriorityItemsPerformance } from '~/utils/priorityItemsPerformance';

interface PriorityItem {
  id: string;
  orderNumber: string;
  itemName: string; // Now contains attribute description (e.g., "Spa Cover, Navy Blue, Size: 84, Shape: Round")
  customerName: string;
  status: 'NOT_STARTED_PRODUCTION' | 'CUTTING' | 'SEWING' | 'FOAM_CUTTING' | 'STUFFING' | 'PACKAGING' | 'PRODUCT_FINISHED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW'; // Priority level for grouping
  isUrgent: boolean; // True only for HIGH priority orders
  createdAt: string;
  orderCreatedAt: string;
  estimatedDueDate?: string;
}

interface PriorityItemsResponse {
  success: boolean;
  data: PriorityItem[];
  meta: {
    totalCount: number;
    lastUpdated: string;
  };
  error?: string;
}

interface PriorityItemsState {
  items: PriorityItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  scrollPosition: number;
}

// Event types for real-time updates
interface ItemStatusChangeEvent {
  orderItemId: string;
  fromStatus: string;
  toStatus: string;
  orderNumber?: string;
  itemName?: string;
}

export const usePriorityItems = () => {
  const state = reactive<PriorityItemsState>({
    items: [],
    loading: false,
    error: null,
    lastUpdated: null,
    scrollPosition: 0
  });

  let refreshInterval: NodeJS.Timeout | null = null;
  let eventListeners: Array<() => void> = [];
  let debounceTimeout: NodeJS.Timeout | null = null;

  // Performance monitoring integration
  const { 
    startApiTimer, 
    startRenderTimer, 
    recordMetrics, 
    shouldUseVirtualScrolling,
    getOptimalRefreshInterval 
  } = usePriorityItemsPerformance();

  const fetchPriorityItems = async (preserveScrollPosition = false) => {
    // Start performance timing
    const endApiTimer = startApiTimer();
    const endRenderTimer = startRenderTimer();
    
    try {
      // Only show loading for initial fetch, not for real-time updates
      // Requirements: 8.1 - Ensure priority panel doesn't delay scan input initialization
      if (!preserveScrollPosition) {
        state.loading = true;
      }
      state.error = null;
      
      const response = await $fetch<PriorityItemsResponse>('/api/warehouse/priority-items');
      const apiTime = endApiTimer();
      
      if (response.success) {
        // Store current scroll position if preserving
        const currentScrollPosition = preserveScrollPosition ? state.scrollPosition : 0;
        
        state.items = response.data;
        state.lastUpdated = new Date();
        
        // Restore scroll position after update if requested
        if (preserveScrollPosition && currentScrollPosition > 0) {
          nextTick(() => {
            const scrollContainer = document.querySelector('.priority-items-scroll, .virtual-scroll-container');
            if (scrollContainer) {
              scrollContainer.scrollTop = currentScrollPosition;
            }
          });
        }
        
        // Record performance metrics
        const renderTime = endRenderTimer();
        const useVirtualScrolling = shouldUseVirtualScrolling(response.data.length);
        recordMetrics(apiTime, renderTime, response.data.length, useVirtualScrolling);
        
      } else {
        throw new Error(response.error || 'Failed to fetch priority items');
      }
    } catch (error: any) {
      // Check if this is an authentication error
      const isAuthError = error?.statusCode === 401 || 
                         error?.status === 401 || 
                         error?.message?.includes('Unauthorized') ||
                         error?.message?.includes('Authentication required') ||
                         error?.data?.statusMessage === 'Unauthorized';
      
      if (isAuthError) {
        console.warn('Priority items: Authentication failed - stopping auto-refresh and reloading page');
        // Stop auto-refresh on auth errors to prevent log spam
        stopAutoRefresh();
        state.error = 'Session expired. The page will reload to login again.';
        
        // Trigger page reload after a short delay to force re-authentication
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 2000);
      } else {
        console.error('Failed to fetch priority items:', error);
        state.error = error instanceof Error ? error.message : 'Failed to load priority items';
        
        // Only retry on non-auth errors
        setTimeout(() => {
          if (state.error && !isAuthError) {
            fetchPriorityItems(preserveScrollPosition);
          }
        }, 5000);
      }
      
      // Record failed API call
      const apiTime = endApiTimer();
      recordMetrics(apiTime, 0, 0, false);
    } finally {
      state.loading = false;
    }
  };

  // Handle scroll position tracking
  const updateScrollPosition = (position: number) => {
    state.scrollPosition = position;
  };

  // Debounced refresh to prevent excessive API calls during rapid scanning
  const debouncedRefresh = (preserveScrollPosition = true) => {
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // Set new timeout for debounced refresh
    debounceTimeout = setTimeout(() => {
      fetchPriorityItems(preserveScrollPosition);
    }, 1000); // 1 second debounce
  };

  // Handle item status change events for real-time updates
  const handleItemStatusChange = (event: ItemStatusChangeEvent) => {
    console.log('Priority items: Handling status change event', event);
    
    // Check if this status change affects priority items
    const priorityStatuses = ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED'];
    const affectsPriorityList = 
      // Item moving into priority status (any production stage)
      priorityStatuses.includes(event.toStatus) ||
      // Item moving out of priority status (completed or cancelled)
      priorityStatuses.includes(event.fromStatus);
    
    if (affectsPriorityList) {
      console.log('Priority items: Status change affects priority list, refreshing...');
      // Use debounced refresh to prevent excessive API calls
      // Requirements: 5.1, 5.2 - Add automatic updates when items change status
      debouncedRefresh(true);
    }
  };

  // Set up event listeners for real-time updates
  const setupEventListeners = () => {
    // Listen for custom events from scan processing
    const handleScanProcessed = (event: CustomEvent) => {
      if (event.detail?.itemStatusChange) {
        handleItemStatusChange(event.detail.itemStatusChange);
      }
    };

    // Listen for item status change events
    const handleItemStatusChangeEvent = (event: CustomEvent) => {
      handleItemStatusChange(event.detail);
    };

    document.addEventListener('scanProcessed', handleScanProcessed as EventListener);
    document.addEventListener('itemStatusChanged', handleItemStatusChangeEvent as EventListener);

    // Store cleanup functions
    eventListeners.push(
      () => document.removeEventListener('scanProcessed', handleScanProcessed as EventListener),
      () => document.removeEventListener('itemStatusChanged', handleItemStatusChangeEvent as EventListener)
    );
  };

  const startAutoRefresh = () => {
    // Clear any existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    // Use performance-optimized refresh interval
    // Requirements: 8.3, 8.5 - Optimize refresh based on performance metrics
    const optimalInterval = getOptimalRefreshInterval();
    
    // Set up auto-refresh with optimal interval and scroll position preservation
    refreshInterval = setInterval(() => {
      fetchPriorityItems(true);
    }, optimalInterval);
    
    console.log(`Priority items auto-refresh started with ${optimalInterval}ms interval`);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };

  const cleanup = () => {
    stopAutoRefresh();
    
    // Clear debounce timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    
    // Remove all event listeners
    eventListeners.forEach(cleanup => cleanup());
    eventListeners = [];
  };

  const refresh = () => {
    return fetchPriorityItems(true);
  };

  // Trigger immediate refresh when scan processing completes
  const refreshOnScanComplete = (itemStatusChange?: ItemStatusChangeEvent) => {
    if (itemStatusChange) {
      handleItemStatusChange(itemStatusChange);
    } else {
      // Fallback: use debounced refresh to prevent excessive calls
      debouncedRefresh(true);
    }
  };

  // Lazy initialization to prevent delaying scan input
  // Requirements: 8.1 - Ensure priority panel doesn't delay scan input initialization
  const initialize = async (immediate = false) => {
    if (immediate) {
      // Immediate initialization for testing or when explicitly requested
      await fetchPriorityItems();
      setupEventListeners();
      startAutoRefresh();
    } else {
      // Lazy initialization - set up listeners first, then fetch after a delay
      setupEventListeners();
      
      // Delay initial fetch to allow scan input to initialize first
      setTimeout(async () => {
        await fetchPriorityItems();
        startAutoRefresh();
      }, 100); // Small delay to ensure scan input is ready
    }
  };

  // Cleanup function for component unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    // Reactive state (readonly to prevent external mutations)
    priorityItems: readonly(toRef(state, 'items')),
    loading: readonly(toRef(state, 'loading')),
    error: readonly(toRef(state, 'error')),
    lastUpdated: readonly(toRef(state, 'lastUpdated')),
    
    // Performance-related computed properties
    shouldUseVirtualScrolling: computed(() => shouldUseVirtualScrolling(state.items.length)),
    
    // Methods
    fetchPriorityItems,
    refresh,
    initialize,
    startAutoRefresh,
    stopAutoRefresh,
    updateScrollPosition,
    refreshOnScanComplete,
    cleanup
  };
};