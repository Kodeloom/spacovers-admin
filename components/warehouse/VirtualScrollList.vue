<template>
  <div 
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <!-- Virtual spacer for items above visible area -->
    <div :style="{ height: offsetY + 'px' }"></div>
    
    <!-- Visible items -->
    <div
      v-for="item in visibleItems"
      :key="getItemKey(item)"
      :style="{ height: itemHeight + 'px' }"
      class="virtual-scroll-item"
    >
      <slot :item="item" :index="item.index"></slot>
    </div>
    
    <!-- Virtual spacer for items below visible area -->
    <div :style="{ height: (totalHeight - offsetY - visibleHeight) + 'px' }"></div>
  </div>
</template>

<script setup lang="ts" generic="T">
interface Props {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  getItemKey: (item: T) => string | number;
  overscan?: number; // Number of items to render outside visible area for smooth scrolling
}

const props = withDefaults(defineProps<Props>(), {
  overscan: 5
});

const emit = defineEmits<{
  scroll: [scrollTop: number];
}>();

const containerRef = ref<HTMLElement>();
const scrollTop = ref(0);

// Computed properties for virtual scrolling calculations
const totalHeight = computed(() => props.items.length * props.itemHeight);

const visibleItemCount = computed(() => 
  Math.ceil(props.containerHeight / props.itemHeight)
);

const startIndex = computed(() => 
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan)
);

const endIndex = computed(() => 
  Math.min(
    props.items.length - 1,
    startIndex.value + visibleItemCount.value + props.overscan * 2
  )
);

const visibleItems = computed(() => {
  const items = [];
  for (let i = startIndex.value; i <= endIndex.value; i++) {
    if (props.items[i]) {
      items.push({
        ...props.items[i],
        index: i
      });
    }
  }
  return items;
});

const offsetY = computed(() => startIndex.value * props.itemHeight);
const visibleHeight = computed(() => (endIndex.value - startIndex.value + 1) * props.itemHeight);

// Throttled scroll handler for performance
let scrollTimeout: NodeJS.Timeout | null = null;

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
  
  // Throttle scroll events
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(() => {
    emit('scroll', scrollTop.value);
  }, 16); // ~60fps
};

// Method to scroll to specific item
const scrollToItem = (index: number) => {
  if (containerRef.value) {
    const scrollPosition = index * props.itemHeight;
    containerRef.value.scrollTop = scrollPosition;
    scrollTop.value = scrollPosition;
  }
};

// Method to scroll to top
const scrollToTop = () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0;
    scrollTop.value = 0;
  }
};

// Expose methods for parent component
defineExpose({
  scrollToItem,
  scrollToTop,
  scrollTop: readonly(scrollTop)
});
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-scroll-item {
  overflow: hidden;
}

/* Enhanced scrollbar styling */
.virtual-scroll-container {
  scrollbar-width: thin;
  scrollbar-color: #6B7280 #374151;
}

.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: #6B7280;
  border-radius: 4px;
  border: 1px solid #374151;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}
</style>