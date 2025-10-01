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
            <button
              :disabled="!order.trackingNumber"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="openTrackingEmailModal"
            >
              <Icon name="heroicons:envelope" class="mr-2 h-4 w-4" />
              Send Tracking
            </button>
          </div>
        </div>

        <!-- Tracking Number Section -->
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
          <div class="flex items-center space-x-6">
            <div class="flex-1">
              <label for="trackingNumber" class="block text-sm font-medium text-gray-700 mb-2">Tracking Number</label>
              <div class="flex items-center space-x-3">
                <input
                  id="trackingNumber"
                  v-model="form.trackingNumber"
                  type="text"
                  placeholder="Enter tracking number (e.g., 1Z999AA1234567890)"
                  class="flex-1 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  :disabled="isSavingTracking || form.trackingNumber === order?.trackingNumber"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveTrackingNumber"
                >
                  <Icon v-if="isSavingTracking" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingTracking ? 'Saving...' : 'Save Tracking' }}
                </button>
                <button
                  v-if="form.trackingNumber !== order?.trackingNumber"
                  type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.trackingNumber = order?.trackingNumber"
                >
                  Cancel
                </button>
              </div>
            </div>
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
                  :disabled="isSavingStatus || form.orderStatus === order?.orderStatus"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveOrderStatus"
                >
                  <Icon v-if="isSavingStatus" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingStatus ? 'Saving...' : 'Save Status' }}
                </button>
                <button
                  v-if="form.orderStatus !== order?.orderStatus"
                  type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.orderStatus = order?.orderStatus"
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
                  :disabled="isSavingPriority || form.priority === order?.priority"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveOrderPriority"
                >
                  <Icon v-if="isSavingPriority" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingPriority ? 'Saving...' : 'Save Priority' }}
                </button>
                <button
                  v-if="form.priority !== order?.priority"
                  type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.priority = order?.priority"
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
                  :disabled="isSavingNotes || form.notes === order?.notes"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveOrderNotes"
                >
                  <Icon v-if="isSavingNotes" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingNotes ? 'Saving...' : 'Save Notes' }}
                </button>
                <button
                  v-if="form.notes !== order?.notes"
                  type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.notes = order?.notes"
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

          <!-- Order Items Section -->
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-800">Order Items</h2>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">
                  {{ order.items?.length || 0 }} items
                </span>
                <button
                  v-if="order.orderStatus === 'PENDING'"
                  :disabled="!canVerifyOrder()"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="verifyAllProducts"
                >
                  <Icon name="heroicons:check-circle" class="mr-2 h-4 w-4" />
                  Verify All Products
                </button>
              </div>
            </div>

            <!-- Order Items Table -->
            <div v-if="order.items && order.items.length > 0" class="overflow-x-auto">
              <div class="min-w-full inline-block align-middle">
                <div class="overflow-hidden border border-gray-200 rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                        <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Is Product
                        </th>
                        <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                      <tr v-for="orderItem in order.items" :key="orderItem.id" class="hover:bg-gray-50">
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div class="text-sm font-medium text-gray-900">
                              {{ orderItem.item?.name || 'Unknown Item' }}
                            </div>
                            <div v-if="orderItem.quickbooksOrderLineId" class="text-xs text-gray-500">
                              QBO Line: {{ orderItem.quickbooksOrderLineId }}
                            </div>
                          </div>
                        </td>
                        <td class="px-3 sm:px-6 py-4">
                          <div class="text-sm text-gray-900 max-w-xs">
                            <div v-if="orderItem.lineDescription" class="break-words">
                              {{ orderItem.lineDescription }}
                            </div>
                            <div v-else class="text-gray-400 italic">
                              No description
                            </div>
                          </div>
                        </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ orderItem.quantity }}
                        </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(orderItem.pricePerItem) }}
                        </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <label class="flex items-center">
                            <input
                              :checked="isItemMarkedAsProduct(orderItem)"
                              type="checkbox"
                              class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                              :disabled="order.orderStatus !== 'PENDING'"
                              @change="updateOrderItemIsProduct(orderItem.id, $event.target.checked)"
                            >
                            <span class="hidden sm:inline ml-2 text-sm text-gray-700">Production Item</span>
                            <span class="sm:hidden ml-2 text-sm text-gray-700">Product</span>
                          </label>
                    </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            :class="getItemStatusDisplay(orderItem).class"
                          >
                            {{ getItemStatusDisplay(orderItem).text }}
                          </span>
                          <div v-if="!isItemMarkedAsProduct(orderItem)" class="mt-1 text-xs text-gray-500">
                            No production workflow required
                          </div>
                        </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div class="flex items-center space-x-2">
                            <!-- Mobile-friendly Actions Dropdown -->
                            <div class="relative md:hidden">
                        <button
                                @click="openActionsMenu(orderItem.id)"
                                class="inline-flex items-center px-2 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <Icon name="heroicons:ellipsis-horizontal" class="h-4 w-4" />
                                <span class="ml-1">Actions</span>
                              </button>
                              
                              <!-- Actions Dropdown Menu -->
                              <div
                                v-if="openActionsMenuId === orderItem.id"
                                class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10"
                              >
                                <div class="py-1">
                                  <!-- View/Edit Product Attributes -->
                                  <button
                                    v-if="isItemMarkedAsProduct(orderItem)"
                                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    @click="openProductAttributesModal(orderItem); closeActionsMenu()"
                                  >
                                    <Icon name="heroicons:eye" class="mr-3 h-4 w-4" />
                                    View Attributes
                                  </button> 
                                  
                                  <!-- Edit Status -->
                                  <button
                                    v-if="isItemMarkedAsProduct(orderItem)"
                                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                    @click="startEditItem(orderItem); closeActionsMenu()"
                                  >
                                    <Icon name="heroicons:pencil" class="mr-3 h-4 w-4" />
                          Edit Status
                        </button>

                                  <!-- Verify Product -->
                                  <button
                                    v-if="isItemMarkedAsProduct(orderItem) && orderItem.productAttributes && !orderItem.productAttributes.verified"
                                    class="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center"
                                    @click="verifyProduct(orderItem); closeActionsMenu()"
                                  >
                                    <Icon name="heroicons:check-circle" class="mr-3 h-4 w-4" />
                                    Verify Product
                                  </button>
                                  <button
                                    v-else-if="isItemMarkedAsProduct(orderItem) && orderItem.productAttributes?.verified"
                                    class="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center"
                                    @click="updateProductVerification(orderItem.productAttributes.id, false); closeActionsMenu()"
                                  >
                                    <Icon name="heroicons:check" class="mr-3 h-4 w-4" />
                                    Verified ✓
                                  </button>
                      </div>
                              </div>
                            </div>
                            
                            <!-- Desktop Actions (hidden on mobile) -->
                            <div class="hidden md:flex items-center space-x-2">
                              <!-- View/Edit Product Attributes Button -->
                        <button
                                v-if="isItemMarkedAsProduct(orderItem)"
                                class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                @click="openProductAttributesModal(orderItem)"
                              >
                                <Icon name="heroicons:eye" class="mr-1 h-3 w-3" />
                                View Attributes
                        </button>
                              
                              <!-- Verify Product Button -->
                        <button
                                v-if="isItemMarkedAsProduct(orderItem) && orderItem.productAttributes && !orderItem.productAttributes.verified"
                                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                @click="verifyProduct(orderItem)"
                              >
                                <Icon name="heroicons:check" class="mr-1 h-3 w-3" />
                                Verify
                              </button>
                              <button
                                v-else-if="isItemMarkedAsProduct(orderItem) && orderItem.productAttributes?.verified"
                                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-600 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                @click="updateProductVerification(orderItem.productAttributes.id, false)"
                              >
                                <Icon name="heroicons:check" class="mr-1 h-3 w-3" />
                                Verified ✓
                              </button>
                              
                              <!-- Edit Status Button -->
                              <button
                                v-if="isItemMarkedAsProduct(orderItem)"
                                class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                @click="startEditItem(orderItem)"
                              >
                                <Icon name="heroicons:pencil" class="mr-1 h-3 w-3" />
                                Edit Status
                        </button>
                            </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
                </div>
            </div>
          </div>

            <div v-else class="text-center py-8 text-gray-500">
              <Icon name="heroicons:cube" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No items found for this order</p>
              </div>
          </div>

          <!-- Order Activity Log -->
          <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-800">Order Activity Log</h2>
              <!-- <button 
                class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                @click="testLogging"
              >
                <Icon name="heroicons:arrow-path" class="mr-2 h-4 w-4" />
                Test Logging
              </button> -->
            </div>
            <div v-if="combinedOrderLogs && combinedOrderLogs.length > 0" class="space-y-4 overflow-y-auto max-h-[580px]">
              <div v-for="log in combinedOrderLogs" :key="`${log.type}-${log.id}`" class="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <span class="text-sm font-medium text-gray-900">
                        {{ log.displayText }}
                      </span>
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
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
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
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

        <!-- Packing Slip Section (Only show if there are production items) -->
        <div v-if="productionItems && productionItems.length > 0" class="bg-white p-6 rounded-lg shadow mt-6">
          <div class="mb-4">
            <h2 class="text-xl font-semibold text-gray-800 mb-2">Packing Slips</h2>
            
            <!-- Show approval message if order is pending -->
            <div v-if="order.orderStatus === 'PENDING'" class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <div class="flex">
                <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div class="text-sm text-yellow-800">
                  <p class="font-medium mb-1">Order Approval Required</p>
                  <p>This order needs to be approved before packing slips can be generated. Please change the order status to "APPROVED" to enable packing slip printing.</p>
                </div>
              </div>
            </div>
            
            <!-- Show packing slip component only if order is approved -->
            <div v-else>
              <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <div class="flex">
                  <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                  <div class="text-sm text-blue-800">
                    <p class="font-medium mb-1">Barcode Information:</p>
                    <p>Each production item generates a unique barcode in the format: <code class="bg-blue-100 px-1 rounded">OrderNumber-ItemId</code></p>
                    <p class="mt-1">These barcodes can be scanned at the warehouse kiosk to quickly pull up order and item details.</p>
                  </div>
                </div>
              </div>

              <!-- Label Format Toggle -->
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-800">Label Format</h3>
                <div class="flex items-center space-x-4">
                  <label class="inline-flex items-center">
                    <input
                      type="radio"
                      :value="false"
                      v-model="useSplitLabels"
                      class="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span class="ml-2 text-sm text-gray-700">Standard Packing Slip (4"x6")</span>
                  </label>
                  <label class="inline-flex items-center">
                    <input
                      type="radio"
                      :value="true"
                      v-model="useSplitLabels"
                      class="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span class="ml-2 text-sm text-gray-700">Split Labels (3"x3" + 2"x3")</span>
                  </label>
                </div>
              </div>

              <!-- Standard Packing Slip -->
              <div v-if="!useSplitLabels">
                <PackingSlip :order="order" @print-confirmation="handlePrintConfirmation" />
              </div>

              <!-- Split Labels -->
              <div v-else>
                <div class="space-y-6">
                  <div 
                    v-for="orderItem in productionItems" 
                    :key="orderItem.id"
                    class="border border-gray-200 rounded-lg p-4"
                  >
                    <SplitLabel 
                      :order-item="orderItem" 
                      :order="order"
                      :show-preview="true"
                    />
                  </div>
                  
                  <!-- No Production Items Message -->
                  <div v-if="productionItems.length === 0" class="text-center py-8 text-gray-500">
                    <Icon name="heroicons:cube" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>No production items found for this order.</p>
                    <p class="text-sm">Mark items as production items to generate split labels.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
    <div v-else class="p-4">
      <p>Loading order details...</p>
    </div>
    <!-- Product Attributes Modal -->
    <AppModal 
      :isOpen="showProductAttributesModal"
      @close="closeProductAttributesModal"
      title="Product Attributes"
      class="min-w-[800px]"> 
      <div v-if="selectedOrderItem" class="space-y-6">
        <!-- Invoice Description -->
        <div class="bg-gray-50 p-4 rounded-md">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Invoice Line Description</h4>
          <p class="text-sm text-gray-600 font-mono bg-white p-3 rounded border">
            {{ selectedOrderItem.lineDescription || 'No description available' }}
          </p>
  </div>

        <!-- Product Type Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Product Type *</label>
          <select
            v-model="productAttributes.productType"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="handleProductTypeChange"
          >
            <option value="">Select Product Type</option>
            <option value="SPA_COVER">Spa Cover</option>
            <option value="COVER_FOR_COVER">Cover for Cover</option>
          </select>
        </div>

        <!-- Core Attributes -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <input
              v-model="productAttributes.color"
              type="text"
              placeholder="e.g., Dark Gray, Navy Blue"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Size</label>
            <input
              v-model="productAttributes.size"
              type="text"
              placeholder="e.g., 93X93"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Shape</label>
            <select
              v-model="productAttributes.shape"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Shape</option>
              <option value="Round">Round</option>
              <option value="Octagon">Octagon</option>
              <option value="Square">Square</option>
              <option value="Rectangle">Rectangle</option>
              <option value="custom">Custom (specify below)</option>
            </select>
            
            <!-- Show current value -->
            <div v-if="productAttributes.shape" class="mt-1 text-sm text-gray-600">
              <span class="font-medium">Current:</span> {{ currentShapeValue }}
            </div>
            
            <input
              v-if="productAttributes.shape === 'custom'"
              ref="customShapeInput"
              v-model="customShape"
              type="text"
              placeholder="Enter custom shape"
              class="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div v-if="showRadiusField">
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ radiusFieldLabel }}</label>
            <input
              v-model="productAttributes.radiusSize"
              type="text"
              :placeholder="productAttributes.shape === 'Octagon' ? 'e.g., 8' : 'e.g., 12'"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div v-if="showLengthWidthFields">
            <label class="block text-sm font-medium text-gray-700 mb-2">Length</label>
            <input
              v-model="productAttributes.length"
              type="text"
              placeholder="e.g., 12"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div v-if="showLengthWidthFields">
            <label class="block text-sm font-medium text-gray-700 mb-2">Width</label>
            <input
              v-model="productAttributes.width"
              type="text"
              placeholder="e.g., 8"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Length</label>
            <input
              v-model="productAttributes.skirtLength"
              type="text"
              placeholder="e.g., 5"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Type</label>
            <select
              v-model="productAttributes.skirtType"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Skirt Type</option>
              <option value="CONN">Connected</option>
              <option value="SLIT">Slit</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tie Downs Quantity</label>
            <input
              v-model="productAttributes.tieDownsQty"
              type="text"
              placeholder="e.g., 6"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tie Down Placement</label>
            <select
              v-model="productAttributes.tieDownPlacement"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Placement</option>
              <option value="HANDLE_SIDE">Handle Side</option>
              <option value="CORNER_SIDE">Corner Side</option>
              <option value="FOLD_SIDE">Fold Side</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Distance</label>
            <input
              v-model="productAttributes.distance"
              type="text"
              placeholder="e.g., 0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
        </div>

        <!-- Upgrades Section -->
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-3">Upgrades</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Foam Upgrade</label>
              <select
                v-model="productAttributes.foamUpgrade"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Foam Upgrade</option>
                <option value="2#">2#</option>
                <option value="5-2.5">5-2.5</option>
                <option value="6-4">6-4</option>
                <option value="4-5-4">4-5-4</option>
                <option value="54&quot;">54"</option>
                <option value="custom">Custom (specify below)</option>
              </select>
              
              <!-- Show current value -->
              <div v-if="productAttributes.foamUpgrade" class="mt-1 text-sm text-gray-600">
                <span class="font-medium">Current:</span> {{ currentFoamUpgradeValue }}
              </div>
              
              <input
                v-if="productAttributes.foamUpgrade === 'custom'"
                ref="customFoamUpgradeInput"
                v-model="customFoamUpgrade"
                type="text"
                placeholder="Enter custom foam upgrade specification"
                class="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                @input="updateCustomFoamUpgrade"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Double Plastic Wrap</label>
              <select
                v-model="productAttributes.doublePlasticWrapUpgrade"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Webbing Upgrade</label>
              <select
                v-model="productAttributes.webbingUpgrade"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Metal for Lifter</label>
              <select
                v-model="productAttributes.metalForLifterUpgrade"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Steam Stopper</label>
              <select
                v-model="productAttributes.steamStopperUpgrade"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Fabric Upgrade</label>
              <select
                v-model="productAttributes.fabricUpgrade"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Special Attributes -->
        <div>
          <h4 class="text-md font-medium text-gray-900 mb-3">Special Attributes</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Extra Handle Quantity</label>
              <input
                v-model="productAttributes.extraHandleQty"
                type="text"
                placeholder="e.g., 0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Extra Long Skirt</label>
              <select
                v-model="productAttributes.extraLongSkirt"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Auto-calculated</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Packaging</label>
              <div class="flex items-center">
                <input
                  v-model="productAttributes.packaging"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label class="ml-2 text-sm text-gray-700">Requires packaging</label>
              </div>
              <div v-if="productAttributes.productType === 'COVER_FOR_COVER'" class="mt-1 text-xs text-blue-600">
                <Icon name="heroicons:information-circle" class="inline mr-1 h-3 w-3" />
                Cover for Cover should always require packaging
              </div>
            </div>
          </div>
        </div>

        <!-- Notes Section -->
        <div class="mt-6">
          <h4 class="text-md font-medium text-gray-900 mb-3">Notes</h4>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Product Notes</label>
            <textarea
              v-model="productAttributes.notes"
              rows="3"
              placeholder="Enter any additional notes for this product..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
        </div>

        <!-- Parsing Errors (if any) -->
        <div v-if="parsingErrors.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h4 class="text-sm font-medium text-yellow-800 mb-2">Parsing Warnings</h4>
          <ul class="text-sm text-yellow-700 space-y-1">
            <li v-for="error in parsingErrors" :key="error" class="flex items-start">
              <Icon name="heroicons:exclamation-triangle" class="mr-2 h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              {{ error }}
            </li>
          </ul>
        </div>
        
        <!-- Footer with Save/Cancel buttons -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="closeProductAttributesModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            :disabled="!productAttributes.productType || isSavingAttributes"
            @click="saveProductAttributes"
          >
            <Icon v-if="isSavingAttributes" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isSavingAttributes ? 'Saving...' : 'Save Attributes' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Status Editing Modal -->
    <AppModal
      :is-open="showStatusEditModal"
      title="Edit Item Status"
      @close="closeStatusEditModal"
    >
      <div class="p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Item</label>
          <p class="text-sm text-gray-900 font-medium">{{ editingItem?.item?.name || 'Unknown Item' }}</p>
        </div>
        
        <div class="mb-6">
          <label for="statusSelect" class="block text-sm font-medium text-gray-700 mb-2">Production Status</label>
          <select 
            id="statusSelect"
            v-model="editingItemStatus" 
            class="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
          >
            <option v-for="status in itemStatusOptions" :key="status" :value="status">
              {{ status.replace(/_/g, ' ') }}
            </option>
          </select>
          <p class="mt-1 text-xs text-gray-500">
            Select the current production status for this item
          </p>
        </div>

        <!-- Status Description -->
        <div class="mb-6 p-3 bg-gray-50 rounded-md">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Status Workflow</h4>
          <div class="text-xs text-gray-600 space-y-1">
            <div class="flex items-center">
              <span class="w-20 text-yellow-600 font-medium">NOT STARTED</span>
              <span>→ Item is pending production</span>
            </div>
            <div class="flex items-center">
              <span class="w-20 text-blue-600 font-medium">CUTTING</span>
              <span>→ Item is being cut</span>
            </div>
            <div class="flex items-center">
              <span class="w-20 text-purple-600 font-medium">SEWING</span>
              <span>→ Item is being sewn</span>
            </div>
            <div class="flex items-center">
              <span class="w-20 text-indigo-600 font-medium">FOAM CUTTING</span>
              <span>→ Foam is being cut</span>
            </div>
            <div class="flex items-center">
              <span class="w-20 text-orange-600 font-medium">STUFFING</span>
              <span>→ Item is being stuffed</span>
            </div>
            <div class="flex items-center">
              <span class="w-20 text-pink-600 font-medium">PACKAGING</span>
              <span>→ Item is being packaged</span>
            </div>
            <div class="flex items-center">
              <span class="w-20 text-green-600 font-medium">READY</span>
              <span>→ Item is complete</span>
            </div>
          </div>
        </div>
        
        <!-- Footer with Save/Cancel buttons -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="closeStatusEditModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!editingItemStatus || isSavingItem"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="saveItemStatusFromModal"
          >
            <Icon v-if="isSavingItem" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isSavingItem ? 'Saving...' : 'Save Status' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Tracking Email Modal -->
    <AppModal
      :isOpen="isTrackingEmailModalOpen"
      title="Send Tracking Information"
      @close="closeTrackingEmailModal"
    >
      <div class="space-y-4">
        <div>
          <label for="trackingEmail" class="block text-sm font-medium text-gray-700 mb-2">
            Customer Email
          </label>
          <input
            id="trackingEmail"
            v-model="trackingEmailForm.email"
            type="email"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="customer@example.com"
          />
        </div>
        
        <div>
          <label for="trackingSubject" class="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <input
            id="trackingSubject"
            v-model="trackingEmailForm.subject"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Your order tracking information"
          />
        </div>
        
        <div>
          <label for="trackingMessage" class="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            id="trackingMessage"
            v-model="trackingEmailForm.message"
            rows="6"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Dear Customer,&#10;&#10;Your order has been shipped!&#10;&#10;Tracking Number: {{ order.trackingNumber }}&#10;&#10;You can track your package at: [carrier website]&#10;&#10;Thank you for your business!"
          />
        </div>
        
        <div class="bg-blue-50 p-3 rounded-md">
          <p class="text-sm text-blue-800">
            <strong>Note:</strong> Email functionality will be implemented in a future update. 
            For now, this will just log the tracking information.
          </p>
        </div>
        
        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            @click="closeTrackingEmailModal"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isSendingTrackingEmail"
            @click="sendTrackingEmail"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <Icon v-if="isSendingTrackingEmail" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isSendingTrackingEmail ? 'Sending...' : 'Send Email' }}
          </button>
        </div>
      </div>
    </AppModal>
  </div>
  

