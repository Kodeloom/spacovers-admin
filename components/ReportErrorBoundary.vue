<template>
  <div v-if="hasError" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <Icon name="heroicons:exclamation-triangle" class="h-6 w-6 text-red-600" />
      </div>
      <div class="ml-3 flex-1">
        <h3 class="text-lg font-medium text-red-800 mb-2">
          {{ errorTitle }}
        </h3>
        <p class="text-red-700 mb-4">
          {{ errorMessage }}
        </p>
        
        <!-- Error suggestions -->
        <div v-if="suggestions && suggestions.length > 0" class="mb-4">
          <h4 class="text-sm font-medium text-red-800 mb-2">Try these solutions:</h4>
          <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
            <li v-for="suggestion in suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap gap-3">
          <button
            v-if="retryable"
            @click="handleRetry"
            :disabled="isRetrying"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Icon v-if="isRetrying" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isRetrying ? 'Retrying...' : 'Try Again' }}
          </button>
          
          <button
            @click="clearError"
            class="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Dismiss
          </button>
          
          <button
            v-if="showContactSupport"
            @click="contactSupport"
            class="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Contact Support
          </button>
        </div>

        <!-- Technical details (collapsible) -->
        <div v-if="showTechnicalDetails && technicalDetails" class="mt-4">
          <button
            @click="showDetails = !showDetails"
            class="text-sm text-red-600 hover:text-red-800 underline"
          >
            {{ showDetails ? 'Hide' : 'Show' }} Technical Details
          </button>
          
          <div v-if="showDetails" class="mt-2 p-3 bg-red-100 rounded border text-xs text-red-800 font-mono">
            <pre class="whitespace-pre-wrap">{{ technicalDetails }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Slot content when no error -->
  <slot v-else />
</template>

<script setup lang="ts">
interface Props {
  error?: any;
  retryable?: boolean;
  showContactSupport?: boolean;
  showTechnicalDetails?: boolean;
  customTitle?: string;
  customMessage?: string;
  customSuggestions?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  retryable: true,
  showContactSupport: false,
  showTechnicalDetails: false
});

const emit = defineEmits<{
  retry: [];
  clear: [];
  contactSupport: [];
}>();

const hasError = computed(() => !!props.error);
const isRetrying = ref(false);
const showDetails = ref(false);

// Parse error information
const errorInfo = computed(() => {
  if (!props.error) return null;

  // Handle structured API errors
  if (props.error.data) {
    return {
      title: props.customTitle || 'Report Generation Error',
      message: props.error.statusMessage || props.error.message || 'An unexpected error occurred',
      suggestions: props.customSuggestions || props.error.data.suggestions || [],
      retryable: props.error.data.retryable !== false,
      technicalDetails: JSON.stringify(props.error.data, null, 2)
    };
  }

  // Handle fetch errors
  if (props.error.statusMessage) {
    return {
      title: props.customTitle || 'Request Failed',
      message: props.error.statusMessage,
      suggestions: props.customSuggestions || [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the problem persists'
      ],
      retryable: true,
      technicalDetails: `Status: ${props.error.statusCode || 'Unknown'}\nMessage: ${props.error.statusMessage}`
    };
  }

  // Handle generic errors
  return {
    title: props.customTitle || 'Error',
    message: props.customMessage || props.error.message || 'An unexpected error occurred',
    suggestions: props.customSuggestions || [
      'Try refreshing the page',
      'Check your internet connection',
      'Contact support if the problem persists'
    ],
    retryable: true,
    technicalDetails: props.error.stack || props.error.toString()
  };
});

const errorTitle = computed(() => errorInfo.value?.title || 'Error');
const errorMessage = computed(() => errorInfo.value?.message || 'An unexpected error occurred');
const suggestions = computed(() => errorInfo.value?.suggestions || []);
const retryable = computed(() => props.retryable && (errorInfo.value?.retryable !== false));
const technicalDetails = computed(() => errorInfo.value?.technicalDetails);

async function handleRetry() {
  if (!retryable.value) return;
  
  isRetrying.value = true;
  try {
    emit('retry');
    // Give some time for the retry operation
    await new Promise(resolve => setTimeout(resolve, 500));
  } finally {
    isRetrying.value = false;
  }
}

function clearError() {
  emit('clear');
}

function contactSupport() {
  emit('contactSupport');
}

// Watch for error changes to reset retry state
watch(() => props.error, () => {
  isRetrying.value = false;
  showDetails.value = false;
});
</script>