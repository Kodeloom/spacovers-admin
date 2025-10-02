<template>
  <div class="priority-panel h-full flex flex-col bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
    <!-- Header with priority items count and icon - matches kiosk header styling -->
    <div class="priority-header flex items-center justify-between p-6 lg:p-8 border-b border-gray-700">
      <div class="flex items-center gap-3">
        <Icon name="heroicons:exclamation-triangle" class="h-6 w-6 lg:h-8 lg:w-8 text-orange-400" />
        <h3 class="text-lg lg:text-xl font-bold text-white">Priority Items</h3>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm lg:text-base text-gray-300 bg-gray-700 px-3 py-1 rounded-full font-medium">
          {{ priorityItems.length }}
        </span>
        <Icon name="heroicons:clock" class="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
      </div>
    </div>
    
    <!-- Scrollable container with loading and empty states -->
    <div 
      ref="containerRef"
      class="priority-list-container flex-1 overflow-hidden" 
      @click="handlePanelClick"
    >
      <!-- Loading state - matches kiosk loading patterns -->
      <div v-if="loading" class="loading-state flex flex-col items-center justify-center h-full p-6 lg:p-8">
        <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 lg:h-12 lg:w-12 text-blue-400 mb-4" />
        <span class="text-gray-300 text-base lg:text-lg font-medium">Loading priority items...</span>
        <span class="text-gray-400 text-sm mt-2">Fetching urgent orders</span>
      </div>
      
      <!-- Empty state - matches kiosk success state styling -->
      <div v-else-if="priorityItems.length === 0" class="empty-state flex flex-col items-center justify-center h-full p-6 lg:p-8 text-center">
        <Icon name="heroicons:check-circle" class="h-16 w-16 lg:h-20 lg:w-20 text-green-400 mb-6" />
        <p class="text-white text-lg lg:text-xl font-bold mb-2">All Clear!</p>
        <p class="text-gray-300 text-base lg:text-lg mb-1">No urgent items</p>
        <p class="text-gray-400 text-sm lg:text-base">Everything is on track</p>
      </div>
      
      <!-- Priority items list with virtual scrolling for performance -->
      <div v-else class="priority-items-container h-full p-4 lg:p-6">
        <!-- Use virtual scrolling based on performance optimization -->
        <VirtualScrollList
          v-if="shouldUseVirtualScrolling"
          :items="priorityItems"
          :item-height="120"
          :container-height="containerHeight"
          :get-item-key="(item) => item.id"
          :overscan="3"
          class="space-y-3"
          @scroll="handleVirtualScroll"
        >
          <template #default="{ item }">
            <div class="mb-3">
              <PriorityItem 
                :item="item"
                @refocus="handleItemClick"
              />
            </div>
          </template>
        </VirtualScrollList>
        
        <!-- Regular scrolling for smaller lists -->
        <div 
          v-else
          class="priority-items-scroll overflow-y-auto h-full space-y-3" 
          @scroll="handleScroll"
        >
          <PriorityItem 
            v-for="item in priorityItems" 
            :key="item.id"
            :item="item"
            @refocus="handleItemClick"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import PriorityItem from './PriorityItem.vue';
import VirtualScrollList from './VirtualScrollList.vue';

interface PriorityItem {
  id: string;
  orderNumber: string;
  itemName: string; // Now contains attribute description
  customerName: string;
  status: string;
  isUrgent: boolean; // Always true for HIGH priority orders
  createdAt: string;
  orderCreatedAt: string;
}

interface Props {
  priorityItems: PriorityItem[];
  loading?: boolean;
  shouldUseVirtualScrolling?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  shouldUseVirtualScrolling: false
});

// Emit refocus event to maintain scan input focus and scroll position updates
const emit = defineEmits<{
  refocus: [];
  scrollPositionUpdate: [position: number];
}>();

// Click handlers to maintain scan input focus
const handlePanelClick = () => {
  emit('refocus');
};

const handleItemClick = () => {
  emit('refocus');
};

// Container height calculation for virtual scrolling
const containerHeight = ref(400); // Default height
const containerRef = ref<HTMLElement>();

// Update container height on mount and resize
onMounted(() => {
  updateContainerHeight();
  window.addEventListener('resize', updateContainerHeight);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight);
});

const updateContainerHeight = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    containerHeight.value = Math.max(300, rect.height - 100); // Account for padding
  }
};

// Throttle scroll events to prevent excessive updates
let scrollTimeout: NodeJS.Timeout | null = null;

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  const scrollPosition = target.scrollTop;
  
  // Emit scroll position for preservation during updates
  // Requirements: 5.5 - Maintain scroll position during updates when possible
  emit('scrollPositionUpdate', scrollPosition);
  
  // Throttle refocus events to prevent excessive focus calls
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(() => {
    // Emit refocus after scroll to ensure scan input remains focused
    // Requirements: 5.4 - Ensure updates don't disrupt scan input focus
    emit('refocus');
  }, 100);
};

// Handle virtual scroll events
const handleVirtualScroll = (scrollTop: number) => {
  // Emit scroll position for preservation during updates
  emit('scrollPositionUpdate', scrollTop);
  
  // Throttle refocus events
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(() => {
    emit('refocus');
  }, 100);
};
</script>

<style scoped>
.priority-panel {
  min-height: 0; /* Allows flex child to shrink */
}

.priority-items-scroll {
  /* Enhanced scrollbar styling to match kiosk design */
  scrollbar-width: thin;
  scrollbar-color: #6B7280 #374151;
}

.priority-items-scroll::-webkit-scrollbar {
  width: 8px;
}

.priority-items-scroll::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 4px;
}

.priority-items-scroll::-webkit-scrollbar-thumb {
  background: #6B7280;
  border-radius: 4px;
  border: 1px solid #374151;
}

.priority-items-scroll::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

/* Smooth transitions for loading and empty states */
.loading-state,
.empty-state {
  transition: all 0.3s ease-in-out;
}

/* Enhanced visual hierarchy matching kiosk design */
.priority-header {
  background: linear-gradient(135deg, #1F2937 0%, #111827 100%);
  border-bottom: 1px solid rgba(75, 85, 99, 0.5);
}

/* Subtle animation for loading state */
.loading-state {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Empty state enhancement */
.empty-state {
  background: radial-gradient(circle at center, rgba(34, 197, 94, 0.05) 0%, transparent 70%);
}
</style>