</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import { useFindUniqueOrder, useUpdateOrder, useFindManyOrderStatusLog, useFindManyItemStatusLog, useFindManyAuditLog, useUpdateOrderItem } from '~/lib/hooks';
import { OrderSystemStatus, OrderItemProcessingStatus, OrderPriority } from '@prisma-app/client';
import { useRouter } from 'vue-router';
import PackingSlip from '~/components/admin/PackingSlip.vue';
import SplitLabel from '~/components/admin/SplitLabel.vue';
import AppModal from '~/components/AppModal.vue';

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const orderId = route.params.id as string;
const isSyncing = ref(false);
const useSplitLabels = ref(false);

// Data fetching
const { data: order, refetch: refetchOrder } = useFindUniqueOrder({
  where: { id: orderId },
  include: { 
    customer: true, 
    items: {
      include: {
        item: true, // Also include the item details for each order item
        productAttributes: true, // Include product attributes for each order item
      }
    },
    estimate: true, // Include the full estimate object
  },
});

// Get only production items (items marked as products)
const productionItems = computed(() => {
  if (!order.value?.items) return [];
  
  return order.value.items.filter((item: any) => {
    // Check if item has productAttributes (meaning it's marked as a product)
    return item.productAttributes !== null;
  });
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

// Fetch audit logs for this order
const { data: auditLogs, refetch: refetchAuditLogs } = useFindManyAuditLog({
  where: { 
    entityName: 'Order',
    entityId: orderId 
  },
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

// Combined activity logs (order status + audit logs)
const combinedOrderLogs = computed(() => {
  const logs = [];
  
  console.log('Order Logs:', orderLogs.value);
  console.log('Audit Logs:', auditLogs.value);
  
  // Add order status logs
  if (orderLogs.value) {
    logs.push(...orderLogs.value.map(log => ({
      ...log,
      type: 'status',
      displayText: `${log.fromStatus || 'CREATED'} → ${log.toStatus}`,
      action: 'Status Change'
    })));
  }
  
  // Add audit logs
  if (auditLogs.value) {
    logs.push(...auditLogs.value.map(log => ({
      ...log,
      type: 'audit',
      displayText: log.action.replace('ORDER_', '').replace(/_/g, ' '),
      action: log.action.replace('ORDER_', '').replace(/_/g, ' '),
      fromStatus: log.oldValue,
      toStatus: log.newValue,
      changeReason: `Order ${log.action.replace('ORDER_', '').toLowerCase()} changed`,
      triggeredBy: 'manual'
    })));
  }
  
  // Sort by timestamp (newest first)
  const sortedLogs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  console.log('Combined Logs:', sortedLogs);
  
  return sortedLogs;
});

// Get only production items (items marked as products)
const productionItems = computed(() => {
  if (!order.value?.items) return [];
  
  return order.value.items.filter((item: any) => {
    // Check if item has productAttributes (meaning it's marked as a product)
    return item.productAttributes !== null;
  });
});

// Item status editing
const editingItemStatus = ref<OrderItemProcessingStatus | ''>('');
const isSavingItem = ref(false);

// Status Edit Modal
const showStatusEditModal = ref(false);
const editingItem = ref<any>(null);

// Local state for tracking which items are marked as products
const markedAsProducts = ref<Set<string>>(new Set());

// Actions menu
const openActionsMenuId = ref<string | null>(null);

// Product Attributes Modal
const showProductAttributesModal = ref(false);
const selectedOrderItem = ref<any>(null);
const isSavingAttributes = ref(false);
const parsingErrors = ref<string[]>([]);

// Product Attributes Form
const productAttributes = ref({
  productType: '',
  color: '',
  size: '',
  shape: '',
  radiusSize: '',
  length: '',
  width: '',
  skirtLength: '',
  skirtType: '',
  tieDownsQty: '',
  tieDownPlacement: '',
  distance: '',
  foamUpgrade: '',
  doublePlasticWrapUpgrade: 'No',
  webbingUpgrade: 'No',
  metalForLifterUpgrade: 'No',
  steamStopperUpgrade: 'No',
  fabricUpgrade: 'No',
  extraHandleQty: '',
  extraLongSkirt: '',
  packaging: false,
  notes: '',
});

// Custom foam upgrade input (separate from the select)
const customFoamUpgrade = ref('');
const customFoamUpgradeInput = ref<HTMLInputElement | null>(null);

// Custom shape input (separate from the select)
const customShape = ref('');
const customShapeInput = ref<HTMLInputElement | null>(null);

// Computed property to show the current foam upgrade value
const currentFoamUpgradeValue = computed(() => {
  if (productAttributes.value.foamUpgrade === 'custom') {
    return customFoamUpgrade.value || 'Custom';
  }
  return productAttributes.value.foamUpgrade;
});

// Computed property to show the current shape value
const currentShapeValue = computed(() => {
  if (productAttributes.value.shape === 'custom') {
    return customShape.value || 'Custom';
  }
  return productAttributes.value.shape || 'No Shape Selected';
});

// Computed property for radius/side length label
const radiusFieldLabel = computed(() => {
  if (productAttributes.value.shape === 'Octagon') {
    return 'Side Length';
  }
  return 'Radius Size';
});

// Computed property to show length/width fields for square and rectangle
const showLengthWidthFields = computed(() => {
  return productAttributes.value.shape === 'Square' || productAttributes.value.shape === 'Rectangle';
});

// Computed property to show radius field for round and octagon
const showRadiusField = computed(() => {
  return productAttributes.value.shape === 'Round' || productAttributes.value.shape === 'Octagon';
});

// Function to get the appropriate status display for an order item
function getItemStatusDisplay(orderItem: any) {
  if (!isItemMarkedAsProduct(orderItem)) {
    return {
      text: 'No Production Required',
      class: 'bg-gray-100 text-gray-600'
    };
  }
  
  const status = orderItem.itemStatus;
  if (!status) {
    return {
      text: 'Unknown',
      class: 'bg-gray-100 text-gray-600'
    };
  }
  
  const statusConfig = {
    'NOT_STARTED_PRODUCTION': { text: 'NOT STARTED PRODUCTION', class: 'bg-yellow-100 text-yellow-800' },
    'CUTTING': { text: 'CUTTING', class: 'bg-blue-100 text-blue-800' },
    'SEWING': { text: 'SEWING', class: 'bg-purple-100 text-purple-800' },
    'FOAM_CUTTING': { text: 'FOAM CUTTING', class: 'bg-indigo-100 text-indigo-800' },
    'STUFFING': { text: 'STUFFING', class: 'bg-orange-100 text-orange-800' },
    'PACKAGING': { text: 'PACKAGING', class: 'bg-pink-100 text-pink-800' },
    'READY': { text: 'READY', class: 'bg-green-100 text-green-800' }
  };
  
  return statusConfig[status] || { text: status.replace(/_/g, ' '), class: 'bg-gray-100 text-gray-600' };
}

// Function to update the foam upgrade when custom input changes
function updateCustomFoamUpgrade() {
  // Don't change the select value - keep it as "custom"
  // The custom input value will be used when saving
}

// Watch for changes in foam upgrade select to handle custom input
watch(() => productAttributes.value.foamUpgrade, (newValue) => {
  if (newValue === 'custom') {
    // When "custom" is selected, clear the custom input
    customFoamUpgrade.value = '';
  } else {
    // When any predefined option is selected, clear the custom input
    customFoamUpgrade.value = '';
  }
});

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
  trackingNumber: order.value?.trackingNumber,
});

const orderSystemStatusOptions = Object.values(OrderSystemStatus);
const orderPriorityOptions = Object.values(OrderPriority);

// Tracking email modal state
const isTrackingEmailModalOpen = ref(false);
const isSendingTrackingEmail = ref(false);
const trackingEmailForm = ref({
  email: '',
  subject: '',
  message: ''
});

// Initialize markedAsProducts from existing productAttributes
watch(order, (newOrder) => {
  if (newOrder) {
    markedAsProducts.value = new Set(
      newOrder.items
        .filter(item => item.productAttributes !== null)
        .map(item => item.id)
    );
    
    // Update form values when order loads
    form.value.orderStatus = newOrder.orderStatus;
    form.value.priority = newOrder.priority;
    form.value.notes = newOrder.notes;
    form.value.trackingNumber = newOrder.trackingNumber;
  }
}, { immediate: true });

// Check if an item is marked as a product (either has productAttributes or is locally marked)
function isItemMarkedAsProduct(orderItem: any): boolean {
  return orderItem.productAttributes !== null || markedAsProducts.value.has(orderItem.id);
}

// Helper function to log order changes to activity log
async function logOrderChange(changeType: string, oldValue: any, newValue: any, additionalData?: any) {
  if (!order.value) return;
  
  try {
    await $fetch('/api/tracking/log-order-change', {
      method: 'POST',
      body: {
        orderId: order.value.id,
        changeType,
        oldValue: oldValue !== undefined ? oldValue : null,
        newValue: newValue !== undefined ? newValue : null,
        additionalData,
        userId: undefined, // Will be set by the backend based on current user
        changeReason: `Order ${changeType} changed by admin`,
        triggeredBy: 'manual',
        notes: `Changed from order view`,
      },
    });
  } catch (error) {
    console.error('Failed to log order change:', error);
    // Don't fail the main operation if logging fails
  }
}

// Update logic
const updateOrderMutation = useUpdateOrder();
const { mutateAsync: updateOrderItemMutation } = useUpdateOrderItem();
const isSaving = ref(false);
const isSavingStatus = ref(false);
const isSavingPriority = ref(false);
const isSavingNotes = ref(false);
const isSavingTracking = ref(false);

async function saveOrderStatus() {
  if (!order.value || !form.value.orderStatus) return;
  
  const oldStatus = order.value.orderStatus;
  const newStatus = form.value.orderStatus;
  
  isSavingStatus.value = true;
  try {
    await updateOrderMutation.mutateAsync({
      where: { id: orderId },
      data: {
        orderStatus: newStatus,
      },
    });
    
    // Log the status change
    await logOrderChange('STATUS', oldStatus, newStatus);
    
    toast.success({ title: 'Order Status Updated', message: 'Order status has been updated successfully.' });
    refetchOrder();
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Status Update Failed', message: e.message || 'Could not update order status.' });
  } finally {
    isSavingStatus.value = false;
  }
}

async function saveOrderPriority() {
  if (!order.value || !form.value.priority) return;
  
  const oldPriority = order.value.priority;
  const newPriority = form.value.priority;
  
  isSavingPriority.value = true;
  try {
    await updateOrderMutation.mutateAsync({
      where: { id: orderId },
      data: {
        priority: newPriority,
      },
    });
    
    // Log the priority change
    await logOrderChange('PRIORITY', oldPriority, newPriority);
    
    toast.success({ title: 'Order Priority Updated', message: 'Order priority has been updated successfully.' });
    refetchOrder();
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Priority Update Failed', message: e.message || 'Could not update order priority.' });
  } finally {
    isSavingPriority.value = false;
  }
}

async function saveOrderNotes() {
  if (!order.value) return;
  
  const oldNotes = order.value.notes;
  const newNotes = form.value.notes;
  
  isSavingNotes.value = true;
  try {
    await updateOrderMutation.mutateAsync({
      where: { id: orderId },
      data: {
        notes: newNotes,
      },
    });
    
    // Log the notes change
    await logOrderChange('NOTES', oldNotes, newNotes);
    
    toast.success({ title: 'Order Notes Updated', message: 'Order notes have been updated successfully.' });
    refetchOrder();
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Notes Update Failed', message: e.message || 'Could not update order notes.' });
  } finally {
    isSavingNotes.value = false;
  }
}

async function saveTrackingNumber() {
  if (!order.value) return;
  
  const oldTrackingNumber = order.value.trackingNumber;
  const newTrackingNumber = form.value.trackingNumber;
  
  isSavingTracking.value = true;
  try {
    await updateOrderMutation.mutateAsync({
      where: { id: orderId },
      data: {
        trackingNumber: newTrackingNumber,
      },
    });
    
    // Log the tracking number change
    await logOrderChange('TRACKING_NUMBER', oldTrackingNumber, newTrackingNumber);
    
    toast.success({ title: 'Tracking Number Updated', message: 'Tracking number has been updated successfully.' });
    refetchOrder();
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Update Failed', message: e.message || 'Could not update tracking number.' });
  } finally {
    isSavingTracking.value = false;
  }
}

// Legacy function for backward compatibility (can be removed if not needed elsewhere)
async function saveChanges() {
  if (!order.value) return;
  isSaving.value = true;
  try {
    await updateOrderMutation.mutateAsync({
      where: { id: orderId },
      data: {
        orderStatus: form.value.orderStatus,
        priority: form.value.priority,
        notes: form.value.notes,
      },
    });
    toast.success({ title: 'Order Updated', message: 'Order details have been saved successfully.' });
    refetchOrder();
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
  refetchAuditLogs();
}

function resetForm() {
  if (order.value) {
    form.value.orderStatus = order.value.orderStatus;
    form.value.priority = order.value.priority;
    form.value.notes = order.value.notes;
    form.value.trackingNumber = order.value.trackingNumber;
  }
}

// Item status editing functions
function startEditItem(item: { id: string; itemStatus: OrderItemProcessingStatus }) {
  editingItem.value = item;
  editingItemStatus.value = item.itemStatus;
  showStatusEditModal.value = true;
}

function closeStatusEditModal() {
  showStatusEditModal.value = false;
  editingItem.value = null;
  editingItemStatus.value = '';
}

// Tracking email modal functions
function openTrackingEmailModal() {
  if (!order.value) return;
  
  // Pre-populate the email form with customer email and default values
  trackingEmailForm.value.email = order.value.customer?.email || order.value.contactEmail || '';
  trackingEmailForm.value.subject = `Your order #${order.value.salesOrderNumber} tracking information`;
  trackingEmailForm.value.message = `Dear ${order.value.customer?.name || 'Valued Customer'},

Your order has been shipped!

Order Number: ${order.value.salesOrderNumber}
Tracking Number: ${order.value.trackingNumber}

You can track your package using the tracking number above at your carrier's website.

Thank you for your business!

Best regards,
The Team`;
  
  isTrackingEmailModalOpen.value = true;
}

function closeTrackingEmailModal() {
  isTrackingEmailModalOpen.value = false;
  trackingEmailForm.value = {
    email: '',
    subject: '',
    message: ''
  };
}

async function sendTrackingEmail() {
  if (!order.value || !trackingEmailForm.value.email || !trackingEmailForm.value.subject || !trackingEmailForm.value.message) {
    toast.error({ title: 'Validation Error', message: 'Please fill in all required fields.' });
    return;
  }
  
  isSendingTrackingEmail.value = true;
  try {
    // For now, just log the tracking email (actual email functionality will be implemented later)
    await logOrderChange('TRACKING_EMAIL_SENT', null, {
      email: trackingEmailForm.value.email,
      subject: trackingEmailForm.value.subject,
      message: trackingEmailForm.value.message,
      trackingNumber: order.value.trackingNumber
    });
    
    toast.success({ 
      title: 'Tracking Email Logged', 
      message: 'Tracking information has been logged. Email functionality will be implemented soon.' 
    });
    
    closeTrackingEmailModal();
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Error', message: e.message || 'Could not log tracking email.' });
  } finally {
    isSendingTrackingEmail.value = false;
  }
}

// Item activity filtering functions
function filterItemLogs() {
  // The filtering is handled by the computed property
  // This function is called when filters change
}

// Packing slip print confirmation handler
function handlePrintConfirmation(orderItem: any, printFunction: () => void) {
  // Check if the item is already in production (not NOT_STARTED_PRODUCTION)
  if (orderItem.itemStatus !== 'NOT_STARTED_PRODUCTION') {
    const statusText = orderItem.itemStatus.replace(/_/g, ' ');
    const confirmed = confirm(
      `This product (${orderItem.item?.name}) is already in production (Status: ${statusText}). ` +
      `This means a packing slip has been previously printed. ` +
      `Are you sure you want to print the packing slip again?`
    );
    
    if (confirmed) {
      printFunction();
    }
  } else {
    // Item is not in production yet, proceed with printing
    printFunction();
  }
}

function clearItemFilters() {
  selectedItemFilter.value = '';
  selectedStatusFilter.value = '';
}

// Test logging function
async function testLogging() {
  if (!order.value) return;
  
  try {
    await logOrderChange('TEST', 'old value', 'new value', { test: true });
    toast.success({ title: 'Test Log Created', message: 'Test log entry has been created successfully.' });
    refreshActivityLogs();
  } catch (error) {
    console.error('Test logging failed:', error);
    toast.error({ title: 'Test Failed', message: 'Failed to create test log entry.' });
  }
}

// Product Attributes Modal Functions
async function openProductAttributesModal(orderItem: any) {
  selectedOrderItem.value = orderItem;
  
  // If productAttributes exist, use them; otherwise parse from description
  let attrs = orderItem.productAttributes || {};
  
  // If no existing attributes, try to parse from lineDescription
  if (!orderItem.productAttributes && orderItem.lineDescription) {
    try {
      console.log(`🔍 Parsing description for order item: ${orderItem.lineDescription}`);
      
      // Import and use the client-side parser
      const { ProductDescriptionParser } = await import('~/utils/productDescriptionParser');
      const parsed = ProductDescriptionParser.parseDescription(orderItem.lineDescription);
      
      console.log(`✅ Parsed attributes:`, parsed.attributes);
      console.log(`⚠️ Parsing errors:`, parsed.errors);
      
      // Use parsed attributes as defaults
      attrs = {
        productType: parsed.attributes.productType || 'SPA_COVER',
        color: parsed.attributes.color || '',
        size: parsed.attributes.size || '',
        shape: parsed.attributes.shape || '',
        radiusSize: parsed.attributes.radiusSize || '',
        length: parsed.attributes.length || '',
        width: parsed.attributes.width || '',
        skirtLength: parsed.attributes.skirtLength || '',
        skirtType: parsed.attributes.skirtType || 'CONN',
        tieDownsQty: parsed.attributes.tieDownsQty || '',
        tieDownPlacement: parsed.attributes.tieDownPlacement || 'HANDLE_SIDE',
        distance: parsed.attributes.distance || '0',
        foamUpgrade: parsed.attributes.foamUpgrade || '',
        doublePlasticWrapUpgrade: parsed.attributes.doublePlasticWrapUpgrade || 'No',
        webbingUpgrade: parsed.attributes.webbingUpgrade || 'No',
        metalForLifterUpgrade: parsed.attributes.metalForLifterUpgrade || 'No',
        steamStopperUpgrade: parsed.attributes.steamStopperUpgrade || 'No',
        fabricUpgrade: parsed.attributes.fabricUpgrade || 'No',
        extraHandleQty: parsed.attributes.extraHandleQty || '0',
        extraLongSkirt: parsed.attributes.extraLongSkirt || '',
        packaging: parsed.attributes.packaging || false,
        notes: parsed.attributes.notes || '',
      };
      
      // Store parsing errors for display
      parsingErrors.value = parsed.errors;
      
    } catch (error) {
      console.error('❌ Error parsing description:', error);
      parsingErrors.value = ['Failed to parse description'];
      
      // Fall back to empty defaults
      attrs = {};
    }
  }
  
  // Set the form values
  productAttributes.value = {
    productType: attrs.productType || 'SPA_COVER',
    color: attrs.color || '',
    size: attrs.size || '',
    shape: attrs.shape || '',
    radiusSize: attrs.radiusSize || '',
    length: attrs.length || '',
    width: attrs.width || '',
    skirtLength: attrs.skirtLength || '',
    skirtType: attrs.skirtType || 'CONN',
    tieDownsQty: attrs.tieDownsQty || '',
    tieDownPlacement: attrs.tieDownPlacement || 'HANDLE_SIDE',
    distance: attrs.distance || '0',
    foamUpgrade: attrs.foamUpgrade || '',
    doublePlasticWrapUpgrade: attrs.doublePlasticWrapUpgrade || 'No',
    webbingUpgrade: attrs.webbingUpgrade || 'No',
    metalForLifterUpgrade: attrs.metalForLifterUpgrade || 'No',
    steamStopperUpgrade: attrs.steamStopperUpgrade || 'No',
    fabricUpgrade: attrs.fabricUpgrade || 'No',
    extraHandleQty: attrs.extraHandleQty || '0',
    extraLongSkirt: attrs.extraLongSkirt || '',
    packaging: attrs.packaging !== undefined ? attrs.packaging : (attrs.productType === 'COVER_FOR_COVER'),
    notes: attrs.notes || '',
  };
  
  // Handle custom foam upgrade field
  if (attrs.foamUpgrade && attrs.foamUpgrade !== 'custom' && !['2#', '5-2.5', '6-4', '4-5-4', '54"', ''].includes(attrs.foamUpgrade)) {
    // If it's a custom value (not from predefined options), set it in the custom input
    customFoamUpgrade.value = attrs.foamUpgrade;
    productAttributes.value.foamUpgrade = 'custom'; // Set select to "custom"
  } else if (attrs.foamUpgrade === 'custom') {
    customFoamUpgrade.value = '';
  } else {
    customFoamUpgrade.value = '';
  }
  
  // Handle custom shape field
  if (attrs.shape && attrs.shape !== 'custom' && !['Round', 'Octagon', 'Square', 'Rectangle'].includes(attrs.shape)) {
    // If it's a custom value (not from predefined options), set it in the custom input
    customShape.value = attrs.shape;
    productAttributes.value.shape = 'custom'; // Set select to "custom"
  } else if (attrs.shape === 'custom') {
    customShape.value = '';
  } else {
    customShape.value = '';
  }
  
  showProductAttributesModal.value = true;
}

function closeProductAttributesModal() {
  showProductAttributesModal.value = false;
  selectedOrderItem.value = null;
  productAttributes.value = {
    productType: '',
    color: '',
    size: '',
    shape: '',
    radiusSize: '',
    length: '',
    width: '',
    skirtLength: '',
    skirtType: '',
    tieDownsQty: '',
    tieDownPlacement: '',
    distance: '',
    foamUpgrade: '',
    doublePlasticWrapUpgrade: 'No',
    webbingUpgrade: 'No',
    metalForLifterUpgrade: 'No',
    steamStopperUpgrade: 'No',
    fabricUpgrade: 'No',
    extraHandleQty: '',
    extraLongSkirt: '',
    packaging: false,
    notes: '',
  };
  customFoamUpgrade.value = '';
  customShape.value = '';
  parsingErrors.value = [];
}

async function saveProductAttributes() {
  if (!selectedOrderItem.value) return;
  
  isSavingAttributes.value = true;
  
  try {
    // Prepare the data to save
    const dataToSave = {
      productType: productAttributes.value.productType,
      color: productAttributes.value.color,
      size: productAttributes.value.size,
      shape: productAttributes.value.shape === 'custom' ? customShape.value : productAttributes.value.shape,
      radiusSize: productAttributes.value.radiusSize,
      length: productAttributes.value.length,
      width: productAttributes.value.width,
      skirtLength: productAttributes.value.skirtLength,
      skirtType: productAttributes.value.skirtType,
      tieDownsQty: productAttributes.value.tieDownsQty,
      tieDownPlacement: productAttributes.value.tieDownPlacement,
      distance: productAttributes.value.distance,
      foamUpgrade: productAttributes.value.foamUpgrade === 'custom' ? customFoamUpgrade.value : productAttributes.value.foamUpgrade,
      doublePlasticWrapUpgrade: productAttributes.value.doublePlasticWrapUpgrade,
      webbingUpgrade: productAttributes.value.webbingUpgrade,
      metalForLifterUpgrade: productAttributes.value.metalForLifterUpgrade,
      steamStopperUpgrade: productAttributes.value.steamStopperUpgrade,
      fabricUpgrade: productAttributes.value.fabricUpgrade,
      extraHandleQty: productAttributes.value.extraHandleQty,
      extraLongSkirt: productAttributes.value.extraLongSkirt,
      packaging: productAttributes.value.packaging,
      notes: productAttributes.value.notes,
    };

    if (selectedOrderItem.value.productAttributes) {
      // Update existing ProductAttribute record
      await $fetch(`/api/admin/product-attributes/${selectedOrderItem.value.productAttributes.id}`, {
        method: 'PUT',
        body: dataToSave
      });
      
      // Log the product attributes update
      await logOrderChange('PRODUCT_ATTRIBUTES_UPDATE', 
        selectedOrderItem.value.productAttributes, 
        dataToSave,
        { orderItemId: selectedOrderItem.value.id, action: 'UPDATE' }
      );
      
      toast.success({ title: 'Attributes Updated', message: 'Product attributes have been updated successfully.' });
    } else {
      // Create new ProductAttribute record
      await $fetch('/api/admin/product-attributes', {
        method: 'POST',
        body: {
          orderItemId: selectedOrderItem.value.id,
          ...dataToSave,
          isParsedFromDescription: false,
          parsingErrors: []
        }
      });
      
      // Log the product attributes creation
      await logOrderChange('PRODUCT_ATTRIBUTES_CREATE', 
        null, 
        dataToSave,
        { orderItemId: selectedOrderItem.value.id, action: 'CREATE' }
      );
      
      toast.success({ title: 'Attributes Created', message: 'Product attributes have been created successfully.' });
      
      // After creating ProductAttribute, remove from local state since it now exists in database
      markedAsProducts.value.delete(selectedOrderItem.value.id);
    }
    
    closeProductAttributesModal();
    refetchOrder();
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Save Failed', message: e.message || 'Could not save product attributes.' });
  } finally {
    isSavingAttributes.value = false;
  }
}

function canVerifyOrder(): boolean {
  if (!order.value) return false;
  
  // Check if all items marked as products have been verified
  return order.value.items.every(item => {
    // If item is not marked as product, it's fine
    if (!isItemMarkedAsProduct(item)) return true;
    
    // If item is marked as product, it must have productAttributes and be verified
    return item.productAttributes && item.productAttributes.verified;
  });
}

function verifyProduct(orderItem: any) {
  if (!orderItem.productAttributes) {
    toast.error({ title: 'Verification Failed', message: 'Product attributes must be configured before verification.' });
    return;
  }
  
  // Mark the product as verified by updating the ProductAttribute verified field
  updateProductVerification(orderItem.productAttributes.id, true);
}

function openActionsMenu(orderItemId: string) {
  openActionsMenuId.value = openActionsMenuId.value === orderItemId ? null : orderItemId;
}

// Function to close actions menu
function closeActionsMenu() {
  openActionsMenuId.value = null;
}

// Close actions menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      closeActionsMenu();
    }
  });
});

