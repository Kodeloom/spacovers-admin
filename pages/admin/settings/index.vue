<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-xl font-semibold text-gray-700 mb-4">QuickBooks Online Integration</h2>
      
      <!-- Connection Status Banner -->
      <div v-if="!isLoading && connectionStatus.connected" class="p-4 mb-6 text-sm text-green-700 bg-green-100 rounded-lg border border-green-200">
        <div class="flex items-center">
          <Icon name="heroicons:check-circle" class="mr-2 h-5 w-5 text-green-600" />
          <span class="font-medium">Successfully connected to QuickBooks</span>
        </div>
        <div class="mt-1">
          Company: <strong>{{ connectionStatus.companyName }}</strong>
          <span v-if="connectionStatus.automaticRefresh?.enabled" class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
            <Icon name="heroicons:arrow-path" class="mr-1 h-3 w-3" />
            Auto-refresh Active
          </span>
        </div>
      </div>

      <div v-if="!isLoading && !connectionStatus.connected" class="p-4 mb-6 text-sm text-gray-700 bg-gray-100 rounded-lg border border-gray-200">
        <div class="flex items-start">
          <Icon name="heroicons:exclamation-triangle" class="mr-2 h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div class="flex-1">
            <div class="font-medium">Not connected to QuickBooks</div>
            <div class="mt-1">{{ connectionStatus.message || 'Connect to enable automatic synchronization.' }}</div>
            
            <!-- Show recovery suggestions if available -->
            <div v-if="connectionStatus.recoverySuggestions && connectionStatus.recoverySuggestions.length > 0" class="mt-3">
              <div class="font-medium mb-2">Troubleshooting steps:</div>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li v-for="suggestion in connectionStatus.recoverySuggestions" :key="suggestion">{{ suggestion }}</li>
              </ul>
            </div>
            
            <!-- Show reconnection button if required -->
            <div v-if="connectionStatus.requiresReconnection" class="mt-3">
              <a 
                href="/api/qbo/connect"
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Icon name="heroicons:arrow-path" class="mr-1 h-3 w-3" />
                Reconnect to QuickBooks
              </a>
            </div>
          </div>
        </div>
      </div>

      <div v-if="route.query.qbo === 'success' && !connectionStatus.connected" class="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">
        Successfully authorized with QuickBooks! We are finalizing the connection...
      </div>
      
      <!-- Enhanced Error Display -->
      <div v-if="route.query.qbo === 'error'" class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
        <div class="flex items-start">
          <Icon name="heroicons:exclamation-triangle" class="mr-2 h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div class="flex-1">
            <div class="font-medium mb-2">QuickBooks Connection Error</div>
            <div class="mb-3">{{ route.query.message || 'An unknown error occurred during QuickBooks authorization.' }}</div>
            
            <!-- Recovery Suggestions -->
            <div v-if="getRecoverySuggestions().length > 0" class="mt-3">
              <div class="font-medium mb-2">What you can do:</div>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li v-for="suggestion in getRecoverySuggestions()" :key="suggestion">{{ suggestion }}</li>
              </ul>
            </div>
            
            <!-- Reconnection Button for Specific Error Types -->
            <div v-if="route.query.requiresReconnection === 'true'" class="mt-3">
              <a 
                href="/api/qbo/connect"
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Icon name="heroicons:arrow-path" class="mr-1 h-3 w-3" />
                Try Reconnecting
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Status Information -->
      <div v-if="!isLoading && connectionStatus.connected" class="mb-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Connection Details</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Company Information -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-3">Company Information</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Company Name:</span>
                <span class="font-medium">{{ connectionStatus.companyName || 'Unknown' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Company ID:</span>
                <span class="font-mono text-xs">{{ connectionStatus.companyId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Connected:</span>
                <span class="font-medium">{{ formatDate(connectionStatus.connectedAt) }}</span>
              </div>
              <div v-if="connectionStatus.lastRefreshedAt" class="flex justify-between">
                <span class="text-gray-600">Last Refreshed:</span>
                <span class="font-medium">{{ formatDate(connectionStatus.lastRefreshedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Token Health -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-3">Token Health</h4>
            <div class="space-y-3 text-sm">
              <!-- Access Token -->
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-gray-600">Access Token:</span>
                  <span :class="getTokenStatusClass(connectionStatus.tokenHealth?.accessToken)">
                    {{ getTokenStatusText(connectionStatus.tokenHealth?.accessToken) }}
                  </span>
                </div>
                <div class="text-xs text-gray-500">
                  Expires: {{ formatDateTime(connectionStatus.tokenHealth?.accessToken?.expiresAt) }}
                  <span v-if="connectionStatus.tokenHealth?.accessToken?.minutesRemaining !== undefined">
                    ({{ connectionStatus.tokenHealth.accessToken.minutesRemaining }} min remaining)
                  </span>
                </div>
              </div>

              <!-- Refresh Token -->
              <div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-gray-600">Refresh Token:</span>
                  <span :class="getRefreshTokenStatusClass(connectionStatus.tokenHealth?.refreshToken)">
                    {{ getRefreshTokenStatusText(connectionStatus.tokenHealth?.refreshToken) }}
                  </span>
                </div>
                <div class="text-xs text-gray-500">
                  Expires: {{ formatDateTime(connectionStatus.tokenHealth?.refreshToken?.expiresAt) }}
                  <span v-if="connectionStatus.tokenHealth?.refreshToken?.daysRemaining !== undefined">
                    ({{ connectionStatus.tokenHealth.refreshToken.daysRemaining }} days remaining)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Automatic Refresh Status -->
        <div class="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 class="font-medium text-blue-800 mb-3 flex items-center">
            <Icon name="heroicons:cog-6-tooth" class="mr-2 h-5 w-5" />
            Automatic Refresh System
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-blue-700">Status:</span>
                <span :class="connectionStatus.automaticRefresh?.enabled ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
                  {{ connectionStatus.automaticRefresh?.status || 'Unknown' }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-blue-700">Scheduler:</span>
                <span class="text-blue-800 font-medium">
                  {{ connectionStatus.automaticRefresh?.schedulerRunning ? 'Running' : 'Stopped' }}
                </span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-blue-700">Check Frequency:</span>
                <span class="text-blue-800">{{ connectionStatus.automaticRefresh?.nextRefreshCheck || 'Unknown' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-blue-700">Refresh Threshold:</span>
                <span class="text-blue-800">{{ connectionStatus.automaticRefresh?.refreshThreshold || 'Unknown' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p class="text-gray-600 mb-6">
        Connect your account to QuickBooks Online to synchronize your customers, items, and orders automatically.
        <span v-if="connectionStatus.connected">
          The integration uses automatic token refresh to maintain a seamless connection.
        </span>
      </p>
      
      <div class="flex items-center space-x-4">
        <a 
          href="/api/qbo/connect"
          :class="['inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white', {
            'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500': !connectionStatus.connected && !isLoading,
            'bg-gray-400 cursor-not-allowed': connectionStatus.connected || isLoading,
          }]"
          :aria-disabled="connectionStatus.connected || isLoading"
          @click.prevent="handleConnectClick"
        >
          <Icon v-if="isLoading" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
          <span v-if="isLoading">Checking Status...</span>
          <span v-else-if="connectionStatus.connected">Connected</span>
          <span v-else>Connect to QuickBooks</span>
        </a>

        <button 
          v-if="!isLoading"
          :disabled="isRefreshing"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="refreshStatus"
        >
          <Icon v-if="isRefreshing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
          <Icon v-else name="heroicons:arrow-path" class="mr-2 h-4 w-4" />
          {{ isRefreshing ? 'Refreshing...' : 'Refresh Status' }}
        </button>

        <button 
          v-if="connectionStatus.connected && !isLoading"
          :disabled="isDisconnecting"
          class="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="showDisconnectConfirmation = true"
        >
          <Icon v-if="isDisconnecting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
          <Icon v-else name="heroicons:x-mark" class="mr-2 h-4 w-4" />
          {{ isDisconnecting ? 'Disconnecting...' : 'Disconnect' }}
        </button>
      </div>

      <!-- Disconnect Confirmation Modal -->
      <AppModal 
        :is-open="showDisconnectConfirmation"
        title="Disconnect QuickBooks Integration"
        @close="showDisconnectConfirmation = false"
      >
        <div class="p-6">
          <div class="flex items-center mb-4">
            <Icon name="heroicons:exclamation-triangle" class="h-6 w-6 text-red-600 mr-3" />
            <h3 class="text-lg font-medium text-gray-900">Are you sure you want to disconnect?</h3>
          </div>
          
          <div class="mb-6 text-sm text-gray-600 space-y-2">
            <p>Disconnecting will:</p>
            <ul class="list-disc list-inside ml-4 space-y-1">
              <li>Stop all automatic synchronization with QuickBooks</li>
              <li>Disable the automatic token refresh system</li>
              <li>Require reconnection to resume QuickBooks features</li>
              <li>Affect all users in your organization</li>
            </ul>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              @click="showDisconnectConfirmation = false"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isDisconnecting"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="disconnect"
            >
              <Icon v-if="isDisconnecting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
              {{ isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect' }}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

interface TokenHealth {
  expiresAt: string;
  minutesRemaining?: number;
  daysRemaining?: number;
  isExpired: boolean;
  needsRefresh?: boolean;
  warningThreshold?: boolean;
}

interface AutomaticRefresh {
  enabled: boolean;
  schedulerRunning: boolean;
  nextRefreshCheck: string;
  refreshThreshold: string;
  status: string;
}

interface ConnectionStatus {
  connected: boolean;
  companyName?: string | null;
  companyId?: string;
  connectedAt?: string;
  lastRefreshedAt?: string;
  message?: string | null;
  error?: string;
  errorType?: string;
  requiresReconnection?: boolean;
  recoverySuggestions?: string[];
  tokenHealth?: {
    accessToken: TokenHealth;
    refreshToken: TokenHealth;
  };
  automaticRefresh?: AutomaticRefresh;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isLoading = ref(true);
const isRefreshing = ref(false);
const isDisconnecting = ref(false);
const showDisconnectConfirmation = ref(false);
const connectionStatus = ref<ConnectionStatus>({ connected: false, companyName: null });

const fetchStatus = async () => {
  isLoading.value = true;
  try {
    const status = await $fetch<ConnectionStatus>('/api/qbo/status');
    connectionStatus.value = status;
    // If the URL has a success query param, remove it after fetching status
    if (route.query.qbo) {
      router.replace({ query: {} });
    }
  } catch (error: any) {
    console.error('Failed to fetch QBO status:', error);
    
    // Extract error information from the response
    const errorData = error.data || {};
    connectionStatus.value = { 
      connected: false, 
      companyName: null, 
      message: error.data?.message || error.message || 'Failed to fetch status.',
      errorType: errorData.errorType,
      requiresReconnection: errorData.requiresReconnection,
      recoverySuggestions: errorData.recoverySuggestions || [
        'Check your internet connection',
        'Try refreshing the page',
        'Contact support if the issue persists'
      ]
    };
  } finally {
    isLoading.value = false;
  }
};

const refreshStatus = async () => {
  isRefreshing.value = true;
  try {
    const status = await $fetch<ConnectionStatus>('/api/qbo/status');
    connectionStatus.value = status;
    toast.success({
      title: 'Status Updated',
      message: 'QuickBooks connection status has been refreshed.',
    });
  } catch (error: any) {
    console.error('Failed to refresh QBO status:', error);
    
    const errorData = error.data || {};
    const errorMessage = errorData.message || error.message || 'Unable to refresh connection status. Please try again.';
    
    toast.error({
      title: 'Refresh Failed',
      message: errorMessage,
    });

    // Update connection status with error information
    connectionStatus.value = {
      ...connectionStatus.value,
      connected: false,
      error: errorMessage,
      errorType: errorData.errorType,
      requiresReconnection: errorData.requiresReconnection,
      recoverySuggestions: errorData.recoverySuggestions
    };
  } finally {
    isRefreshing.value = false;
  }
};

const handleConnectClick = (e: MouseEvent) => {
  if (connectionStatus.value.connected || isLoading.value) {
    e.preventDefault();
    return;
  }
  // Allow the navigation to /api/qbo/connect
  window.location.href = (e.currentTarget as HTMLAnchorElement).href;
};

const disconnect = async () => {
  isDisconnecting.value = true;
  showDisconnectConfirmation.value = false;
  
  try {
    const result = await $fetch('/api/qbo/disconnect', {
      method: 'POST',
    });

    if (result.success) {
      toast.success({
        title: 'Disconnected Successfully',
        message: 'QuickBooks integration has been disconnected for your company.',
      });
      
      // Refresh the status to reflect the disconnection
      await fetchStatus();
    } else {
      throw new Error(result.message || 'Disconnect failed');
    }
  } catch (error: any) {
    console.error('Failed to disconnect QBO:', error);
    
    const errorData = error.data || {};
    const errorMessage = errorData.message || error.message || 'Unable to disconnect. Please try again.';
    
    toast.error({
      title: 'Disconnect Failed',
      message: errorMessage,
    });

    // Show recovery suggestions if available
    if (errorData.recoverySuggestions && errorData.recoverySuggestions.length > 0) {
      setTimeout(() => {
        toast.info({
          title: 'Troubleshooting Steps',
          message: errorData.recoverySuggestions.join('. '),
        });
      }, 2000);
    }
  } finally {
    isDisconnecting.value = false;
  }
};

// Utility functions for formatting and status display
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTokenStatusClass = (token?: TokenHealth) => {
  if (!token) return 'text-gray-500';
  if (token.isExpired) return 'text-red-600 font-medium';
  if (token.needsRefresh) return 'text-yellow-600 font-medium';
  return 'text-green-600 font-medium';
};

const getTokenStatusText = (token?: TokenHealth) => {
  if (!token) return 'Unknown';
  if (token.isExpired) return 'Expired';
  if (token.needsRefresh) return 'Needs Refresh';
  return 'Valid';
};

const getRefreshTokenStatusClass = (token?: TokenHealth) => {
  if (!token) return 'text-gray-500';
  if (token.isExpired) return 'text-red-600 font-medium';
  if (token.warningThreshold) return 'text-yellow-600 font-medium';
  return 'text-green-600 font-medium';
};

const getRefreshTokenStatusText = (token?: TokenHealth) => {
  if (!token) return 'Unknown';
  if (token.isExpired) return 'Expired';
  if (token.warningThreshold) return 'Expiring Soon';
  return 'Valid';
};

const getRecoverySuggestions = (): string[] => {
  const suggestions: string[] = [];
  
  // Extract suggestions from query parameters
  let index = 1;
  while (route.query[`suggestion${index}`]) {
    suggestions.push(route.query[`suggestion${index}`] as string);
    index++;
  }
  
  // Fallback suggestions if none provided
  if (suggestions.length === 0) {
    suggestions.push('Try refreshing the page');
    suggestions.push('Wait a few minutes and try again');
    suggestions.push('Contact support if the issue persists');
  }
  
  return suggestions;
};

onMounted(fetchStatus);
</script> 