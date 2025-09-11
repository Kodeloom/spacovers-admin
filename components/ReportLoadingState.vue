<template>
  <div class="space-y-6">
    <!-- Loading message with progress indicator -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-blue-600" />
        </div>
        <div class="ml-3">
          <h3 class="text-lg font-medium text-blue-800">
            {{ loadingTitle }}
          </h3>
          <p class="text-blue-700 mt-1">
            {{ loadingMessage }}
          </p>
          
          <!-- Progress bar if provided -->
          <div v-if="progress !== undefined" class="mt-3">
            <div class="flex items-center justify-between text-sm text-blue-600 mb-1">
              <span>Progress</span>
              <span>{{ Math.round(progress) }}%</span>
            </div>
            <div class="w-full bg-blue-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
              ></div>
            </div>
          </div>

          <!-- Estimated time if provided -->
          <p v-if="estimatedTime" class="text-sm text-blue-600 mt-2">
            Estimated time: {{ estimatedTime }}
          </p>
        </div>
      </div>
    </div>

    <!-- Skeleton loading for summary stats -->
    <div v-if="showSummarySkeletons" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="bg-white shadow rounded-lg p-6 animate-pulse">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="h-8 w-8 bg-gray-300 rounded"></div>
          </div>
          <div class="ml-4 flex-1">
            <div class="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
            <div class="h-6 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Skeleton loading for table -->
    <div v-if="showTableSkeleton" class="bg-white shadow rounded-lg p-6">
      <div class="animate-pulse">
        <!-- Table header skeleton -->
        <div class="h-6 bg-gray-300 rounded mb-4 w-1/3"></div>
        
        <!-- Table rows skeleton -->
        <div class="space-y-3">
          <div class="grid grid-cols-7 gap-4">
            <div v-for="i in 7" :key="i" class="h-4 bg-gray-300 rounded"></div>
          </div>
          <div v-for="row in skeletonRows" :key="row" class="grid grid-cols-7 gap-4">
            <div v-for="col in 7" :key="col" class="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading tips -->
    <div v-if="showTips && tips.length > 0" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 class="text-sm font-medium text-gray-800 mb-2">💡 Did you know?</h4>
      <p class="text-sm text-gray-600">
        {{ currentTip }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  loadingTitle?: string;
  loadingMessage?: string;
  progress?: number;
  estimatedTime?: string;
  showSummarySkeletons?: boolean;
  showTableSkeleton?: boolean;
  showTips?: boolean;
  skeletonRows?: number;
  tips?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  loadingTitle: 'Generating Report',
  loadingMessage: 'Please wait while we process your request...',
  showSummarySkeletons: true,
  showTableSkeleton: true,
  showTips: true,
  skeletonRows: 5,
  tips: () => [
    'You can export reports to CSV for further analysis in Excel or other tools.',
    'Use date filters to focus on specific time periods for more accurate insights.',
    'The productivity report shows unique items processed, not total scans.',
    'Lead times are calculated in business days (8-hour workdays).',
    'Click on employee item counts to see detailed processing information.',
    'Smaller date ranges will load faster and provide more focused insights.',
    'Use station and employee filters to drill down into specific performance metrics.'
  ]
});

// Rotate through tips every 3 seconds
const currentTipIndex = ref(0);
const currentTip = computed(() => {
  if (!props.tips || props.tips.length === 0) return '';
  return props.tips[currentTipIndex.value];
});

let tipInterval: NodeJS.Timeout | null = null;

onMounted(() => {
  if (props.showTips && props.tips.length > 1) {
    tipInterval = setInterval(() => {
      currentTipIndex.value = (currentTipIndex.value + 1) % props.tips.length;
    }, 3000);
  }
});

onUnmounted(() => {
  if (tipInterval) {
    clearInterval(tipInterval);
  }
});
</script>