function verifyAllProducts() {
  if (!order.value) return;
  
  const productItems = order.value.items.filter(item => isItemMarkedAsProduct(item));
  const unverifiedItems = productItems.filter(item => !item.productAttributes || !item.productAttributes.verified);
  
  if (unverifiedItems.length > 0) {
    toast.error({ 
      title: 'Verification Failed', 
      message: `Cannot verify order. ${unverifiedItems.length} product items need attributes configured first.` 
    });
    return;
  }
  
  // All products are verified, proceed with order approval
  toast.success({ title: 'All Products Verified', message: 'All products have been verified. You can now approve the order.' });
}

async function updateOrderItemIsProduct(orderItemId: string, isProduct: boolean) {
  if (!order.value) return;

  const orderItem = order.value.items.find(item => item.id === orderItemId);
  if (!orderItem) return;

  const currentIsProduct = isItemMarkedAsProduct(orderItem);
  if (currentIsProduct === isProduct) return;

  try {
    if (isProduct) {
      // Mark as product locally
      markedAsProducts.value.add(orderItemId);
      toast.success({ title: 'Product Marked', message: `"${orderItem.item?.name}" has been marked as a product. Click "View Attributes" to configure product details.` });
      
      // Log the product marking
      await logOrderChange('ITEM_MARKED_AS_PRODUCT', 
        false, 
        true,
        { orderItemId, itemName: orderItem.item?.name, action: 'MARK_AS_PRODUCT' }
      );
      
      // Don't refresh order data yet - wait until ProductAttribute is actually created
      // This prevents the checkbox from getting unchecked
    } else {
      // Remove from local state and delete from database if exists
      markedAsProducts.value.delete(orderItemId);
      
      if (orderItem.productAttributes) {
        await $fetch(`/api/admin/product-attributes/${orderItem.productAttributes.id}`, {
          method: 'DELETE',
        });
        
        // Log the product unmarking
        await logOrderChange('ITEM_UNMARKED_AS_PRODUCT', 
          true, 
          false,
          { orderItemId, itemName: orderItem.item?.name, action: 'UNMARK_AS_PRODUCT' }
        );
        
        // Only refresh after deletion since we're removing actual data
        refetchOrder();
        refreshActivityLogs();
      } else {
        // Just local state change, no need to refresh
        toast.success({ title: 'Product Unmarked', message: `"${orderItem.item?.name}" is no longer marked as a product.` });
      }
    }
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Update Failed', message: e.message || 'Could not update product status.' });
    
    // Revert local state on error
    if (isProduct) {
      markedAsProducts.value.delete(orderItemId);
    } else {
      markedAsProducts.value.add(orderItemId);
    }
  }
}

