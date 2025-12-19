<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Reports & Analytics</h1>

    <!-- Report Type Tabs -->
    <div class="mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'productivity'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'productivity'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Employee Productivity
          </button>
          <button
            @click="activeTab = 'lead-time'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'lead-time'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Order Lead Time
          </button>
          <button
            @click="activeTab = 'missing-sewer'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'missing-sewer'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Missing Sewer Attribution
          </button>
        </nav>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-4">Filters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            id="startDate"
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            id="endDate"
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
        </div>
        <div v-if="activeTab === 'productivity'">
          <label for="stationFilter" class="block text-sm font-medium text-gray-700 mb-1">
            Station
            <span v-if="filters.userId" class="text-xs text-gray-500">(showing all stations)</span>
            <span class="text-xs text-gray-400 ml-2">({{ (stations || []).length }} available)</span>
          </label>
          <select
            id="stationFilter"
            v-model="filters.stationId"
            @change="onStationFilterChange"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Stations</option>
            <option v-for="station in (stations || [])" :key="station.id" :value="station.id">
              {{ station.name }}
            </option>
          </select>
        </div>
        <div v-if="activeTab === 'productivity'">
          <label for="userFilter" class="block text-sm font-medium text-gray-700 mb-1">
            Employee
            <span v-if="filters.stationId" class="text-xs text-gray-500">(showing all employees)</span>
            <span class="text-xs text-gray-400 ml-2">({{ (users || []).length }} available)</span>
          </label>
          <select
            id="userFilter"
            v-model="filters.userId"
            @change="onUserFilterChange"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Employees</option>
            <option v-for="user in (users || [])" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>
        <div v-if="activeTab === 'lead-time'">
          <label for="customerFilter" class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <select
            id="customerFilter"
            v-model="filters.customerId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Customers</option>
            <option v-for="customer in customers" :key="customer.id" :value="customer.id">
              {{ customer.name }}
            </option>
          </select>
        </div>
        <div v-if="activeTab === 'missing-sewer'">
          <label for="statusFilter" class="block text-sm font-medium text-gray-700 mb-1">Item Status</label>
          <select
            id="statusFilter"
            v-model="filters.itemStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="FOAM_CUTTING">Foam Cutting</option>
            <option value="STUFFING">Stuffing</option>
            <option value="PACKAGING">Packaging</option>
            <option value="PRODUCT_FINISHED">Product Finished</option>
            <option value="READY">Ready</option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex space-x-4">
        <button
          @click="loadReports"
          :disabled="isLoading"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          <Icon v-if="isLoading" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
          {{ isLoading ? 'Loading...' : 'Refresh Reports' }}
        </button>
        <button
          @click="clearFilters"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Clear Filters
        </button>
        <button
          @click="exportCSV"
          :disabled="!reportData || isExporting"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          <Icon v-if="isExporting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
          {{ isExporting ? 'Exporting...' : 'Export CSV' }}
        </button>

      </div>
    </div>

    <!-- Error Boundary -->
    <ReportErrorBoundary
      :error="reportError"
      :retryable="true"
      :show-contact-support="true"
      :show-technical-details="true"
      @retry="retryLoadReports"
      @clear="clearReportError"
      @contact-support="contactSupport"
    >
      <!-- Loading State -->
      <ReportLoadingState
        v-if="isLoading"
        :loading-title="`Generating ${activeTab === 'productivity' ? 'Productivity' : 'Lead Time'} Report`"
        :loading-message="loadingMessage"
        :progress="loadingProgress"
        :show-summary-skeletons="true"
        :show-table-skeleton="true"
        :show-tips="true"
      />

      <!-- Report Content (when not loading and no error) -->
      <template v-else>
        <!-- Summary Statistics -->
        <div v-if="summaryStats" :class="[
          'grid gap-6 mb-8',
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        ]">
      <div v-if="activeTab !== 'missing-sewer'" class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:users" class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              {{ activeTab === 'productivity' ? 'Active Employees' : 'Total Orders' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' ? (summaryStats.totalEmployees || 0) : (summaryStats.totalOrders || 0) }}
            </p>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab !== 'missing-sewer'" class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:cube" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              {{ activeTab === 'productivity' ? 'Items Processed' : 'Items Produced' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' ? (summaryStats.totalItemsProcessed || 0) : (summaryStats.totalItemsProduced || 0) }}
            </p>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab !== 'missing-sewer'" class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:clock" class="h-8 w-8 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              {{ activeTab === 'productivity' ? 'Production Time' : 'Avg Lead Time' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' 
                ? formatDuration(summaryStats.totalProductionTime || 0) 
                : (summaryStats.avgLeadTimeDays || 0) + ' days' }}
            </p>
          </div>
        </div>
      </div>
      
        </div>

        <!-- Employee Productivity Report -->
        <div v-if="activeTab === 'productivity'" class="bg-white shadow rounded-lg p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-700 mb-6">Employee Productivity</h2>
          
          <div v-if="reportData && reportData.length === 0" class="text-center py-12">
            <Icon name="heroicons:chart-bar" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p class="text-gray-500 mb-4">
              No productivity data found for the selected filters and date range.
            </p>
            <div class="text-sm text-gray-400">
              <p>Try:</p>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Expanding your date range</li>
                <li>Removing station or employee filters</li>
                <li>Checking if there was any production activity during this period</li>
              </ul>
            </div>
          </div>
          
          <div v-else-if="reportData && reportData.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button @click="sortTable('userName')" class="flex items-center space-x-1 hover:text-gray-700">
                  <span>Employee</span>
                  <Icon :name="getSortIcon('userName')" class="h-4 w-4" />
                </button>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button @click="sortTable('stationName')" class="flex items-center space-x-1 hover:text-gray-700">
                  <span>Station</span>
                  <Icon :name="getSortIcon('stationName')" class="h-4 w-4" />
                </button>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button @click="sortTable('itemsProcessed')" class="flex items-center space-x-1 hover:text-gray-700">
                  <span>Items Processed</span>
                  <Icon :name="getSortIcon('itemsProcessed')" class="h-4 w-4" />
                </button>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button @click="sortTable('totalDuration')" class="flex items-center space-x-1 hover:text-gray-700">
                  <span>Total Time</span>
                  <Icon :name="getSortIcon('totalDuration')" class="h-4 w-4" />
                </button>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button @click="sortTable('avgDuration')" class="flex items-center space-x-1 hover:text-gray-700">
                  <span>Avg Time/Item</span>
                  <Icon :name="getSortIcon('avgDuration')" class="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="row in reportData" :key="`${row.userId}-${row.stationId}`">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ row.userName || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.stationName || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button
                  @click="openEmployeeItemsModal(row.userId, row.userName, row.itemsProcessed, row.stationId)"
                  :disabled="!row.itemsProcessed || row.itemsProcessed === 0"
                  :class="[
                    'font-medium',
                    row.itemsProcessed > 0 
                      ? 'text-indigo-600 hover:text-indigo-900 cursor-pointer underline' 
                      : 'text-gray-500 cursor-default'
                  ]"
                >
                  {{ row.itemsProcessed || 0 }}
                </button>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDuration(row.totalDuration) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDuration(row.avgDuration) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Lead Time Report -->
    <div v-if="activeTab === 'lead-time'" class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Order Lead Time Analysis</h2>
      
      <div v-if="isLoading" class="animate-pulse">
        <div class="h-4 bg-gray-300 rounded mb-4"></div>
        <div class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-12 bg-gray-300 rounded"></div>
        </div>
      </div>
      
      <div v-if="reportData && reportData.length === 0" class="text-center py-12">
        <Icon name="heroicons:clock" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
        <p class="text-gray-500 mb-4">
          No orders found for the selected filters and date range.
        </p>
        <div class="text-sm text-gray-400">
          <p>Try:</p>
          <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Expanding your date range</li>
            <li>Removing customer filters</li>
            <li>Checking if there were any orders created during this period</li>
          </ul>
        </div>
      </div>
      
      <div v-else-if="reportData && reportData.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days in Production</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion %</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="order in reportData" :key="order.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ order.orderNumber || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.customerName || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="{
                    'bg-yellow-100 text-yellow-800': order.orderStatus === 'PENDING',
                    'bg-green-100 text-green-800': order.orderStatus === 'APPROVED',
                    'bg-blue-100 text-blue-800': order.orderStatus === 'ORDER_PROCESSING',
                    'bg-purple-100 text-purple-800': order.orderStatus === 'READY_TO_SHIP',
                    'bg-gray-100 text-gray-800': order.orderStatus === 'SHIPPED'
                  }"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ (order.orderStatus || '').replace(/_/g, ' ') }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ order.createdAt ? TimezoneService.formatUTCForLocalDisplay(new Date(order.createdAt), undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.daysInProduction || 0 }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex items-center">
                  <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full" 
                      :style="{ width: (order.completionPercentage || 0) + '%' }"
                    ></div>
                  </div>
                  <span class="text-xs">{{ order.completionPercentage || 0 }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Missing Sewer Attribution Report -->
    <div v-if="activeTab === 'missing-sewer'" class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Missing Sewer Attribution Items</h2>
      
      <div v-if="reportData && reportData.length === 0" class="text-center py-12">
        <Icon name="heroicons:check-circle" class="h-12 w-12 text-green-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Missing Items Found</h3>
        <p class="text-gray-500 mb-4">
          All items in the selected date range have proper sewing attribution.
        </p>
        <div class="text-sm text-gray-400">
          <p>This means:</p>
          <ul class="list-disc list-inside mt-2 space-y-1">
            <li>All items beyond sewing stage have sewing processing logs</li>
            <li>No items skipped the sewing station</li>
            <li>Sewing attribution is complete for this period</li>
          </ul>
        </div>
      </div>
      
      <div v-else-if="reportData && reportData.length > 0">
        <!-- Summary Stats -->
        <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
              <Icon name="heroicons:exclamation-triangle" class="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p class="text-sm font-medium text-red-800">Missing Items</p>
                <p class="text-2xl font-bold text-red-900">{{ reportData.length }}</p>
              </div>
            </div>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center">
              <Icon name="heroicons:cog-6-tooth" class="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p class="text-sm font-medium text-blue-800">Most Common Status</p>
                <p class="text-lg font-semibold text-blue-900">{{ getMostCommonStatus() }}</p>
              </div>
            </div>
          </div>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center">
              <Icon name="heroicons:clock" class="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p class="text-sm font-medium text-yellow-800">Needs Attribution</p>
                <p class="text-lg font-semibold text-yellow-900">{{ reportData.length }} items</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product #</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Station</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in reportData" :key="item.orderItemId" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ item.productNumber ? formatProductNumber(item.productNumber) : 'N/A' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <NuxtLink 
                    :to="`/admin/orders/edit/${item.orderId}`"
                    class="text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    {{ item.orderNumber }}
                  </NuxtLink>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.customerName }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span 
                    :class="getStatusBadgeClass(item.itemStatus)"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ formatStatus(item.itemStatus) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span v-if="item.productType" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {{ item.productType === 'SPA_COVER' ? 'Spa Cover' : 'Cover for Cover' }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ formatStatus(item.itemStatus) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    @click="openSewerAttributionModal(item)"
                    class="text-indigo-600 hover:text-indigo-900"
                  >
                    Attribute Sewer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
      </template>
    </ReportErrorBoundary>

    <!-- Employee Item Details Modal -->
    <EmployeeItemDetailsModal
      :is-open="employeeItemsModal.isOpen"
      :employee-id="employeeItemsModal.employeeId"
      :employee-name="employeeItemsModal.employeeName"
      :start-date="filters.startDate"
      :end-date="filters.endDate"
      :station-id="filters.stationId"
      @close="closeEmployeeItemsModal"
    />

    <!-- Sewer Attribution Modal -->
    <SewerAttributionModal
      :is-open="sewerAttributionModal.isOpen"
      :selected-item="sewerAttributionModal.selectedItem"
      :sewer-users="sewerUsers || []"
      v-model:selected-sewer-id="sewerAttributionModal.selectedSewerId"
      :is-attributing="sewerAttributionModal.isAttributing"
      @close="closeSewerAttributionModal"
      @attribute="attributeSewerWork"
    />
  </div>
</template>

<script setup lang="ts">
import { useFindManyStation } from '~/lib/hooks/station';
import { useFindManyUser } from '~/lib/hooks/user';
import { useFindManyCustomer } from '~/lib/hooks/customer';
import { TimezoneService } from '~/utils/timezoneService';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const toast = useToast();

// Reactive state
const activeTab = ref<'productivity' | 'lead-time' | 'missing-sewer'>('productivity');
const filters = reactive({
  startDate: '',
  endDate: '',
  stationId: '',
  userId: '',
  customerId: '',
  itemStatus: '',
});

const reportData = ref<any[]>([]);
const summaryStats = ref<any>(null);
const isLoading = ref(false);
const isExporting = ref(false);
const reportError = ref<any>(null);
const loadingProgress = ref<number | undefined>(undefined);
const loadingMessage = ref('Please wait while we process your request...');

// Table sorting state
const sortField = ref<string>('itemsProcessed');
const sortDirection = ref<'asc' | 'desc'>('desc');

// Employee items modal state
const employeeItemsModal = reactive({
  isOpen: false,
  employeeId: null as string | null,
  employeeName: null as string | null,
  stationId: null as string | null, // Store the specific station for this row
});

// Sewer attribution modal state
const sewerAttributionModal = reactive({
  isOpen: false,
  selectedItem: null as any,
  selectedSewerId: '',
  isAttributing: false,
});

// Fetch filter options with enhanced filtering logic
// Exclude "Office" station from productivity reports
const { data: stations } = useFindManyStation({
  where: { 
    NOT: {
      name: 'Office'
    }
  },
  orderBy: { name: 'asc' }
});

const { data: users } = useFindManyUser({
  where: { status: 'ACTIVE' },
  orderBy: { name: 'asc' }
});

const { data: customers } = useFindManyCustomer({
  where: { status: 'ACTIVE' },
  orderBy: { name: 'asc' }
});

// Get sewing station users for attribution
const { data: sewerUsers } = useFindManyUser({
  where: { 
    status: 'ACTIVE',
    // You might want to add a filter here for users who work at sewing station
    // For now, we'll show all active users and let admin choose
  },
  orderBy: { name: 'asc' }
});

// Debug watchers to see when data loads
watch(users, (newUsers) => {
  console.log('👥 Users data updated:', {
    count: newUsers?.length || 0,
    users: newUsers?.map(u => ({ id: u.id, name: u.name, status: u.status })) || []
  });
}, { immediate: true });

watch(stations, (newStations) => {
  console.log('🏭 Stations data updated:', {
    count: newStations?.length || 0,
    stations: newStations?.map(s => ({ id: s.id, name: s.name, status: s.status })) || []
  });
}, { immediate: true });

// Computed properties for filtered options based on current selections
const filteredUsers = computed(() => {
  // Since we're already fetching users with status: 'ACTIVE', just return them
  // Only show users when on productivity tab
  if (activeTab.value !== 'productivity') return [];
  return users.value || [];
});

const filteredStations = computed(() => {
  // Since we're already fetching stations with status: 'ACTIVE', just return them
  // Only show stations when on productivity tab
  if (activeTab.value !== 'productivity') return [];
  return stations.value || [];
});

// Set default date range (last 30 days)
onMounted(() => {
  setDefaultDateRange();
  loadReports();
});

/**
 * Convert any date format to YYYY-MM-DD format
 */
function convertToYYYYMMDD(dateInput: string): string {
  if (!dateInput) return '';
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  // Handle MM/DD/YYYY format (most common issue)
  const mmddyyyyMatch = dateInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as a date and format properly
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Could not convert date:', dateInput, error);
    return '';
  }
}

