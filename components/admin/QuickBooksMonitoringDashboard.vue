<template>
  <div class="quickbooks-monitoring-dashboard">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">QuickBooks Integration Monitoring</h2>
      <p class="text-gray-600">Real-time health status and performance metrics</p>
    </div>

    <!-- Health Status Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div :class="getHealthStatusColor(health?.overall)" class="w-8 h-8 rounded-full flex items-center justify-center">
              <Icon :name="getHealthStatusIcon(health?.overall)" class="w-4 h-4 text-white" />
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Overall Health</p>
            <p class="text-lg font-semibold text-gray-900 capitalize">{{ health?.overall || 'Unknown' }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Icon name="heroicons:clock" class="w-4 h-4 text-white" />
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Uptime</p>
            <p class="text-lg font-semibold text-gray-900">{{ formatUptime(monitoring?.uptime) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Icon name="heroicons:arrow-path" class="w-4 h-4 text-white" />
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Tokens Refreshed</p>
            <p class="text-lg font-semibold text-gray-900">{{ scheduler?.tokensRefreshed || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div :class="errors?.totalErrors > 0 ? 'bg-red-500' : 'bg-gray-400'" class="w-8 h-8 rounded-full flex items-center justify-center">
              <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 text-white" />
            </div>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Errors (1h)</p>
            <p class="text-lg font-semibold text-gray-900">{{ errors?.totalErrors || 0 }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Component Health Details -->
    <div class="bg-white rounded-lg shadow mb-6">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Component Health</h3>
        <div class="space-y-3">
          <div v-for="component in health?.components" :key="component.component" class="flex items-center justify-between p-3 border rounded-lg">
            <div class="flex items-center">
              <div :class="getHealthStatusColor(component.status)" class="w-3 h-3 rounded-full mr-3"></div>
              <div>
                <p class="font-medium text-gray-900">{{ component.component }}</p>
                <p class="text-sm text-gray-500">{{ component.message }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">{{ formatTimestamp(component.timestamp) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scheduler Performance -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Scheduler Performance</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">Success Rate</span>
              <span class="text-sm font-medium">{{ getSuccessRate(scheduler) }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">Total Checks</span>
              <span class="text-sm font-medium">{{ scheduler?.totalChecks || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">Average Duration</span>
              <span class="text-sm font-medium">{{ Math.round(scheduler?.averageCheckDuration || 0) }}ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">Last Check</span>
              <span class="text-sm font-medium">{{ formatTimestamp(scheduler?.lastCheckTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Error Summary</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">Total Errors</span>
              <span class="text-sm font-medium">{{ errors?.totalErrors || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-500">Critical Errors</span>
              <span class="text-sm font-medium text-red-600">{{ errors?.criticalErrors || 0 }}</span>
            </div>
            <div v-if="errors?.errorsByType && Object.keys(errors.errorsByType).length > 0">
              <p class="text-sm text-gray-500 mb-2">Error Types:</p>
              <div class="space-y-1">
                <div v-for="(count, type) in errors.errorsByType" :key="type" class="flex justify-between text-xs">
                  <span class="text-gray-600">{{ type }}</span>
                  <span class="font-medium">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Alerts -->
    <div class="bg-white rounded-lg shadow mb-6" v-if="alerts?.recentAlerts?.length > 0">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Alerts</h3>
        <div class="space-y-2">
          <div v-for="alert in alerts.recentAlerts.slice(0, 5)" :key="alert.timestamp" 
               class="flex items-center justify-between p-2 border-l-4 border-yellow-400 bg-yellow-50 rounded">
            <div>
              <p class="text-sm font-medium text-yellow-800">{{ alert.message }}</p>
              <p class="text-xs text-yellow-600">{{ formatTimestamp(alert.timestamp) }}</p>
            </div>
            <span :class="getAlertSeverityColor(alert.level)" class="px-2 py-1 text-xs font-medium rounded-full">
              {{ alert.level }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex space-x-4">
      <button @click="refreshData" :disabled="loading" 
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium">
        <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh Data
      </button>
      
      <button @click="showLogs = !showLogs" 
              class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium">
        <Icon name="heroicons:document-text" class="w-4 h-4 mr-2" />
        {{ showLogs ? 'Hide' : 'Show' }} Logs
      </button>
    </div>

    <!-- Logs Section -->
    <div v-if="showLogs" class="mt-6 bg-white rounded-lg shadow">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Logs</h3>
        <div class="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
          <div v-for="log in logs?.logs" :key="log.timestamp" class="text-sm font-mono mb-2">
            <span :class="getLogLevelColor(log.level)" class="mr-2">[{{ log.level }}]</span>
            <span class="text-gray-300">{{ formatTimestamp(log.timestamp) }}</span>
            <span class="text-blue-300 ml-2">[{{ log.component }}]</span>
            <span class="text-white ml-2">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface HealthData {
  overall: 'healthy' | 'degraded' | 'failed';
  components: Array<{
    component: string;
    status: 'healthy' | 'degraded' | 'failed';
    message: string;
    timestamp: string;
  }>;
}

interface MonitoringData {
  uptime: number;
}

interface SchedulerData {
  isHealthy: boolean;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageCheckDuration: number;
  lastCheckTime?: string;
  tokensRefreshed: number;
  errorRate: number;
}

interface ErrorData {
  totalErrors: number;
  criticalErrors: number;
  errorsByType: Record<string, number>;
}

interface AlertData {
  recentAlerts: Array<{
    timestamp: string;
    message: string;
    level: string;
  }>;
}

interface LogData {
  logs: Array<{
    timestamp: string;
    level: string;
    component: string;
    message: string;
  }>;
}

const health = ref<HealthData | null>(null);
const monitoring = ref<MonitoringData | null>(null);
const scheduler = ref<SchedulerData | null>(null);
const errors = ref<ErrorData | null>(null);
const alerts = ref<AlertData | null>(null);
const logs = ref<LogData | null>(null);
const loading = ref(false);
const showLogs = ref(false);

const refreshData = async () => {
  loading.value = true;
  try {
    // Fetch health data
    const healthResponse = await $fetch('/api/qbo/monitoring/health');
    if (healthResponse.success) {
      health.value = healthResponse.data.health;
      monitoring.value = healthResponse.data.monitoring;
      scheduler.value = healthResponse.data.scheduler;
      errors.value = healthResponse.data.errors;
    }

    // Fetch alerts
    const alertsResponse = await $fetch('/api/qbo/monitoring/alerts');
    if (alertsResponse.success) {
      alerts.value = alertsResponse.data;
    }

    // Fetch logs if showing
    if (showLogs.value) {
      const logsResponse = await $fetch('/api/qbo/monitoring/logs?count=50');
      if (logsResponse.success) {
        logs.value = logsResponse.data;
      }
    }
  } catch (error) {
    console.error('Failed to refresh monitoring data:', error);
  } finally {
    loading.value = false;
  }
};

const getHealthStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-500';
    case 'degraded': return 'bg-yellow-500';
    case 'failed': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const getHealthStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return 'heroicons:check';
    case 'degraded': return 'heroicons:exclamation-triangle';
    case 'failed': return 'heroicons:x-mark';
    default: return 'heroicons:question-mark-circle';
  }
};

const getSuccessRate = (schedulerData: SchedulerData | null) => {
  if (!schedulerData || schedulerData.totalChecks === 0) return 0;
  return Math.round((schedulerData.successfulChecks / schedulerData.totalChecks) * 100);
};

const getAlertSeverityColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'error': return 'bg-red-100 text-red-800';
    case 'warn': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-blue-100 text-blue-800';
  }
};

const getLogLevelColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'critical': return 'text-red-400';
    case 'error': return 'text-red-300';
    case 'warn': return 'text-yellow-300';
    case 'info': return 'text-green-300';
    case 'debug': return 'text-gray-400';
    default: return 'text-white';
  }
};

const formatUptime = (uptime: number | undefined) => {
  if (!uptime) return 'Unknown';
  
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

const formatTimestamp = (timestamp: string | Date | undefined) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Auto-refresh every 30 seconds
let refreshInterval: NodeJS.Timeout;

onMounted(() => {
  refreshData();
  refreshInterval = setInterval(refreshData, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

// Watch showLogs to fetch logs when needed
watch(showLogs, (newValue) => {
  if (newValue && !logs.value) {
    refreshData();
  }
});
</script>

<style scoped>
.quickbooks-monitoring-dashboard {
  @apply max-w-7xl mx-auto;
}
</style>