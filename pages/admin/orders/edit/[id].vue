<template>
  <div>
    <div v-if="order" class="p-4">
      <header class="mb-6">
        <!-- Order Header -->
        <div class="flex justify-between items-start mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-800">
              Order #{{ order.salesOrderNumber }}
            </h1>
            <p class="text-gray-500 mt-1">
              For <span class="font-medium text-gray-700">{{ order.customer?.name }}</span>
              <span class="mx-2 text-gray-300">|</span>
              Created on {{ new Date(order.createdAt).toLocaleDateString() }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              :disabled="isSyncing"
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              @click="syncOrder"
            >
              <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
              Sync with QBO
            </button>
            <button v-if="order.estimate" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200" @click="goToEstimate">
                View Linked Estimate
            </button>
          </div>
        </div>

        <!-- Inline Status Management -->
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div class="flex items-center space-x-6">
            <div class="flex-1">
              <label for="orderStatus" class="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
              <div class="flex items-center space-x-3">
                <select 
                  id="orderStatus" 
                  v-model="form.orderStatus" 
                  class="flex-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option v-for="status in orderSystemStatusOptions" :key="status" :value="status">{{ status }}</option>
                </select>
                <button
                  type="button"
                  :disabled="isSaving || form.orderStatus === order?.orderStatus"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveChanges"
                >
                  <Icon v-if="isSaving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSaving ? 'Saving...' : 'Save Status' }}
                </button>
                <button
                  v-if="form.orderStatus !== order?.orderStatus"
                  type="button"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  @click="resetForm"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div class="flex-1">
              <label for="priority" class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div class="flex items-center space-x-3">
                <select 
                  id="priority" 
                  v-model="form.priority" 
                  class="flex-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option v-for="priority in orderPriorityOptions" :key="priority" :value="priority">{{ priority }}</option>
                </select>
                <button
                  type="button"
                  :disabled="isSaving || form.priority === order?.priority"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveChanges"
                >
                  <Icon v-if="isSaving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSaving ? 'Saving...' : 'Save Priority' }}
                </button>
                <button
                  v-if="form.priority !== order?.priority"
                  type="button"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  @click="resetForm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-6">
            <div class="flex-1">
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <div class="flex items-center space-x-3">
                <textarea 
                  id="notes" 
                  v-model="form.notes" 
                  rows="2" 
                  class="flex-1 block shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add notes about this order..."
                />
                <button
                  type="button"
                  :disabled="isSaving || form.notes === order?.notes"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveChanges"
                >
                  <Icon v-if="isSaving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSaving ? 'Saving...' : 'Save Notes' }}
                </button>
                <button
                  v-if="form.notes !== order?.notes"
                  type="button"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  @click="resetForm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="space-y-6">
          <!-- Order Items -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Order Items</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Status</th>
                    <th v-if="isAdmin" scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="item in order.items" :key="item.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.item?.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.quantity }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${{ Number(item.pricePerItem).toFixed(2) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span v-if="!isEditingItem || editingItemId !== item.id">{{ item.itemStatus }}</span>
                      <select 
                        v-else
                        v-model="editingItemStatus" 
                        class="block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                      >
                        <option v-for="status in itemStatusOptions" :key="status" :value="status">{{ status }}</option>
                      </select>
                    </td>
                    <td v-if="isAdmin" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div v-if="!isEditingItem || editingItemId !== item.id" class="flex space-x-2">
                        <button
                          class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          @click="startEditItem(item)"
                        >
                          Edit Status
                        </button>
                      </div>
                      <div v-else class="flex space-x-2">
                        <button
                          :disabled="isSavingItem"
                          class="text-green-600 hover:text-green-900 text-sm font-medium disabled:opacity-50"
                          @click="saveItemStatus(item.id)"
                        >
                          {{ isSavingItem ? 'Saving...' : 'Save' }}
                        </button>
                        <button
                          class="text-gray-600 hover:text-gray-900 text-sm font-medium"
                          @click="cancelEditItem"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Financial & Address Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white p-6 rounded-lg shadow">
                  <h3 class="text-lg font-semibold text-gray-800 mb-4">Financials</h3>
                  <dl class="space-y-2">
                      <div class="flex justify-between"><dt>Total Amount:</dt><dd class="font-mono">${{ Number(order.totalAmount).toFixed(2) }}</dd></div>
                      <div class="flex justify-between"><dt>Balance Due:</dt><dd class="font-mono">${{ Number(order.balance).toFixed(2) }}</dd></div>
                      <div class="flex justify-between"><dt>Total Tax:</dt><dd class="font-mono">${{ Number(order.totalTax).toFixed(2) }}</dd></div>
                  </dl>
              </div>
              <div class="bg-white p-6 rounded-lg shadow">
                  <h3 class="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h3>
                  <address class="not-italic text-gray-600">
                      {{ order.shippingAddressLine1 }}<br>
                      <template v-if="order.shippingAddressLine2">{{ order.shippingAddressLine2 }}<br></template>
                      {{ order.shippingCity }}, {{ order.shippingState }} {{ order.shippingZipCode }}
                  </address>
              </div>
          </div>

          <!-- Order Activity Log -->
          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Order Activity Log</h2>
            <div v-if="orderLogs && orderLogs.length > 0" class="space-y-4">
              <div v-for="log in orderLogs" :key="log.id" class="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <span class="text-sm font-medium text-gray-900">
                        {{ log.fromStatus || 'CREATED' }} → {{ log.toStatus }}
                      </span>
                      <span
  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                            :class="{
                              'bg-green-100 text-green-800': log.triggeredBy === 'manual',
                              'bg-blue-100 text-blue-800': log.triggeredBy === 'automation',
                              'bg-gray-100 text-gray-800': log.triggeredBy === 'system'
                            }">
                        {{ log.triggeredBy }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mb-1">{{ log.changeReason }}</p>
                    <div class="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{{ new Date(log.timestamp).toLocaleString() }}</span>
                      <span v-if="log.user">by {{ log.user.name }}</span>
                      <span v-else>by System</span>
                    </div>
                    <p v-if="log.notes" class="text-xs text-gray-500 mt-1 italic">{{ log.notes }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              <Icon name="heroicons:clock" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No activity recorded yet</p>
            </div>
          </div>

          <!-- Item Activity Log -->
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-800">Item Production Activity</h2>
              <div class="flex items-center space-x-4">
                <!-- Item Filter -->
                <div class="flex items-center space-x-2">
                  <label for="itemFilter" class="text-sm font-medium text-gray-700">Filter by Item:</label>
                  <select 
                    id="itemFilter" 
                    v-model="selectedItemFilter" 
                    class="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    @change="filterItemLogs"
                  >
                    <option value="">All Items</option>
                    <option v-for="item in order.items" :key="item.id" :value="item.id">
                      {{ item.item?.name }}
                    </option>
                  </select>
                </div>
                <!-- Status Filter -->
                <div class="flex items-center space-x-2">
                  <label for="statusFilter" class="text-sm font-medium text-gray-700">Filter by Status:</label>
                  <select 
                    id="statusFilter" 
                    v-model="selectedStatusFilter" 
                    class="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    @change="filterItemLogs"
                  >
                    <option value="">All Statuses</option>
                    <option v-for="status in itemStatusOptions" :key="status" :value="status">
                      {{ status }}
                    </option>
                  </select>
                </div>
                <!-- Clear Filters -->
                <button
                  v-if="selectedItemFilter || selectedStatusFilter"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  @click="clearItemFilters"
                >
                  <Icon name="heroicons:x-mark" class="mr-2 h-4 w-4" />
                  Clear Filters
                </button>
              </div>
            </div>
            <div v-if="filteredItemLogs && filteredItemLogs.length > 0" class="space-y-4">
              <div v-for="log in filteredItemLogs" :key="log.id" class="border-l-4 border-green-500 pl-4 py-3 bg-gray-50 rounded-r">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <span class="text-sm font-medium text-gray-900">
                        {{ log.orderItem?.item?.name || 'Unknown Item' }}
                      </span>
                      <span class="text-sm text-gray-600">
                        {{ log.fromStatus || 'STARTED' }} → {{ log.toStatus }}
                      </span>
                      <span
  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                            :class="{
                              'bg-green-100 text-green-800': log.triggeredBy === 'manual',
                              'bg-blue-100 text-blue-800': log.triggeredBy === 'automation',
                              'bg-gray-100 text-gray-800': log.triggeredBy === 'system'
                            }">
                        {{ log.triggeredBy }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mb-1">{{ log.changeReason }}</p>
                    <div class="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{{ new Date(log.timestamp).toLocaleString() }}</span>
                      <span v-if="log.user">by {{ log.user.name }}</span>
                      <span v-else>by System</span>
                    </div>
                    <p v-if="log.notes" class="text-xs text-gray-500 mt-1 italic">{{ log.notes }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              <Icon name="heroicons:cog" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No production activity recorded yet</p>
            </div>
            <div v-if="itemLogs && itemLogs.length > 0" class="mt-4 pt-4 border-t border-gray-200">
              <button 
                class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                @click="refreshActivityLogs"
              >
                <Icon name="heroicons:arrow-path" class="mr-2 h-4 w-4" />
                Refresh Activity Logs
              </button>
            </div>
          </div>
      </div>

        <!-- Packing Slip Section (Only show if order is approved) -->
        <div v-if="order?.orderStatus === 'APPROVED'" class="bg-white p-6 rounded-lg shadow mt-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Packing Slip</h2>
          <PackingSlip :order="order" />
        </div>
    </div>
    
    <div v-else class="p-4">
      <p>Loading order details...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useFindUniqueOrder, useUpdateOrder, useFindManyOrderStatusLog, useFindManyItemStatusLog } from '~/lib/hooks';
import { OrderSystemStatus, OrderItemProcessingStatus, OrderPriority } from '@prisma-app/client';
import { useRouter } from 'vue-router';
import PackingSlip from '~/components/admin/PackingSlip.vue';

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const orderId = route.params.id as string;
const isSyncing = ref(false);

// Data fetching
const { data: order, refetch: refetchOrder } = useFindUniqueOrder({
  where: { id: orderId },
  include: { 
    customer: true, 
    items: {
      include: {
        item: true, // Also include the item details for each order item
      }
    },
    estimate: true, // Include the full estimate object
  },
});

// Fetch order activity logs
const { data: orderLogs, refetch: refetchOrderLogs } = useFindManyOrderStatusLog({
  where: { orderId },
  orderBy: { timestamp: 'desc' },
  include: {
    user: {
      select: { name: true, email: true }
    }
  }
});

// Fetch item activity logs
const { data: itemLogs, refetch: refetchItemLogs } = useFindManyItemStatusLog({
  where: { 
    orderItem: { 
      orderId 
    } 
  },
  orderBy: { timestamp: 'desc' },
  include: {
    user: {
      select: { name: true, email: true }
    },
    orderItem: {
      include: {
        item: {
          select: { name: true }
        }
      }
    }
  }
});

// Admin check
const isAdmin = computed(() => {
  // This is a simple check - you might want to enhance this based on your auth system
  return true; // For now, assume all users can edit
});

// Item status editing
const isEditingItem = ref(false);
const editingItemId = ref<string | null>(null);
const editingItemStatus = ref<OrderItemProcessingStatus | ''>('');
const isSavingItem = ref(false);

// Item status options
const itemStatusOptions = Object.values(OrderItemProcessingStatus);

// Item activity filtering
const selectedItemFilter = ref('');
const selectedStatusFilter = ref('');
const filteredItemLogs = computed(() => {
  if (!itemLogs.value) return [];
  
  let filtered = itemLogs.value;
  
  // Filter by item
  if (selectedItemFilter.value) {
    filtered = filtered.filter(log => log.orderItem?.id === selectedItemFilter.value);
  }
  
  // Filter by status
  if (selectedStatusFilter.value) {
    filtered = filtered.filter(log => log.toStatus === selectedStatusFilter.value);
  }
  
  return filtered;
});

// Form state
const form = ref({
  orderStatus: order.value?.orderStatus,
  priority: order.value?.priority,
  notes: order.value?.notes,
});

const orderSystemStatusOptions = Object.values(OrderSystemStatus);
const orderPriorityOptions = Object.values(OrderPriority);

watch(order, (newOrder) => {
  if (newOrder) {
    form.value.orderStatus = newOrder.orderStatus;
    form.value.notes = newOrder.notes;
  }
}, { immediate: true });

// Update logic
const updateOrderMutation = useUpdateOrder();
const isSaving = ref(false);

async function saveChanges() {
  if (!order.value) return;
  isSaving.value = true;
  try {
    await updateOrderMutation.mutateAsync({
      where: { id: orderId },
      data: {
        orderStatus: form.value.orderStatus,
        notes: form.value.notes,
      },
    });
    toast.success({ title: 'Order Updated', message: 'Order details have been saved successfully.' });
    refetchOrder();
    // Refresh activity logs to show the new status change
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Update Failed', message: e.message || 'Could not save order details.' });
  } finally {
    isSaving.value = false;
  }
}

async function syncOrder() {
  if (!order.value?.quickbooksOrderId) {
    toast.error({ title: 'Sync Failed', message: 'This order does not have a QuickBooks ID.' });
    return;
  }

  isSyncing.value = true;
  toast.info({ title: 'Sync Started', message: `Syncing Order #${order.value.salesOrderNumber} with QuickBooks...`});
  try {
    await $fetch('/api/qbo/sync/single', {
      method: 'POST',
      body: {
        resourceType: 'Invoice',
        resourceId: order.value.quickbooksOrderId,
      },
    });
    toast.success({ title: 'Sync Complete', message: 'Order data has been updated from QuickBooks.' });
    refetchOrder();
  } catch (error) {
    const e = error as Error & { data?: { data?: { message?: string } } };
    console.error('Failed to sync order:', e);
    toast.error({ title: 'Sync Failed', message: e.data?.data?.message || 'An unexpected error occurred.' });
  } finally {
    isSyncing.value = false;
  }
}

function goToEstimate() {
  if (order.value?.estimate?.id) {
    router.push(`/admin/estimates/view/${order.value.estimate.id}`);
  }
}

function refreshActivityLogs() {
  refetchOrderLogs();
  refetchItemLogs();
}

function resetForm() {
  if (order.value) {
    form.value.orderStatus = order.value.orderStatus;
    form.value.notes = order.value.notes;
  }
}

// Item status editing functions
function startEditItem(item: { id: string; itemStatus: OrderItemProcessingStatus }) {
  editingItemId.value = item.id;
  editingItemStatus.value = item.itemStatus;
  isEditingItem.value = true;
}

function cancelEditItem() {
  editingItemId.value = null;
  editingItemStatus.value = '';
  isEditingItem.value = false;
}

async function saveItemStatus(orderItemId: string) {
  if (!editingItemStatus.value) return;
  
  isSavingItem.value = true;
  try {
    // Update the order item status
    await $fetch(`/api/model/OrderItem/${orderItemId}`, {
      method: 'PUT',
      body: {
        itemStatus: editingItemStatus.value,
      },
    });
    
    // Log the status change
    await $fetch('/api/tracking/log-item-status', {
      method: 'POST',
      body: {
        orderItemId,
        fromStatus: order.value?.items.find((item: { id: string; itemStatus: OrderItemProcessingStatus }) => item.id === orderItemId)?.itemStatus,
        toStatus: editingItemStatus.value,
        userId: undefined, // Will be set by the backend based on current user
        changeReason: 'Admin manually updated item status',
        triggeredBy: 'manual',
        notes: `Status changed by admin from order view`,
      },
    });
    
    toast.success({ 
      title: 'Item Status Updated', 
      message: 'Item status has been updated successfully.' 
    });
    
    // Refresh data
    refetchOrder();
    refreshActivityLogs();
    
    // Exit edit mode
    cancelEditItem();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Update Failed', message: e.message || 'Could not update item status.' });
  } finally {
    isSavingItem.value = false;
  }
}

// Item activity filtering functions
function filterItemLogs() {
  // The filtering is handled by the computed property
  // This function is called when filters change
}

function clearItemFilters() {
  selectedItemFilter.value = '';
  selectedStatusFilter.value = '';
}
</script> 