/**
 * Set default date range to last 30 days
 */
function setDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  // Force YYYY-MM-DD format
  const endDateStr = endDate.getFullYear() + '-' + 
    String(endDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(endDate.getDate()).padStart(2, '0');
  
  const startDateStr = startDate.getFullYear() + '-' + 
    String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(startDate.getDate()).padStart(2, '0');
  
  filters.endDate = endDateStr;
  filters.startDate = startDateStr;
  
  console.log('🔍 Set default dates:', { startDateStr, endDateStr });
}

/**
 * Enhanced date range validation with comprehensive error handling and warnings
 */
function validateDateRange(): boolean {
  // Check if both dates are provided
  if (!filters.startDate || !filters.endDate) {
    toast.error({ 
      title: 'Missing Dates', 
      message: 'Please select both start and end dates to generate the report.',
      timeout: 4000
    });
    return false;
  }

  // Automatically convert dates to correct format
  const originalStartDate = filters.startDate;
  const originalEndDate = filters.endDate;
  
  filters.startDate = convertToYYYYMMDD(filters.startDate);
  filters.endDate = convertToYYYYMMDD(filters.endDate);

  // Validate that conversion was successful
  if (!filters.startDate || !filters.endDate) {
    toast.error({ 
      title: 'Invalid Date Format', 
      message: 'Please select valid dates using the date picker. Manually entered dates may not be recognized.',
      timeout: 5000
    });
    // Restore original values if conversion failed
    filters.startDate = originalStartDate;
    filters.endDate = originalEndDate;
    return false;
  }

  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);
  
  // Check if dates are valid after conversion
  if (isNaN(startDate.getTime())) {
    toast.error({ 
      title: 'Invalid Start Date', 
      message: 'The start date is not valid. Please use the date picker to select a proper date.',
      timeout: 4000
    });
    return false;
  }
  
  if (isNaN(endDate.getTime())) {
    toast.error({ 
      title: 'Invalid End Date', 
      message: 'The end date is not valid. Please use the date picker to select a proper date.',
      timeout: 4000
    });
    return false;
  }
  
  // Check date range logic
  if (startDate > endDate) {
    toast.error({ 
      title: 'Invalid Date Range', 
      message: 'Start date must be before or equal to end date. Please check your date selection.',
      timeout: 4000
    });
    return false;
  }

  // Check if dates are in the future
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (startDate > now) {
    toast.error({ 
      title: 'Future Start Date', 
      message: 'Start date cannot be in the future. Please select a past or current date.',
      timeout: 4000
    });
    return false;
  }

  if (endDate > now) {
    toast.warning({ 
      title: 'Future End Date', 
      message: 'End date is in the future. The report will only include data up to today.',
      timeout: 4000
    });
  }

  // Check if date range is too large (more than 1 year)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 365) {
    toast.error({ 
      title: 'Date Range Too Large', 
      message: `Date range cannot exceed 365 days. Current range is ${daysDiff} days. Please reduce the range for better performance.`,
      timeout: 6000
    });
    return false;
  }

  // Performance warnings for large date ranges
  if (daysDiff > 180) {
    toast.warning({ 
      title: 'Large Date Range', 
      message: `You've selected a ${daysDiff}-day range. This may take longer to process. Consider adding station or employee filters for better performance.`,
      timeout: 5000
    });
  } else if (daysDiff > 90) {
    toast.info({ 
      title: 'Moderate Date Range', 
      message: `Processing ${daysDiff} days of data. Adding filters can improve performance.`,
      timeout: 3000
    });
  }

  // Check for very old dates (more than 2 years ago)
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  if (startDate < twoYearsAgo) {
    toast.warning({ 
      title: 'Historical Data', 
      message: 'You\'re accessing data from more than 2 years ago. Some historical data may be incomplete.',
      timeout: 4000
    });
  }

  // Single day range notification
  if (daysDiff === 0) {
    toast.info({ 
      title: 'Single Day Report', 
      message: 'Generating report for a single day. Consider expanding the range for better insights.',
      timeout: 3000
    });
  }

  return true;
}

