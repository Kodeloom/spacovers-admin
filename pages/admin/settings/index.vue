<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-xl font-semibold text-gray-700 mb-4">QuickBooks Online Integration</h2>
      
      <div v-if="!isLoading && connectionStatus.connected" class="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">
        Successfully connected to QuickBooks. Company: <strong>{{ connectionStatus.companyName }}</strong>
      </div>

      <div v-if="route.query.qbo === 'success' && !connectionStatus.connected" class="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">
        Successfully authorized with QuickBooks! We are finalizing the connection...
      </div>
      <div v-if="route.query.qbo === 'error'" class="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
        <strong>Error:</strong> {{ route.query.message || 'An unknown error occurred during QuickBooks authorization.' }}
      </div>

      <p class="text-gray-600 mb-4">
        Connect your account to QuickBooks Online to synchronize your customers, items, and orders automatically.
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
          v-if="connectionStatus.connected && !isLoading"
          class="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          @click="disconnect"
        >
          Disconnect
        </button>
      </div>
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

interface ConnectionStatus {
  connected: boolean;
  companyName?: string | null;
  message?: string | null;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isLoading = ref(true);
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
  } catch (error) {
    console.error('Failed to fetch QBO status:', error);
    connectionStatus.value = { connected: false, companyName: null, message: 'Failed to fetch status.' };
  } finally {
    isLoading.value = false;
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

const disconnect = () => {
    // This button provides a user-facing action that simulates a disconnect.
    // The actual disconnect is initiated by QBO via the webhook we created,
    // after the user revokes consent in their QBO account settings.
    toast.info({
        title: 'How to Disconnect',
        message: 'To fully disconnect, please log in to your QuickBooks Online account, navigate to the Apps section, and revoke access for this application.',
        timeout: 10000,
        color: 'blue',
        icon: 'heroicons:information-circle'
    });
};

onMounted(fetchStatus);
</script> 