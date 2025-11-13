<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Orders
      </h1>
      <div class="flex items-center space-x-2">
        <NuxtLink to="/admin/orders/add"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
          <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
          Add Order
        </NuxtLink>
        <!-- <button
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          :disabled="isSyncing" @click="handleSync('CREATE_NEW')">
          <Icon name="heroicons:plus-circle-20-solid" class="mr-2 h-5 w-5" />
          Sync New
        </button>
        <button
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          :disabled="isSyncing" @click="handleSync('UPSERT')">
          <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          <Icon v-else name="heroicons:arrow-path-20-solid" class="mr-2 h-5 w-5" />
          Sync All
        </button> -->
      </div>
    </div>

    <!-- KPI Dashboard -->
    <div class="mb-6">
      <!-- Error State -->
      <div v-if="metricsError" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-red-600 mr-2" />
          <p class="text-sm text-red-700">{{ metricsError }}</p>
          <button class="ml-auto text-sm text-red-600 hover:text-red-800 underline" @click="fetchMetrics">
            Retry
          </button>
        </div>
      </div>

      <!-- Order Status KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <!-- Orders Pending -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleOrderStatusKPIClick('PENDING')">
          <div v-if="isMetricsLoading || kpiLoadingStates.orderStatus"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-yellow-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:clock" class="h-8 w-8 text-yellow-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Orders Pending</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersPending || '0' }}</p>
              <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Orders Approved -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleOrderStatusKPIClick('APPROVED')">
          <div v-if="isMetricsLoading || kpiLoadingStates.orderStatus"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-blue-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:check-circle" class="h-8 w-8 text-blue-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Orders Approved</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersApproved || '0' }}</p>
              <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Orders In Progress -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleOrderStatusKPIClick('ORDER_PROCESSING')">
          <div v-if="isMetricsLoading || kpiLoadingStates.orderStatus"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-indigo-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:cog" class="h-8 w-8 text-indigo-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Orders In Progress</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersInProgress || '0' }}</p>
              <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Orders Ready to Ship -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleOrderStatusKPIClick('READY_TO_SHIP')">
          <div v-if="isMetricsLoading || kpiLoadingStates.orderStatus"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-green-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:truck" class="h-8 w-8 text-green-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Orders Ready to Ship</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersReadyToShip || '0' }}</p>
              <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Orders Completed -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleOrderStatusKPIClick('COMPLETED')">
          <div v-if="isMetricsLoading || kpiLoadingStates.orderStatus"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-emerald-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:check-badge" class="h-8 w-8 text-emerald-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Orders Completed</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersCompleted || '0' }}</p>
              <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Production Items and Performance KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Average Lead Time (Non-clickable) -->
        <div class="bg-white p-4 rounded-lg shadow relative">
          <div v-if="isMetricsLoading"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-blue-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:clock" class="h-8 w-8 text-blue-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Avg Lead Time</p>
              <p class="text-2xl font-semibold text-gray-900">{{ Math.round(metrics.avgLeadTimeHours || 0) }} hours</p>
              <p class="text-xs text-gray-400">Last 60 days</p>
            </div>
          </div>
        </div>
        <!-- Items in Production -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleProductionItemsKPIClick('in_production')">
          <div v-if="isMetricsLoading || kpiLoadingStates.productionItems"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-orange-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:wrench-screwdriver" class="h-8 w-8 text-orange-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Items in Production</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.itemsInProduction || '0' }}</p>
              <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Items Not Started -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleProductionItemsKPIClick('not_started')">
          <div v-if="isMetricsLoading || kpiLoadingStates.productionItems"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-gray-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:pause-circle" class="h-8 w-8 text-gray-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Items Not Started</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.itemsNotStarted || '0' }}</p>
              <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Items Completed -->
        <div class="bg-white p-4 rounded-lg shadow relative cursor-pointer hover:shadow-md transition-shadow duration-200 hover:bg-gray-50" 
             @click="handleProductionItemsKPIClick('completed')">
          <div v-if="isMetricsLoading || kpiLoadingStates.productionItems"
            class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-emerald-600" />
          </div>
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <Icon name="heroicons:check-badge" class="h-8 w-8 text-emerald-600" />
            </div>
            <div class="ml-4 flex-1">
              <p class="text-sm font-medium text-gray-500">Items Completed</p>
              <p class="text-2xl font-semibold text-gray-900">{{ metrics.itemsCompleted || '0' }}</p>
              <p class="text-xs text-gray-400">Production finished</p>
            </div>
          </div>
        </div> 
      </div>
    </div>

    <!-- Time Filter for Metrics -->
    <div class="mb-4 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center justify-between">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Time Filter for Metrics</label>
          <p class="text-xs text-gray-500">Note: Average Lead Time is always calculated for the last 60 days</p>
        </div>
        <div class="flex items-center space-x-2">
          <select v-model="timeFilter"
            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            @change="updateMetrics">
            <option value="30">Last 30 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="ytd">Year To Date</option>
            <option value="365">Last 365 Days</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Customer Filter -->
    <div class="mb-4 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center space-x-4">
        <div class="flex-1">
          <label for="customerFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
          <div class="flex items-center space-2">
            <input id="customerFilter" v-model="customerFilter" type="text"
              placeholder="Type customer name to filter..." :disabled="!!customerIdFromQuery"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
            <div v-if="customerIdFromQuery"
              class="flex items-center space-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md ml-3">
              <Icon name="heroicons:check-circle-20-solid" class="h-4 w-4" />
              <span>Filtered by: <span class="font-medium">{{ customerNameFromQuery || 'Loading...' }}</span></span>
            </div>
          </div>
        </div>
        <div>
          <label for="statusFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
          <select id="statusFilter" v-model="statusFilter"
            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ORDER_PROCESSING">In Progress</option>
            <option value="READY_TO_SHIP">Ready to Ship</option>
            <option value="SHIPPED">Shipped</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div>
          <label for="priorityFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Priority</label>
          <select id="priorityFilter" v-model="priorityFilter"
            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">All Priorities</option>
            <option value="NO_PRIORITY">No Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div class="flex items-end space-x-2">
          <button class="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            @click="clearFilters">
            Clear All
          </button>
          <button v-if="statusFilter" 
                  class="px-3 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700"
                  @click="clearStatusFilter"
                  title="Clear status filter applied from KPI">
            <Icon name="heroicons:x-mark" class="h-4 w-4 mr-1" />
            Clear Status
          </button>
        </div>
      </div>
    </div>

    <!-- Active Filter Indicator -->
    <div v-if="statusFilter" class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <Icon name="heroicons:funnel" class="h-5 w-5 text-blue-600 mr-2" />
          <p class="text-sm text-blue-700">
            <span class="font-medium">Active Filter:</span> 
            Showing orders with status "{{ formatStatusForDisplay(statusFilter) }}"
          </p>
        </div>
        <button class="text-sm text-blue-600 hover:text-blue-800 underline" 
                @click="clearStatusFilter">
          Remove Filter
        </button>
      </div>
    </div>

    <div class="bg-white shadow rounded-lg">
      <AppTable v-model:sort="sort" :rows="orders ?? []" :columns="columns"
        :pending="isOrdersLoading || isCountLoading">
        <!-- Expansion column template -->
        <template #expand-data="{ row }">
          <div class="flex items-center justify-center">
            <button 
              v-if="hasProductionItems(row)"
              @click="toggleRowExpansion(row.id)"
              class="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              :title="isRowExpanded(row.id) ? 'Collapse production items' : 'Expand production items'"
            >
              <Icon 
                :name="isRowExpanded(row.id) ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
                class="h-5 w-5 transition-transform duration-200"
              />
            </button>
          </div>
        </template>
        <template #transactionDate-data="{ row }">
          <span>{{ row.transactionDate ? new Date(row.transactionDate).toLocaleDateString() : '-' }}</span>
        </template>
        <template #totalAmount-data="{ row }">
          <span>{{ row.totalAmount ? new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD'
          }).format(row.totalAmount) : '-' }}</span>
        </template>
        <template #customerName-data="{ row }">
          <span>{{ row.customer?.name || '-' }}</span>
        </template>
        <template #priority-data="{ row }">
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" :class="{
            'bg-red-100 text-red-800': row.priority === 'HIGH',
            'bg-yellow-100 text-yellow-800': row.priority === 'MEDIUM',
            'bg-green-100 text-green-800': row.priority === 'LOW',
            'bg-gray-100 text-gray-800': row.priority === 'NO_PRIORITY'
          }">
            {{ getPriorityDisplayText(row.priority) }}
          </span>
        </template>
        <template #orderStatus-data="{ row }">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getOrderStatusBadgeClass(row.orderStatus)">
            {{ formatStatusForDisplay(row.orderStatus) }}
          </span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex space-x-5 items-center">
            <NuxtLink :to="`/admin/orders/edit/${row.id}`" class="text-indigo-600 hover:text-indigo-900"
              title="Edit Order">
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button v-if="row.orderStatus !== 'ARCHIVED'" class="text-gray-600 hover:text-gray-900"
              title="Archive Order" @click="archiveOrder(row)">
              <Icon name="heroicons:archive-box-20-solid" class="h-5 w-5" />
            </button>
            <!--
            <button
              v-if="row.orderStatus === 'PENDING'"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors duration-200"
              title="Verify Order"
              @click="openVerifyModal(row)"
            >
              <Icon name="heroicons:check-circle-20-solid" class="h-5 w-5 mr-1" />
              Verify Order
            </button>
          -->
          </div>
        </template>
        <!-- Expandable row content template -->
        <template #expandable-row="{ row }">
          <tr v-if="isRowExpanded(row.id)" class="bg-gray-50">
            <td :colspan="columns.length" class="px-6 py-4">
              <div class="border-l-4 border-blue-200 pl-4">
                <h4 class="text-sm font-medium text-gray-900 mb-3">Production Items</h4>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr 
                        v-for="orderItem in (row.items || []).filter((item: any) => item.isProduct === true)" 
                        :key="orderItem.id"
                        class="hover:bg-gray-50"
                      >
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {{ orderItem.item?.name || 'Unknown Item' }}
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                :class="getItemStatusBadgeClass(orderItem.itemStatus)">
                            {{ formatItemStatus(orderItem.itemStatus) }}
                          </span>
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                :class="orderItem.productAttributes?.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                            {{ orderItem.productAttributes?.verified ? 'Verified' : 'Not Verified' }}
                          </span>
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div class="space-y-1">
                            <div v-if="orderItem.productAttributes?.size" class="text-xs">
                              <span class="font-medium">Size:</span> {{ orderItem.productAttributes.size }}
                            </div>
                            <div v-if="orderItem.productAttributes?.shape" class="text-xs">
                              <span class="font-medium">Shape:</span> {{ orderItem.productAttributes.shape }}
                            </div>
                            <div v-if="orderItem.productAttributes?.color" class="text-xs">
                              <span class="font-medium">Color:</span> {{ orderItem.productAttributes.color }}
                            </div>
                            <div v-if="!orderItem.productAttributes?.size && !orderItem.productAttributes?.shape && !orderItem.productAttributes?.color" class="text-xs text-gray-500">
                              No attributes
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="!(row.items || []).filter((item: any) => item.isProduct === true).length">
                        <td colspan="4" class="px-4 py-2 text-center text-sm text-gray-500">
                          No production items found
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </AppTable>
      <div v-if="totalOrders && totalOrders > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, totalOrders) }}</span>
          of
          <span class="font-medium">{{ totalOrders }}</span>
          results
        </p>
        <div class="flex-1 flex justify-end">
          <button :disabled="page === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="page--">
            Previous
          </button>
          <button :disabled="page === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="page++">
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Archive Confirmation Modal -->
    <AppModal :is-open="showArchiveModal" title="Archive Order" @close="showArchiveModal = false">
      <div class="p-6">
        <p class="text-gray-700 mb-4">
          Are you sure you want to archive order
          <span class="font-semibold">{{ orderToArchive?.salesOrderNumber || orderToArchive?.id }}</span>?
        </p>
        <p class="text-sm text-gray-600 mb-6">
          This action will move the order to archived status. The order will remain in the system but will be hidden
          from
          the main view.
        </p>
        <div class="flex justify-end space-x-3">
          <button type="button" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="showArchiveModal = false">
            Cancel
          </button>
          <button type="button" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            :disabled="isArchiving" @click="confirmArchive">
            {{ isArchiving ? 'Archiving...' : 'Archive Order' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Order Verification Modal -->
    <AppModal :is-open="showVerifyModal" title="Verify Order" @close="showVerifyModal = false">
      <div class="p-6">
        <div class="mb-6">
          <div class="flex items-center mb-4">
            <Icon name="heroicons:exclamation-triangle-20-solid" class="h-6 w-6 text-yellow-500 mr-2" />
            <h3 class="text-lg font-medium text-gray-900">Order Verification Required</h3>
          </div>
          <p class="text-gray-700 mb-4">
            You are about to verify and approve order
            <span class="font-semibold">{{ orderToVerify?.salesOrderNumber || orderToVerify?.id }}</span>
            for customer <span class="font-semibold">{{ orderToVerify?.customer?.name }}</span>.
          </p>
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Order Details:</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-600">Order Number:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.salesOrderNumber || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-600">Date:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.transactionDate ? new
                  Date(orderToVerify.transactionDate).toLocaleDateString() : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-600">Total Amount:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.totalAmount ? new Intl.NumberFormat('en-US', {
                  style:
                    'currency', currency: 'USD'
                }).format(orderToVerify.totalAmount) : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-600">Items:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.items?.length || 0 }} items</span>
              </div>
            </div>
          </div>
          <p class="text-sm text-gray-600 mt-4">
            <strong>Important:</strong> Once verified, this order will be moved to "APPROVED" status and all items will
            be
            automatically added to the print queue for packing slip printing.
            Please ensure all order details are correct before proceeding.
          </p>
        </div>
        <div class="flex justify-end space-x-3">
          <button type="button" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="showVerifyModal = false">
            Cancel
          </button>
          <button type="button"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            :disabled="isVerifying" @click="confirmVerifyOrder">
            <Icon v-if="isVerifying" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 mr-2" />
            {{ isVerifying ? 'Verifying...' : 'Verify & Approve Order' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Production Items Modal -->
    <AppModal :is-open="showProductionItemsModal" :title="productionItemsModalTitle" @close="closeProductionItemsModal" size="full">
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isProductionItemsLoading" class="flex items-center justify-center py-12">
          <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-blue-600 mr-3" />
          <span class="text-gray-600">Loading production items...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="productionItemsError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-center">
            <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-red-600 mr-2" />
            <p class="text-sm text-red-700">{{ productionItemsError }}</p>
            <button class="ml-auto text-sm text-red-600 hover:text-red-800 underline" 
                    @click="fetchProductionItemsModalData(productionItemsModalType)">
              Retry
            </button>
          </div>
        </div>

        <!-- Data Table -->
        <div v-else-if="productionItemsModalData.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in productionItemsModalData" :key="item.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <button class="text-indigo-600 hover:text-indigo-900 font-medium" 
                          @click="navigateToOrder(item.order.id)">
                    {{ item.order.salesOrderNumber || `Order-${item.order.id.slice(-8)}` }}
                  </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ item.order.customer.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ item.item.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="getItemStatusBadgeClass(item.itemStatus)">
                    {{ formatItemStatus(item.itemStatus) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="item.productAttributes.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    {{ item.productAttributes.verified ? 'Verified' : 'Not Verified' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div class="space-y-1">
                    <div v-if="item.productAttributes.size" class="text-xs">
                      <span class="font-medium">Size:</span> {{ item.productAttributes.size }}
                    </div>
                    <div v-if="item.productAttributes.shape" class="text-xs">
                      <span class="font-medium">Shape:</span> {{ item.productAttributes.shape }}
                    </div>
                    <div v-if="item.productAttributes.color" class="text-xs">
                      <span class="font-medium">Color:</span> {{ item.productAttributes.color }}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <Icon name="heroicons:inbox" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p class="text-gray-600">There are no production items matching the selected criteria.</p>
        </div>

        <!-- Close Button -->
        <div class="flex justify-end mt-6">
          <button type="button" 
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="closeProductionItemsModal">
            Close
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFindManyOrder, useCountOrder, useUpdateOrder, useFindUniqueCustomer } from '~/lib/hooks';
import { getPriorityDisplayText } from '~/utils/backwardCompatibility';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const { showLoading, hideLoading } = useGlobalLoading();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const isSyncing = ref(false);

// Archive modal state
const showArchiveModal = ref(false);
const orderToArchive = ref<any>(null);
const isArchiving = ref(false);

// Verification modal state
const showVerifyModal = ref(false);
const orderToVerify = ref<any>(null);
const isVerifying = ref(false);

// Production Items Modal state
const showProductionItemsModal = ref(false);
const productionItemsModalTitle = ref('');
const productionItemsModalData = ref<any[]>([]);
const productionItemsModalType = ref<'in_production' | 'not_started' | 'completed'>('in_production');
const isProductionItemsLoading = ref(false);
const productionItemsError = ref<string | null>(null);

// Individual KPI loading states for better UX
const kpiLoadingStates = ref({
  orderStatus: false,
  productionItems: false
});

// Row expansion state management (Requirements 6.1, 6.2, 6.3, 6.4, 6.5)
const expandedRows = ref<Set<string>>(new Set());

// Toggle row expansion function
function toggleRowExpansion(orderId: string) {
  const newExpandedRows = new Set(expandedRows.value);
  if (newExpandedRows.has(orderId)) {
    newExpandedRows.delete(orderId);
  } else {
    newExpandedRows.add(orderId);
  }
  expandedRows.value = newExpandedRows;
}

// Check if row is expanded
function isRowExpanded(orderId: string): boolean {
  return expandedRows.value.has(orderId);
}

// Check if order has production items (for showing chevron)
function hasProductionItems(order: any): boolean {
  return order.items && order.items.some((item: any) => item.isProduct === true);
}

const columns = [
  { key: 'expand', label: '', sortable: false }, // Expansion column
  { key: 'salesOrderNumber', label: 'Order #', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: false },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'transactionDate', label: 'Date', sortable: true },
  { key: 'totalAmount', label: 'Amount', sortable: true },
  { key: 'orderStatus', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'transactionDate', direction: 'desc' as 'asc' | 'desc' });
const customerFilter = ref('');
const statusFilter = ref('');
const priorityFilter = ref('');

// Metrics state
const timeFilter = ref('30'); // Default to last 30 days

// Enhanced metrics interface for better type safety
interface OrdersKPIMetrics {
  // Order Status KPIs (Requirements 2.1-2.5)
  ordersPending: number;
  ordersApproved: number;
  ordersInProgress: number;
  ordersReadyToShip: number;
  ordersCompleted: number;
  
  // Production Item KPIs (Requirements 3.1-3.5)
  itemsInProduction: number;
  itemsNotStarted: number;
  itemsCompleted: number;
  
  // Performance KPIs (Requirements 1.1-1.5)
  avgLeadTimeHours: number;
  
  // Legacy fields (for backward compatibility - Requirement 10.2)
  avgLeadTime: number;
  totalValue: number;
  averageOrderValue: number;
  totalOrders: number;
  totalItemsReady: number;
  productionMetrics: {
    notStarted: number;
    cutting: number;
    sewing: number;
    foamCutting: number;
    packaging: number;
    finished: number;
    ready: number;
  };
}

// Enhanced fallback metrics structure for consistent error handling (Requirements 8.1, 8.5)
const fallbackMetrics: OrdersKPIMetrics = {
  // Order Status KPIs - all initialized to 0 for safe display
  ordersPending: 0,
  ordersApproved: 0,
  ordersInProgress: 0,
  ordersReadyToShip: 0,
  ordersCompleted: 0,
  
  // Production Item KPIs - all initialized to 0 for safe display
  itemsInProduction: 0,
  itemsNotStarted: 0,
  itemsCompleted: 0,
  
  // Performance KPIs - initialized to 0 (hours)
  avgLeadTimeHours: 0,
  
  // Legacy fields (for backward compatibility)
  avgLeadTime: 0,
  totalValue: 0,
  averageOrderValue: 0,
  totalOrders: 0,
  totalItemsReady: 0,
  productionMetrics: {
    notStarted: 0,
    cutting: 0,
    sewing: 0,
    foamCutting: 0,
    packaging: 0,
    finished: 0,
    ready: 0
  }
};

const metrics = ref({ ...fallbackMetrics });

const isMetricsLoading = ref(false);
const metricsError = ref<string | null>(null);

// Computed property for time filter label
const timeFilterLabel = computed(() => {
  switch (timeFilter.value) {
    case '30': return 'Last 30 days';
    case '60': return 'Last 60 days';
    case '90': return 'Last 90 days';
    case 'ytd': return 'Year to date';
    case '365': return 'Last 365 days';
    case 'lifetime': return 'Lifetime';
    default: return 'Last 30 days';
  }
});

// Check for customerId in URL query params
const customerIdFromQuery = computed(() => route.query.customerId as string);

// Fetch customer name when filtering by customerId
const { data: customerFromQuery } = useFindUniqueCustomer(
  computed(() => customerIdFromQuery.value ? { where: { id: customerIdFromQuery.value } } : { where: { id: '' } })
);

const customerNameFromQuery = computed(() => customerFromQuery.value?.name);

const query = computed(() => {
  const baseQuery = {
    skip: (page.value - 1) * limit.value,
    take: limit.value,
    include: { 
      customer: {
        select: {
          name: true
        }
      },
      items: {
        include: {
          item: {
            select: {
              name: true,
              imageUrl: true
            }
          },
          productAttributes: {
            select: {
              verified: true,
              size: true,
              shape: true,
              color: true,
              skirtLength: true,
              skirtType: true,
              tieDownsQty: true,
              tieDownPlacement: true,
              foamUpgrade: true,
              doublePlasticWrapUpgrade: true,
              webbingUpgrade: true,
              metalForLifterUpgrade: true,
              steamStopperUpgrade: true,
              fabricUpgrade: true,
              extraHandleQty: true,
              packaging: true
            }
          }
        }
      }
    },
    orderBy: { [sort.value.column]: sort.value.direction },
    where: undefined as any,
  };

  // Add filters
  const where: Record<string, any> = {};

  // Priority: URL customerId query param overrides manual customer filter
  if (customerIdFromQuery.value) {
    where.customerId = customerIdFromQuery.value;
  } else if (customerFilter.value) {
    where.customer = {
      name: {
        contains: customerFilter.value,
        mode: 'insensitive'
      }
    };
  }

  if (statusFilter.value) {
    where.orderStatus = statusFilter.value;
  }

  if (priorityFilter.value) {
    where.priority = priorityFilter.value;
  }

  if (Object.keys(where).length > 0) {
    baseQuery.where = where;
  } else {
    delete baseQuery.where;
  }

  return baseQuery;
});

const { data: orders, isLoading: isOrdersLoading, refetch: refreshOrders } = useFindManyOrder(query);
const { data: totalOrders, isLoading: isCountLoading, refetch: refreshCount } = useCountOrder();

const totalPages = computed(() => {
  const count = totalOrders.value ?? 0;
  if (count === 0) return 1;
  return Math.ceil(count / limit.value);
});

// Enhanced route change watcher with better error handling (Requirements 8.1, 8.2, 10.1)
watch(() => route.fullPath, async (fullPath, oldPath) => {
  if (fullPath === '/admin/orders' && fullPath !== oldPath) {
    try {
      // Refresh all data when returning to the orders page
      refreshOrders();
      refreshCount();
      
      // Use retry mechanism for metrics refresh on route change
      await retryFetchMetrics();
      
      console.debug('All data refreshed on route change to orders page');
    } catch (error) {
      console.error('Failed to refresh data on route change:', error);
      
      // Provide user feedback about partial data refresh
      toast.warning({
        title: 'Partial Refresh',
        message: 'Orders loaded but metrics may be outdated. Try refreshing the page.'
      });
    }
  }
});

// Enhanced watch for filter changes with better error handling (Requirements 8.1, 8.2, 10.4)
watch([customerFilter, statusFilter, priorityFilter, customerIdFromQuery], (newValues, oldValues) => {
  // Only refresh if values actually changed to avoid unnecessary API calls
  const hasChanged = newValues.some((newVal, index) => newVal !== oldValues?.[index]);
  
  if (hasChanged) {
    // Debounce the metrics refresh to avoid too many API calls
    clearTimeout(metricsRefreshTimeout);
    metricsRefreshTimeout = setTimeout(async () => {
      try {
        await fetchMetrics();
        console.debug('Metrics refreshed due to filter change');
      } catch (error) {
        console.error('Failed to refresh metrics on filter change:', error);
        
        // Provide user feedback on filter-related metric refresh failures
        toast.warning({
          title: 'Metrics Update Warning',
          message: 'Filters applied but metrics may not reflect current selection'
        });
      }
    }, 500);
  }
}, { deep: true });

// Enhanced watch for time filter changes with immediate refresh (Requirements 8.1, 8.2)
watch(timeFilter, async (newTimeFilter, oldTimeFilter) => {
  // Only refresh if the time filter actually changed
  if (newTimeFilter !== oldTimeFilter) {
    try {
      await updateMetrics(); // Use updateMetrics for better user feedback
      console.debug(`Metrics refreshed for time filter: ${newTimeFilter}`);
    } catch (error) {
      console.error('Failed to refresh metrics on time filter change:', error);
      
      // Provide specific feedback for time filter changes
      toast.error({
        title: 'Time Filter Error',
        message: 'Failed to update metrics for selected time period'
      });
    }
  }
});

// Timeout for debouncing metrics refresh
let metricsRefreshTimeout: NodeJS.Timeout;

// Enhanced retry mechanism for metrics fetching with better error handling (Requirements 8.1, 8.3, 8.5)
async function retryFetchMetrics(maxRetries = 2) {
  let retryCount = 0;
  let lastError: any = null;
  
  while (retryCount < maxRetries) {
    try {
      await fetchMetrics();
      
      // Success - log recovery if this was a retry
      if (retryCount > 0) {
        console.info(`Metrics fetch succeeded on retry attempt ${retryCount}`);
        toast.success({
          title: 'Connection Restored',
          message: 'Metrics loaded successfully after retry'
        });
      }
      
      return; // Success, exit retry loop
    } catch (error) {
      lastError = error;
      retryCount++;
      console.warn(`Metrics fetch attempt ${retryCount} failed:`, error);
      
      if (retryCount < maxRetries) {
        // Wait before retrying with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s...
        console.info(`Retrying metrics fetch in ${delay}ms...`);
        
        // Show retry notification to user
        toast.info({
          title: 'Retrying...',
          message: `Attempting to load metrics (${retryCount}/${maxRetries})`
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed - provide comprehensive error handling
  console.error('All metrics fetch retries failed. Last error:', lastError);
  
  // Ensure fallback metrics are set
  metrics.value = { ...fallbackMetrics };
  metricsError.value = 'Failed to load metrics after multiple attempts. Please refresh the page or try again later.';
  
  // Show final error notification
  toast.error({
    title: 'Connection Failed',
    message: 'Unable to load metrics after multiple attempts. Using default values.'
  });
}

// KPI Click Handlers
function handleOrderStatusKPIClick(status: string) {
  // Show loading state during filter application
  kpiLoadingStates.value.orderStatus = true;
  
  try {
    // Filter the orders list by the selected status
    statusFilter.value = status;
    page.value = 1; // Reset to first page
    
    // Provide user feedback
    toast.info({
      title: 'Filter Applied',
      message: `Showing orders with status: ${formatStatusForDisplay(status)}`
    });
    
    // Scroll to the orders table after a brief delay to allow for loading
    setTimeout(() => {
      const ordersTable = document.querySelector('.bg-white.shadow.rounded-lg');
      if (ordersTable) {
        ordersTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  } catch (error) {
    console.error('Error applying order status filter:', error);
    toast.error({
      title: 'Filter Error',
      message: 'Failed to apply status filter. Please try again.'
    });
  } finally {
    // Reset loading state after a brief delay
    setTimeout(() => {
      kpiLoadingStates.value.orderStatus = false;
    }, 500);
  }
}

// Helper function to format status for display
function formatStatusForDisplay(status: string) {
  switch (status) {
    case 'PENDING': return 'Pending';
    case 'APPROVED': return 'Approved';
    case 'ORDER_PROCESSING': return 'In Progress';
    case 'READY_TO_SHIP': return 'Ready to Ship';
    case 'COMPLETED': return 'Completed';
    default: return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}

async function handleProductionItemsKPIClick(type: 'in_production' | 'not_started' | 'completed') {
  try {
    // Show loading state on the production items KPI cards
    kpiLoadingStates.value.productionItems = true;
    
    productionItemsModalType.value = type;
    
    // Set modal title based on type
    switch (type) {
      case 'in_production':
        productionItemsModalTitle.value = 'Items in Production';
        break;
      case 'not_started':
        productionItemsModalTitle.value = 'Items Not Started';
        break;
      case 'completed':
        productionItemsModalTitle.value = 'Items Completed';
        break;
    }
    
    // Show modal and fetch data
    showProductionItemsModal.value = true;
    await fetchProductionItemsModalData(type);
    
    // Provide user feedback
    toast.info({
      title: 'Production Items',
      message: `Showing ${getProductionItemsTypeLabel(type)}`
    });
  } catch (error) {
    console.error('Error opening production items modal:', error);
    toast.error({
      title: 'Modal Error',
      message: 'Failed to open production items view. Please try again.'
    });
    
    // Close modal on error
    closeProductionItemsModal();
  } finally {
    // Reset loading state
    setTimeout(() => {
      kpiLoadingStates.value.productionItems = false;
    }, 500);
  }
}

// Helper function to get production items type label
function getProductionItemsTypeLabel(type: 'in_production' | 'not_started' | 'completed') {
  switch (type) {
    case 'in_production': return 'items currently in production';
    case 'not_started': return 'items not yet started';
    case 'completed': return 'completed production items';
    default: return 'production items';
  }
}

async function fetchProductionItemsModalData(type: 'in_production' | 'not_started' | 'completed') {
  isProductionItemsLoading.value = true;
  productionItemsError.value = null;
  productionItemsModalData.value = [];
  
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await $fetch('/api/admin/order-items/production', {
      query: { status: type },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const typedResponse = response as { success: boolean; data: any[]; message?: string };
    
    if (typedResponse.success && typedResponse.data) {
      productionItemsModalData.value = typedResponse.data;
      
      // Show success message with count
      const itemCount = typedResponse.data.length;
      toast.success({
        title: 'Data Loaded',
        message: `Found ${itemCount} ${getProductionItemsTypeLabel(type)}`
      });
    } else {
      throw new Error(typedResponse.message || 'Invalid response from production items API');
    }
  } catch (error: any) {
    console.error('Failed to fetch production items:', error);
    
    // Handle different error types
    let errorMessage = 'Failed to load production items. Please try again.';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out. Please check your connection and try again.';
    } else if (error.data?.message) {
      errorMessage = error.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    productionItemsError.value = errorMessage;
    toast.error({
      title: 'Loading Error',
      message: errorMessage
    });
  } finally {
    isProductionItemsLoading.value = false;
  }
}

function closeProductionItemsModal() {
  try {
    showProductionItemsModal.value = false;
    productionItemsModalData.value = [];
    productionItemsError.value = null;
    productionItemsModalType.value = 'in_production'; // Reset to default
    productionItemsModalTitle.value = '';
    
    // Cancel any ongoing loading
    isProductionItemsLoading.value = false;
  } catch (error) {
    console.error('Error closing production items modal:', error);
  }
}

function navigateToOrder(orderId: string) {
  try {
    // Provide user feedback
    toast.info({
      title: 'Navigating',
      message: 'Opening order details...'
    });
    
    // Close modal first
    closeProductionItemsModal();
    
    // Navigate to order details
    router.push(`/admin/orders/edit/${orderId}`);
  } catch (error) {
    console.error('Error navigating to order:', error);
    toast.error({
      title: 'Navigation Error',
      message: 'Failed to open order details. Please try again.'
    });
  }
}

// Helper functions for status display
function getItemStatusBadgeClass(status: string) {
  switch (status) {
    case 'NOT_STARTED_PRODUCTION':
      return 'bg-gray-100 text-gray-800';
    case 'CUTTING':
      return 'bg-blue-100 text-blue-800';
    case 'SEWING':
      return 'bg-purple-100 text-purple-800';
    case 'FOAM_CUTTING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PACKAGING':
      return 'bg-orange-100 text-orange-800';
    case 'PRODUCT_FINISHED':
      return 'bg-green-100 text-green-800';
    case 'READY':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatItemStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function getOrderStatusBadgeClass(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-800';
    case 'ORDER_PROCESSING':
      return 'bg-indigo-100 text-indigo-800';
    case 'READY_TO_SHIP':
      return 'bg-green-100 text-green-800';
    case 'SHIPPED':
      return 'bg-emerald-100 text-emerald-800';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Enhanced metrics response type for better type safety
interface OrdersKPIMetricsResponse {
  success: boolean;
  data: {
    // Order Status KPIs
    ordersPending: number;
    ordersApproved: number;
    ordersInProgress: number;
    ordersReadyToShip: number;
    ordersCompleted: number;
    
    // Production Item KPIs
    itemsInProduction: number;
    itemsNotStarted: number;
    itemsCompleted: number;
    
    // Performance KPIs
    avgLeadTimeHours: number;
    
    // Legacy fields for backward compatibility
    statusCounts?: Record<string, number>;
    totalValue: number;
    averageOrderValue: number;
  };
  message?: string;
  timestamp?: string;
  filters?: Record<string, any>;
}

// Fetch metrics function using the enhanced orders metrics API
async function fetchMetrics() {
  isMetricsLoading.value = true;
  metricsError.value = null;

  // Build filters based on current page filters and time filter (moved outside try block for error logging)
  const filters: Record<string, any> = {};

  try {

    // Apply time filter with enhanced logic
    if (timeFilter.value !== 'lifetime') {
      const now = new Date();
      let dateFrom: Date;

      switch (timeFilter.value) {
        case '30':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '60':
          dateFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          break;
        case '90':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'ytd':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        case '365':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      filters.dateFrom = dateFrom.toISOString();
    }

    // Apply current page filters to metrics with enhanced validation
    if (customerIdFromQuery.value) {
      filters.customerId = customerIdFromQuery.value;
    } else if (customerFilter.value && customerFilter.value.trim().length > 0) {
      // Note: The API doesn't support customer name filtering directly,
      // but we include this for future enhancement
      filters.customerName = customerFilter.value.trim();
    }

    if (statusFilter.value) {
      filters.status = statusFilter.value;
    }

    // Enhanced timeout and abort controller setup
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('Metrics API request timed out after 10 seconds');
    }, 10000); // 10 second timeout

    // Fetch metrics from the enhanced orders metrics API
    const response = await $fetch<OrdersKPIMetricsResponse>('/api/metrics/orders', {
      query: filters,
      signal: controller.signal,
      retry: 1, // Allow one retry for network issues
      retryDelay: 1000 // 1 second delay between retries
    });

    clearTimeout(timeoutId);
    
    // Enhanced response validation
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format from metrics API');
    }

    if (!response.success) {
      throw new Error(response.message || 'Metrics API returned unsuccessful response');
    }

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid or missing data in metrics API response');
    }

    const data = response.data;

    // Update metrics with enhanced data structure and comprehensive fallback values
    metrics.value = {
      // Order Status KPIs - use data from API with fallback to 0 (Requirements 2.1-2.5)
      ordersPending: typeof data.ordersPending === 'number' ? data.ordersPending : 0,
      ordersApproved: typeof data.ordersApproved === 'number' ? data.ordersApproved : 0,
      ordersInProgress: typeof data.ordersInProgress === 'number' ? data.ordersInProgress : 0,
      ordersReadyToShip: typeof data.ordersReadyToShip === 'number' ? data.ordersReadyToShip : 0,
      ordersCompleted: typeof data.ordersCompleted === 'number' ? data.ordersCompleted : 0,
      
      // Production Item KPIs - use data from API with fallback to 0 (Requirements 3.1-3.5)
      itemsInProduction: typeof data.itemsInProduction === 'number' ? data.itemsInProduction : 0,
      itemsNotStarted: typeof data.itemsNotStarted === 'number' ? data.itemsNotStarted : 0,
      itemsCompleted: typeof data.itemsCompleted === 'number' ? data.itemsCompleted : 0,
      
      // Performance KPIs - avgLeadTimeHours is always calculated for last 60 days by the API (Requirements 1.1-1.5)
      avgLeadTimeHours: typeof data.avgLeadTimeHours === 'number' ? data.avgLeadTimeHours : 0,
      
      // Legacy fields (for backward compatibility - Requirement 10.2)
      avgLeadTime: typeof data.avgLeadTimeHours === 'number' ? data.avgLeadTimeHours : 0, // Map to legacy field
      totalValue: typeof data.totalValue === 'number' ? data.totalValue : 0,
      averageOrderValue: typeof data.averageOrderValue === 'number' ? data.averageOrderValue : 0,
      totalOrders: (
        (typeof data.ordersPending === 'number' ? data.ordersPending : 0) + 
        (typeof data.ordersApproved === 'number' ? data.ordersApproved : 0) + 
        (typeof data.ordersInProgress === 'number' ? data.ordersInProgress : 0) + 
        (typeof data.ordersReadyToShip === 'number' ? data.ordersReadyToShip : 0) + 
        (typeof data.ordersCompleted === 'number' ? data.ordersCompleted : 0)
      ),
      totalItemsReady: typeof data.itemsCompleted === 'number' ? data.itemsCompleted : 0,
      productionMetrics: {
        notStarted: typeof data.itemsNotStarted === 'number' ? data.itemsNotStarted : 0,
        cutting: 0, // These detailed breakdowns are not provided by the new API
        sewing: 0,
        foamCutting: 0,
        packaging: 0,
        finished: 0,
        ready: 0
      }
    };

    // Clear any previous error state on successful fetch (Requirement 8.2)
    metricsError.value = null;

    // Log successful metrics fetch for debugging
    console.debug('Metrics fetched successfully:', {
      timestamp: response.timestamp,
      filters: response.filters,
      dataKeys: Object.keys(data)
    });

  } catch (error: any) {
    console.error('Failed to fetch metrics:', error);
    
    // Enhanced error handling with specific error types (Requirements 8.1, 8.5)
    let errorMessage = 'Failed to load metrics. Please try again.';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out. Please check your connection and try again.';
    } else if (error.statusCode === 401) {
      errorMessage = 'Authentication required. Please log in again.';
    } else if (error.statusCode === 403) {
      errorMessage = 'Access denied. You do not have permission to view metrics.';
    } else if (error.statusCode >= 500) {
      errorMessage = 'Server error occurred. Please try again in a few moments.';
    } else if (error.data?.message) {
      errorMessage = error.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    metricsError.value = errorMessage;

    // Set comprehensive fallback values on error to prevent UI breaking (Requirement 8.5)
    metrics.value = { ...fallbackMetrics };

    // Show error toast with specific error message
    toast.error({
      title: 'Metrics Error',
      message: errorMessage
    });

    // Log error details for debugging
    console.error('Metrics fetch error details:', {
      errorType: error.name,
      statusCode: error.statusCode,
      message: error.message,
      filters: filters
    });
  } finally {
    isMetricsLoading.value = false;
  }
}

// Enhanced update metrics function with better error handling (Requirements 8.1, 8.2, 8.5)
async function updateMetrics() {
  try {
    // Show brief loading state for user feedback
    isMetricsLoading.value = true;
    
    await fetchMetrics();
    
    // Provide success feedback for time filter changes
    toast.success({
      title: 'Metrics Updated',
      message: `Metrics refreshed for ${timeFilterLabel.value.toLowerCase()}`
    });
  } catch (error) {
    console.error('Error updating metrics:', error);
    
    // Additional error handling beyond fetchMetrics
    toast.error({
      title: 'Update Failed',
      message: 'Failed to update metrics. Using cached values if available.'
    });
    
    // Ensure fallback values are set if metrics are completely empty
    if (!metrics.value || Object.keys(metrics.value).length === 0) {
      metrics.value = { ...fallbackMetrics };
    }
  } finally {
    // Ensure loading state is cleared
    isMetricsLoading.value = false;
  }
}

// Initial metrics fetch with retry mechanism
onMounted(async () => {
  try {
    await retryFetchMetrics();
  } catch (error) {
    console.error('Failed to fetch initial metrics:', error);
    // Error is already handled in fetchMetrics function
  }
});

async function clearFilters() {
  try {
    // Show loading state
    isMetricsLoading.value = true;
    kpiLoadingStates.value.orderStatus = false;
    kpiLoadingStates.value.productionItems = false;
    
    customerFilter.value = '';
    statusFilter.value = '';
    priorityFilter.value = '';
    page.value = 1; // Reset to first page

    // Clear URL query parameter if it exists
    if (customerIdFromQuery.value) {
      router.push({ query: { ...route.query, customerId: undefined } });
    }

    // Provide user feedback
    toast.info({
      title: 'Filters Cleared',
      message: 'All filters have been removed'
    });

    // Refresh metrics after clearing filters
    await fetchMetrics();
  } catch (error) {
    console.error('Error clearing filters:', error);
    toast.error({
      title: 'Clear Filters Error',
      message: 'Failed to clear filters. Please refresh the page.'
    });
  } finally {
    // Reset loading state after a brief delay
    setTimeout(() => {
      isMetricsLoading.value = false;
    }, 500);
  }
}

// Add function to clear only status filter (useful for KPI interactions)
function clearStatusFilter() {
  try {
    // Show brief loading state for visual feedback
    kpiLoadingStates.value.orderStatus = true;
    
    statusFilter.value = '';
    page.value = 1; // Reset to first page
    
    toast.info({
      title: 'Status Filter Cleared',
      message: 'Status filter has been removed'
    });
    
    // Reset loading state
    setTimeout(() => {
      kpiLoadingStates.value.orderStatus = false;
    }, 300);
  } catch (error) {
    console.error('Error clearing status filter:', error);
    toast.error({
      title: 'Filter Error',
      message: 'Failed to clear status filter'
    });
    kpiLoadingStates.value.orderStatus = false;
  }
}

function openVerifyModal(order: Record<string, any>) {
  orderToVerify.value = order;
  showVerifyModal.value = true;
}

async function confirmVerifyOrder() {
  if (!orderToVerify.value) return;

  try {
    isVerifying.value = true;

    // Get current user info for logging
    const currentUser = await $fetch('/api/auth/me') as { id?: string };

    // Use the verifyOrder hook to get approval result information
    verifyOrder({
      where: { id: orderToVerify.value.id },
      data: {
        orderStatus: 'APPROVED',
        approvedAt: new Date(),
        barcode: orderToVerify.value.salesOrderNumber || `ORDER-${orderToVerify.value.id.slice(-8)}`, // Generate barcode
      },
    });

    // Log the status change
    try {
      await $fetch('/api/tracking/log-order-status', {
        method: 'POST',
        body: {
          orderId: orderToVerify.value.id,
          fromStatus: orderToVerify.value.orderStatus,
          toStatus: 'APPROVED',
          userId: currentUser?.id || 'unknown',
          changeReason: 'Admin order verification and approval',
          triggeredBy: 'manual',
          notes: `Order verified by admin. Barcode generated: ${orderToVerify.value.salesOrderNumber || `ORDER-${orderToVerify.value.id.slice(-8)}`}`,
        },
      });
    } catch (logError) {
      console.warn('Failed to log order status change:', logError);
      // Don't fail the verification if logging fails
    }

  } catch (error) {
    console.error('Error during order verification:', error);
    // Error handling is now done in the verifyOrder hook's onError
  } finally {
    isVerifying.value = false;
  }
}



const { mutate: updateOrder } = useUpdateOrder({
  onSuccess: (response: any) => {
    refreshOrders();
    refreshCount();
    fetchMetrics().catch(error => console.error('Failed to refresh metrics after order update:', error)); // Refresh metrics when orders are updated

    // Handle approval result if present (for general order updates)
    if (response?.approvalResult) {
      const { printQueueItemsAdded, approvalSuccess } = response.approvalResult;

      if (!approvalSuccess) {
        toast.warning({
          title: 'Order Approved with Issues',
          message: 'Order was approved but there was an issue adding items to the print queue. Please check the print queue manually.'
        });
      } else if (printQueueItemsAdded > 0) {
        toast.success({
          title: 'Order Approved Successfully',
          message: `Order approved and ${printQueueItemsAdded} item${printQueueItemsAdded === 1 ? '' : 's'} added to the print queue.`
        });
      }
    }
  },
  onError: (error: any) => {
    const err = error as { data?: { data?: { message?: string } } };
    toast.error({
      title: 'Error',
      message: err.data?.data?.message || 'Failed to update order.'
    });
  },
});

// Separate hook for manual verification with specific success handling
const { mutate: verifyOrder } = useUpdateOrder({
  onSuccess: (response: any) => {
    refreshOrders();
    refreshCount();
    fetchMetrics().catch(error => console.error('Failed to refresh metrics after order verification:', error));

    const orderNumber = orderToVerify.value?.salesOrderNumber || orderToVerify.value?.id;

    // Handle approval result for verification
    if (response?.approvalResult) {
      const { printQueueItemsAdded, approvalSuccess } = response.approvalResult;

      if (!approvalSuccess) {
        toast.warning({
          title: 'Order Verified with Issues',
          message: `Order ${orderNumber} was verified and approved, but there was an issue adding items to the print queue. Please check the print queue manually.`
        });
      } else {
        toast.success({
          title: 'Order Verified & Approved',
          message: `Order ${orderNumber} has been verified and approved. ${printQueueItemsAdded || 0} item${(printQueueItemsAdded || 0) === 1 ? '' : 's'} added to the print queue for printing.`
        });
      }
    } else {
      // Fallback message if no approval result
      toast.success({
        title: 'Order Verified & Approved',
        message: `Order ${orderNumber} has been verified and approved. Items added to the print queue for printing.`
      });
    }

    showVerifyModal.value = false;
    orderToVerify.value = null;
  },
  onError: (error: any) => {
    const err = error as { data?: { data?: { message?: string } } };
    toast.error({
      title: 'Verification Failed',
      message: err.data?.data?.message || 'Failed to verify and approve order. Please try again.'
    });
  },
});

async function archiveOrder(order: Record<string, any>) {
  orderToArchive.value = order;
  showArchiveModal.value = true;
}

async function confirmArchive() {
  if (!orderToArchive.value) return;

  try {
    isArchiving.value = true;
    updateOrder({
      where: { id: orderToArchive.value.id },
      data: {
        orderStatus: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    toast.success({
      title: 'Order Archived',
      message: `Order ${orderToArchive.value.salesOrderNumber || orderToArchive.value.id} has been archived.`
    });

    showArchiveModal.value = false;
    orderToArchive.value = null;
  } catch (error) {
    // Error handling is done in the hook's onError
  } finally {
    isArchiving.value = false;
  }
}

async function handleSync(syncMode: 'UPSERT' | 'CREATE_NEW') {
  isSyncing.value = true;
  showLoading();
  try {
    const result = await $fetch('/api/qbo/sync/all', {
      method: 'POST',
      body: { syncMode },
    });
    const message = `Sync complete. Estimates: ${result.estimatesSynced}, Orders: ${result.invoicesSynced}.`;
    toast.success({ title: 'QBO Sync Successful', message: message });
    refreshOrders();
    refreshCount();
    fetchMetrics().catch(error => console.error('Failed to refresh metrics after sync:', error)); // Refresh metrics after sync
  } catch (e) {
    const error = e as { data?: { data?: { message?: string } } };
    toast.error({ title: 'Error', message: error.data?.data?.message || 'Failed to sync with QBO.' });
  } finally {
    isSyncing.value = false;
    hideLoading();
  }
}
</script>