// Watch for tab changes
watch(activeTab, () => {
  clearFilters();
  loadReports();
});

// Watch for date changes and auto-refresh (with debounce)
const debouncedLoadReports = debounce(loadReports, 1000);

// Watch for date changes and auto-refresh (with debounce)
watch([() => filters.startDate, () => filters.endDate], () => {
  if (filters.startDate && filters.endDate) {
    debouncedLoadReports();
  }
});

// Watch for filter changes to provide user feedback
watch(() => filters.stationId, (newStationId, oldStationId) => {
  if (newStationId !== oldStationId) {
    if (newStationId && filteredStations.value) {
      const station = filteredStations.value.find(s => s.id === newStationId);
      if (station) {
        console.log(`🏭 Station filter applied: ${station.name}`);
      }
    } else if (!newStationId && oldStationId) {
      console.log('🏭 Station filter removed');
    }
  }
});

watch(() => filters.userId, (newUserId, oldUserId) => {
  if (newUserId !== oldUserId) {
    if (newUserId && filteredUsers.value) {
      const user = filteredUsers.value.find(u => u.id === newUserId);
      if (user) {
        console.log(`👤 Employee filter applied: ${user.name}`);
      }
    } else if (!newUserId && oldUserId) {
      console.log('👤 Employee filter removed');
    }
  }
});