async function saveItemStatusFromModal() {
  if (!editingItem.value || !editingItemStatus.value) return;
  
  isSavingItem.value = true;
  try {
    // Update the order item status using ZenStack hook
    await updateOrderItemMutation({
      where: { id: editingItem.value.id },
      data: {
        itemStatus: editingItemStatus.value,
      },
    });
    
    // Log the status change
    await $fetch('/api/tracking/log-item-status', {
      method: 'POST',
      body: {
        orderItemId: editingItem.value.id,
        fromStatus: editingItem.value.itemStatus,
        toStatus: editingItemStatus.value,
        userId: undefined, // Will be set by the backend based on current user
        changeReason: 'Admin manually updated item status',
        triggeredBy: 'manual',
        notes: `Status changed by admin from order view`,
      },
    });
    
    toast.success({ 
      title: 'Item Status Updated', 
      message: `Status updated to ${editingItemStatus.value.replace(/_/g, ' ')}` 
    });
    
    // Refresh data
    refetchOrder();
    refreshActivityLogs();
    
    // Close modal
    closeStatusEditModal();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Update Failed', message: e.message || 'Could not update item status.' });
  } finally {
    isSavingItem.value = false;
  }
}

async function updateProductVerification(productAttributeId: string, verified: boolean) {
  try {
    // Get the current verification status for logging
    const currentProductAttribute = order.value?.items
      .flatMap(item => item.productAttributes ? [item.productAttributes] : [])
      .find(attr => attr.id === productAttributeId);
    
    const oldVerified = currentProductAttribute?.verified;
    
    // Update the ProductAttribute verified field
    await $fetch(`/api/admin/product-attributes/${productAttributeId}`, {
      method: 'PUT',
      body: {
        verified: verified,
      },
    });
    
    // Log the verification change
    await logOrderChange('PRODUCT_VERIFICATION', 
      oldVerified, 
      verified,
      { productAttributeId, action: verified ? 'VERIFY' : 'UNVERIFY' }
    );
    
    toast.success({ 
      title: verified ? 'Product Verified' : 'Product Unverified', 
      message: `Product has been ${verified ? 'verified' : 'unverified'}.` 
    });
    
    refetchOrder();
    refreshActivityLogs();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Verification Failed', message: e.message || 'Could not update verification status.' });
  }
}

// New function to handle product type change and update packaging
function handleProductTypeChange() {
  // If switching to Cover for Cover, auto-check packaging (unless user has manually unchecked it)
  if (productAttributes.value.productType === 'COVER_FOR_COVER') {
    // Only auto-check if packaging hasn't been manually set to false
    if (productAttributes.value.packaging === false) {
      productAttributes.value.packaging = true;
    }
  }
  // Note: We don't auto-uncheck packaging when switching away from Cover for Cover
  // as the user might want to keep it checked for other reasons
}
</script> 