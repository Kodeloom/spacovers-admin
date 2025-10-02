<template>
  <div 
    class="priority-item p-4 lg:p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg"
    :class="[getItemClasses(), { 'urgent-glow': item.isUrgent }]"
    @click="$emit('refocus')"
  >
    <!-- Header with order info and urgency indicator -->
    <div class="item-header flex items-center justify-between mb-3">
      <div class="order-info flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="order-number text-white font-bold text-sm lg:text-base">
            {{ item.orderNumber }}
          </span>
          <div v-if="item.isUrgent" class="urgency-indicator flex items-center gap-1">
            <Icon name="heroicons:fire" class="h-4 w-4 lg:h-5 lg:w-5 text-red-400 animate-pulse" />
            <span class="text-red-400 text-xs font-semibold uppercase tracking-wide">URGENT</span>
          </div>
        </div>
        <span class="customer-name text-gray-300 text-xs lg:text-sm truncate block">
          {{ item.customerName }}
        </span>
      </div>
    </div>
    
    <!-- Item details with enhanced styling -->
    <div class="item-details">
      <p class="item-description text-gray-100 text-sm lg:text-base font-medium mb-3 line-clamp-2" :title="item.itemName">
        {{ item.itemName }}
      </p>
      
      <!-- Status and timing info -->
      <div class="status-info flex items-center justify-between gap-2">
        <span 
          class="status-badge px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold border"
          :class="getStatusClass(item.status)"
        >
          {{ getStatusDisplayName(item.status) }}
        </span>
        <div class="time-info text-right">
          <span class="created-date text-gray-400 text-xs lg:text-sm block">
            {{ formatDate(item.createdAt) }}
          </span>
          <span v-if="item.isUrgent" class="urgency-time text-red-400 text-xs font-medium">
            High Priority
          </span>
        </div>
      </div>
    </div>
    
    <!-- Urgency accent bar for urgent items -->
    <div v-if="item.isUrgent" class="urgency-accent absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-red-600 rounded-l-xl"></div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { getStatusDisplayName } from '~/utils/barcodeUtils';

interface PriorityItem {
  id: string;
  orderNumber: string;
  itemName: string; // Now contains attribute description (e.g., "Spa Cover, Navy Blue, Size: 84")
  customerName: string;
  status: string;
  isUrgent: boolean; // Always true for HIGH priority orders
  createdAt: string;
  orderCreatedAt: string;
}

const props = defineProps<{
  item: PriorityItem;
}>();

const emit = defineEmits<{
  refocus: [];
}>();

// Enhanced item styling based on urgency and status
function getItemClasses(): string {
  const baseClasses = 'bg-gray-700 border-gray-600 hover:border-gray-500 hover:bg-gray-600 relative';
  
  if (props.item.isUrgent) {
    return `${baseClasses} border-red-500 bg-red-950/30 hover:border-red-400 hover:bg-red-950/40 shadow-red-500/20`;
  }
  
  return baseClasses;
}

// Enhanced status styling to match kiosk design patterns
function getStatusClass(status: string): string {
  const statusClasses: Record<string, string> = {
    'PENDING': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30',
    'CUTTING': 'bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30',
    'NOT_STARTED_PRODUCTION': 'bg-gray-500/20 text-gray-300 border-gray-500/50 hover:bg-gray-500/30',
    'SEWING': 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30',
    'FOAM_CUTTING': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30'
  };
  
  return statusClasses[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/50 hover:bg-gray-500/30';
}

// Enhanced date formatting with better time awareness
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInMinutes < 5) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
</script>

<style scoped>
/* Enhanced priority item styling */
.priority-item {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.priority-item:hover {
  transform: translateY(-1px);
}

/* Urgency accent animation */
.urgency-accent {
  animation: urgencyPulse 2s ease-in-out infinite;
}

@keyframes urgencyPulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 8px rgba(248, 113, 113, 0.6);
  }
}

/* Status badge hover effects */
.status-badge {
  transition: all 0.2s ease-in-out;
}

/* Line clamp utility for item descriptions */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  max-height: 2.8em;
}

/* Enhanced text shadows for better readability */
.priority-item .text-white {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Subtle glow effect for urgent items - applied via class binding */
.priority-item.urgent-glow {
  box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.3), 
              0 4px 12px rgba(248, 113, 113, 0.15);
}

.priority-item.urgent-glow:hover {
  box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.5), 
              0 8px 24px rgba(248, 113, 113, 0.25);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .priority-item {
    padding: 1rem;
  }
  
  .urgency-accent {
    width: 3px;
  }
}
</style>