/**
 * Simple debounce function to prevent excessive API calls
 */
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function loadReports() {
  isLoading.value = true;
  reportError.value = null;
  loadingProgress.value = undefined;
  
  try {
    // Validate date range before making API call
    if (!validateDateRange()) {
      return;
    }

    loadingMessage.value = 'Validating date range...';
    loadingProgress.value = 10;

    // Automatically convert dates to YYYY-MM-DD format
    const normalizedStartDate = convertToYYYYMMDD(filters.startDate);
    const normalizedEndDate = convertToYYYYMMDD(filters.endDate);
    
    // Validate that we have valid dates
    if (!normalizedStartDate || !normalizedEndDate) {
      reportError.value = {
        statusMessage: 'Invalid date format',
        message: 'Please select valid start and end dates',
        data: {
          suggestions: [
            'Use the date picker to select dates',
            'Ensure both start and end dates are selected',
            'Try refreshing the page if dates appear incorrect'
          ]
        }
      };
      return;
    }
    
    // Update the filters with normalized dates (this fixes the display)
    if (normalizedStartDate !== filters.startDate) {
      filters.startDate = normalizedStartDate;
    }
    if (normalizedEndDate !== filters.endDate) {
      filters.endDate = normalizedEndDate;
    }

    // Create UTC date range with proper timezone handling
    let utcDateRange;
    try {
      // Create dates and convert to ISO strings for API
      // Use local timezone for start of day and end of day to ensure we capture all data
      const startDate = new Date(normalizedStartDate + 'T00:00:00.000');
      const endDate = new Date(normalizedEndDate + 'T23:59:59.999');
      
      // Convert to UTC for API consistency
      const utcStartDate = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000));
      const utcEndDate = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000));
      
      // Validate the dates
      if (isNaN(utcStartDate.getTime()) || isNaN(utcEndDate.getTime())) {
        throw new Error('Invalid date values after timezone conversion');
      }
      
      utcDateRange = {
        start: utcStartDate,
        end: utcEndDate
      };
      
      console.log('🕐 Date range with timezone handling:', {
        local: { start: startDate.toISOString(), end: endDate.toISOString() },
        utc: { start: utcStartDate.toISOString(), end: utcEndDate.toISOString() },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
    } catch (dateError: any) {
      console.error('Date creation error:', dateError);
      reportError.value = {
        statusMessage: 'Invalid date values provided',
        message: 'Please select valid dates using the date picker',
        data: {
          suggestions: [
            'Use the date picker to select dates',
            'Ensure dates are in the correct format',
            'Try refreshing the page and selecting different dates',
            'Check your system timezone settings'
          ]
        }
      };
      return;
    }

    loadingMessage.value = 'Fetching report data...';
    loadingProgress.value = 30;

    if (activeTab.value === 'productivity') {
      // Fetch productivity data
      loadingMessage.value = 'Calculating productivity metrics...';
      loadingProgress.value = 50;

      const response = await $fetch('/api/reports/productivity', {
        query: {
          startDate: utcDateRange.start.toISOString(),
          endDate: utcDateRange.end.toISOString(),
          stationId: filters.stationId || undefined,
          userId: filters.userId || undefined,
        }
      });

      loadingProgress.value = 80;

      if (response.success && response.data) {
        reportData.value = response.data;
        summaryStats.value = response.summary;
        
        // Handle empty data with helpful suggestions
        if (response.data.length === 0) {
          let suggestions = [];
          
          if (filters.stationId && filters.userId) {
            suggestions.push('Try removing either the station or employee filter');
            suggestions.push('Check if the selected employee worked at the selected station during this period');
          } else if (filters.stationId) {
            suggestions.push('Try removing the station filter to see all employee activity');
            suggestions.push('Check if any employees worked at this station during the selected period');
          } else if (filters.userId) {
            suggestions.push('Try removing the employee filter to see all station activity');
            suggestions.push('Check if the selected employee was active during this period');
          } else {
            suggestions.push('Try expanding your date range');
            suggestions.push('Check if there was any production activity during this period');
          }
          
          toast.info({
            title: 'No Data Found',
            message: 'No productivity data found for the current filters. ' + suggestions[0],
            timeout: 5000
          });
        } else {
          // Show success message with data summary
          const employeeCount = new Set(response.data.map(r => r.userId)).size;
          const stationCount = new Set(response.data.map(r => r.stationId)).size;
          
          toast.success({
            title: 'Report Generated',
            message: `Found data for ${employeeCount} employees across ${stationCount} stations.`,
            timeout: 3000
          });
        }
        
        // Show warnings if any
        if (response.warnings && response.warnings.length > 0) {
          console.warn('Report warnings:', response.warnings);
          toast.warning({ 
            title: 'Data Quality Notice', 
            message: `Report generated with ${response.warnings.length} data quality warnings. Check console for details.`,
            timeout: 4000
          });
        }
      } else {
        throw new Error('Invalid response from productivity API');
      }
    } else if (activeTab.value === 'lead-time') {
      // Fetch lead-time data
      loadingMessage.value = 'Calculating lead time metrics...';
      loadingProgress.value = 50;

      const ordersResponse = await $fetch('/api/reports/lead-time', {
        query: {
          startDate: utcDateRange.start.toISOString(),
          endDate: utcDateRange.end.toISOString(),
          customerId: filters.customerId || undefined,
        }
      });

      loadingProgress.value = 80;
      
      if (ordersResponse.success && ordersResponse.data) {
        reportData.value = ordersResponse.data;
        summaryStats.value = ordersResponse.summary;
      } else {
        throw new Error('Invalid response from lead-time API');
      }
    } else if (activeTab.value === 'missing-sewer') {
      // Fetch missing sewer attribution data
      loadingMessage.value = 'Finding items missing sewing attribution...';
      loadingProgress.value = 50;

      const missingSewersResponse = await $fetch('/api/reports/missing-sewer', {
        query: {
          startDate: utcDateRange.start.toISOString(),
          endDate: utcDateRange.end.toISOString(),
        }
      });

      loadingProgress.value = 80;
      
      if (missingSewersResponse.success) {
        reportData.value = missingSewersResponse.data || [];
        summaryStats.value = missingSewersResponse.summary;
        
        // Show appropriate message based on results
        if (missingSewersResponse.data.length === 0) {
          toast.success({
            title: 'No Missing Items',
            message: 'All items in the selected date range have proper sewing attribution.',
            timeout: 4000
          });
        } else {
          toast.warning({
            title: 'Missing Sewing Attribution',
            message: `Found ${missingSewersResponse.data.length} items that skipped the sewing station.`,
            timeout: 5000
          });
        }
      } else {
        throw new Error('Invalid response from missing-sewer API');
      }
    }

    loadingMessage.value = 'Finalizing report...';
    loadingProgress.value = 100;

    // Clear any previous errors
    reportError.value = null;

  } catch (error: any) {
    console.error('Error loading reports:', error);
    reportError.value = error;
    
    // Set empty data on error
    reportData.value = [];
    summaryStats.value = null;

    // Show user-friendly error message
    const errorMessage = error.statusMessage || error.message || 'Failed to load reports. Please try again.';
    toast.error({ 
      title: 'Report Generation Failed', 
      message: errorMessage 
    });
  } finally {
    isLoading.value = false;
    loadingProgress.value = undefined;
  }
}

/**
 * Handle station filter changes with validation
 */
function onStationFilterChange() {
  // Validate that the selected station exists
  if (filters.stationId && filteredStations.value) {
    const selectedStation = filteredStations.value.find(s => s.id === filters.stationId);
    if (!selectedStation) {
      toast.warning({
        title: 'Station Not Found',
        message: 'The selected station is no longer available. Filter has been cleared.',
        timeout: 4000
      });
      filters.stationId = '';
      return;
    }
  }
  
  // Auto-refresh if we have valid date range
  if (filters.startDate && filters.endDate) {
    debouncedLoadReports();
  }
}

/**
 * Handle user filter changes with validation
 */
function onUserFilterChange() {
  // Validate that the selected user exists
  if (filters.userId && filteredUsers.value) {
    const selectedUser = filteredUsers.value.find(u => u.id === filters.userId);
    if (!selectedUser) {
      toast.warning({
        title: 'Employee Not Found',
        message: 'The selected employee is no longer available. Filter has been cleared.',
        timeout: 4000
      });
      filters.userId = '';
      return;
    }
  }
  
  // Auto-refresh if we have valid date range
  if (filters.startDate && filters.endDate) {
    debouncedLoadReports();
  }
}

/**
 * Clear all filters and reset to defaults
 */
function clearFilters() {
  filters.stationId = '';
  filters.userId = '';
  filters.customerId = '';
  setDefaultDateRange();
  
  toast.info({
    title: 'Filters Cleared',
    message: 'All filters have been reset to default values.',
    timeout: 2000
  });
}

async function exportCSV() {
  isExporting.value = true;
  
  try {
    // Validate that we have data to export
    if (!reportData.value || reportData.value.length === 0) {
      toast.error({ 
        title: 'Export Error', 
        message: 'No data available to export. Please generate a report first.' 
      });
      return;
    }

    // Validate date range before exporting
    if (!filters.startDate || !filters.endDate) {
      toast.error({ 
        title: 'Export Error', 
        message: 'Please select both start and end dates before exporting.' 
      });
      return;
    }

    // Convert dates for export API
    let utcDateRange;
    try {
      const normalizedStartDate = convertToYYYYMMDD(filters.startDate);
      const normalizedEndDate = convertToYYYYMMDD(filters.endDate);
      
      const startDate = new Date(normalizedStartDate + 'T00:00:00.000Z');
      const endDate = new Date(normalizedEndDate + 'T23:59:59.999Z');
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date values');
      }
      
      utcDateRange = {
        start: startDate,
        end: endDate
      };
    } catch (dateError: any) {
      console.error('Date conversion error during export:', dateError);
      toast.error({ 
        title: 'Export Failed', 
        message: 'Invalid date format. Please ensure dates are properly selected using the date picker.',
        timeout: 5000
      });
      return;
    }

    const queryParams = new URLSearchParams({
      reportType: activeTab.value,
      startDate: utcDateRange.start.toISOString(),
      endDate: utcDateRange.end.toISOString(),
    });

    if (activeTab.value === 'productivity') {
      if (filters.stationId) queryParams.set('stationId', filters.stationId);
      if (filters.userId) queryParams.set('userId', filters.userId);
    } else {
      if (filters.customerId) queryParams.set('customerId', filters.customerId);
    }

    // Show progress toast
    toast.info({ 
      title: 'Exporting Report', 
      message: 'Preparing your CSV file for download...' 
    });

    // Create a temporary link to download the CSV
    const link = document.createElement('a');
    link.href = `/api/reports/export-csv?${queryParams.toString()}`;
    link.download = `${activeTab.value}-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success({ 
      title: 'Export Successful', 
      message: 'Your report has been downloaded successfully!' 
    });
  } catch (error: any) {
    console.error('Error exporting CSV:', error);
    
    const errorMessage = error.statusMessage || error.message || 'Failed to export report. Please try again.';
    toast.error({ 
      title: 'Export Failed', 
      message: errorMessage,
      timeout: 5000
    });
  } finally {
    isExporting.value = false;
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Transform productivity data from metrics service to match UI expectations
 * Applies filtering and flattens station breakdown data
 */
function transformProductivityData(productivityData: any[], filters: any) {
  const result: any[] = [];
  
  productivityData.forEach(employee => {
    employee.stationBreakdown.forEach((station: any) => {
      // Apply station filter if specified
      if (filters.stationId && station.stationId !== filters.stationId) {
        return;
      }
      
      // Apply user filter if specified
      if (filters.userId && employee.userId !== filters.userId) {
        return;
      }
      
      result.push({
        userId: employee.userId,
        userName: employee.userName,
        stationId: station.stationId,
        stationName: station.stationName,
        itemsProcessed: station.itemsProcessed,
        totalDuration: station.hoursWorked * 3600, // Convert hours to seconds
        avgDuration: station.averageTimePerItem,
        efficiency: station.hoursWorked > 0 ? Math.round((station.itemsProcessed / station.hoursWorked) * 100) / 100 : 0,

      });
    });
  });
  
  // Apply current sorting
  result.sort((a, b) => {
    let aVal = a[sortField.value];
    let bVal = b[sortField.value];
    
    // Handle string fields
    if (sortField.value === 'userName' || sortField.value === 'stationName') {
      aVal = (aVal || '').toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }
    
    // Handle numeric fields
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // Handle string comparison
    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
  
  return result;
}



/**
 * Calculate overall efficiency (items per hour across all employees)
 */
function calculateOverallEfficiency(): string {
  if (!reportData.value || reportData.value.length === 0 || !summaryStats.value) {
    return '0';
  }
  
  const totalItems = summaryStats.value.totalItemsProcessed || 0;
  const totalTimeHours = (summaryStats.value.totalProductionTime || 0) / 3600;
  
  if (totalTimeHours === 0) {
    return '0';
  }
  
  const efficiency = totalItems / totalTimeHours;
  return Math.round(efficiency * 100) / 100 + '';
}

/**
 * Sort table by specified field
 */
function sortTable(field: string) {
  if (sortField.value === field) {
    // Toggle direction if same field
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Set new field and default to descending for numeric fields
    sortField.value = field;
    sortDirection.value = ['itemsProcessed', 'totalDuration', 'avgDuration', 'efficiency'].includes(field) ? 'desc' : 'asc';
  }
  
  // Apply sorting to reportData
  if (reportData.value && reportData.value.length > 0) {
    reportData.value.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      // Handle string fields
      if (field === 'userName' || field === 'stationName') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      // Handle numeric fields
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string comparison
      if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

/**
 * Get sort icon for table header
 */
function getSortIcon(field: string): string {
  if (sortField.value !== field) return 'heroicons:chevron-up-down';
  return sortDirection.value === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down';
}

/**
 * Calculate total revenue from revenue periods data
 */
function calculateRevenueFromPeriods(revenueByPeriod: any[]): number {
  if (!revenueByPeriod || revenueByPeriod.length === 0) {
    return 0;
  }
  
  return revenueByPeriod.reduce((total, period) => total + (period.revenue || 0), 0);
}

/**
 * Open the employee items modal for drill-down details
 */
function openEmployeeItemsModal(employeeId: string, employeeName: string, itemCount: number, stationId?: string) {
  if (!itemCount || itemCount === 0) {
    return; // Don't open modal if no items
  }

  employeeItemsModal.employeeId = employeeId;
  employeeItemsModal.employeeName = employeeName;
  employeeItemsModal.stationId = stationId || null; // Store the specific station for this row
  employeeItemsModal.isOpen = true;
}

/**
 * Close the employee items modal
 */
function closeEmployeeItemsModal() {
  employeeItemsModal.isOpen = false;
  employeeItemsModal.employeeId = null;
  employeeItemsModal.employeeName = null;
}

/**
 * Clear the current error state
 */
function clearReportError() {
  reportError.value = null;
}

/**
 * Retry loading reports after an error
 */
function retryLoadReports() {
  clearReportError();
  loadReports();
}

/**
 * Handle contact support action
 */
function contactSupport() {
  // In a real application, this might open a support ticket system
  // or mailto link with pre-filled error information
  const subject = encodeURIComponent('Report Generation Error');
  const body = encodeURIComponent(`
I encountered an error while generating reports:

Report Type: ${activeTab.value}
Date Range: ${filters.startDate} to ${filters.endDate}
Error: ${reportError.value?.statusMessage || reportError.value?.message || 'Unknown error'}

Please help me resolve this issue.
  `);
  
  window.open(`mailto:support@company.com?subject=${subject}&body=${body}`, '_blank');
}

/**
 * Get the most common status from missing sewer items
 */
function getMostCommonStatus(): string {
  if (!reportData.value || reportData.value.length === 0) {
    return 'N/A';
  }
  
  const statusCounts = reportData.value.reduce((acc, item) => {
    acc[item.itemStatus] = (acc[item.itemStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommon = Object.entries(statusCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  return formatStatus(mostCommon[0]);
}

/**
 * Open the sewer attribution modal
 */
function openSewerAttributionModal(item: any) {
  sewerAttributionModal.selectedItem = item;
  sewerAttributionModal.selectedSewerId = '';
  sewerAttributionModal.isOpen = true;
}

/**
 * Close the sewer attribution modal
 */
function closeSewerAttributionModal() {
  sewerAttributionModal.isOpen = false;
  sewerAttributionModal.selectedItem = null;
  sewerAttributionModal.selectedSewerId = '';
  sewerAttributionModal.isAttributing = false;
}

/**
 * Attribute sewing work to selected employee
 */
async function attributeSewerWork(data: { itemId: string; sewerId: string }) {
  sewerAttributionModal.isAttributing = true;
  
  try {
    const response = await $fetch('/api/reports/attribute-sewer', {
      method: 'POST',
      body: {
        orderItemId: data.itemId,
        sewerId: data.sewerId
      }
    });
    
    if (response.success) {
      toast.success({
        title: 'Sewing Work Attributed',
        message: response.message,
        timeout: 4000
      });
      
      // Close modal and refresh the report
      closeSewerAttributionModal();
      loadReports();
    }
  } catch (error: any) {
    console.error('Error attributing sewer work:', error);
    
    const errorMessage = error.data?.message || error.statusMessage || error.message || 'Failed to attribute sewing work';
    toast.error({
      title: 'Attribution Failed',
      message: errorMessage,
      timeout: 5000
    });
  } finally {
    sewerAttributionModal.isAttributing = false;
  }
}

/**
 * Format product number for display
 */
function formatProductNumber(productNumber: number | null | undefined): string {
  if (!productNumber) {
    return 'N/A';
  }
  
  // Pad with zeros to ensure at least 5 digits
  const paddedNumber = productNumber.toString().padStart(5, '0');
  return `P${paddedNumber}`;
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'Not Started',
    'CUTTING': 'Cutting',
    'SEWING': 'Sewing',
    'FOAM_CUTTING': 'Foam Cutting',
    'STUFFING': 'Stuffing',
    'PACKAGING': 'Packaging',
    'PRODUCT_FINISHED': 'Finished',
    'READY': 'Ready',
    'SHIPPED': 'Shipped',
    'CANCELLED': 'Cancelled'
  };
  return statusMap[status] || status.replace(/_/g, ' ');
}

/**
 * Get status badge class for styling
 */
function getStatusBadgeClass(status: string): string {
  const classMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'bg-gray-100 text-gray-800',
    'CUTTING': 'bg-orange-100 text-orange-800',
    'SEWING': 'bg-blue-100 text-blue-800',
    'FOAM_CUTTING': 'bg-purple-100 text-purple-800',
    'STUFFING': 'bg-yellow-100 text-yellow-800',
    'PACKAGING': 'bg-indigo-100 text-indigo-800',
    'PRODUCT_FINISHED': 'bg-green-100 text-green-800',
    'READY': 'bg-emerald-100 text-emerald-800',
    'SHIPPED': 'bg-teal-100 text-teal-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  };
  return classMap[status] || 'bg-gray-100 text-gray-800';
}


</script>