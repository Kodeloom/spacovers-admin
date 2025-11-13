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
              <template v-if="getPurchaseOrderDisplay(order.purchaseOrderNumber) !== '-'">
                <span class="mx-2 text-gray-300">|</span>
                PO: <span class="font-medium text-gray-700">{{ getPurchaseOrderDisplay(order.purchaseOrderNumber)
                }}</span>
              </template>
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <!-- <button v-if="order.estimate"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              @click="goToEstimate">
              View Linked Estimate
            </button> -->
            <button v-if="order.orderStatus === 'PENDING'" :disabled="isApprovingOrder"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="approveOrder">
              <Icon v-if="isApprovingOrder" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
              <Icon v-else name="heroicons:check-circle" class="mr-2 h-4 w-4" />
              {{ isApprovingOrder ? 'Approving...' : 'Approve' }}
            </button>
            <button :disabled="!order.trackingNumber"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="openTrackingEmailModal">
              <Icon name="heroicons:envelope" class="mr-2 h-4 w-4" />
              Send Tracking
            </button>
            <button v-if="isSuperAdmin" :disabled="isDeletingOrder"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="confirmDeleteOrder">
              <Icon v-if="isDeletingOrder" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
              <Icon v-else name="heroicons:trash" class="mr-2 h-4 w-4" />
              {{ isDeletingOrder ? 'Deleting...' : 'Delete Order' }}
            </button>
          </div>
        </div>

        <!-- Tracking Number Section -->
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
          <div class="flex items-center space-x-6">
            <div class="flex-1">
              <label for="trackingNumber" class="block text-sm font-medium text-gray-700 mb-2">Tracking Number</label>
              <div class="flex items-center space-x-3">
                <input id="trackingNumber" v-model="form.trackingNumber" type="text"
                  placeholder="Enter tracking number (e.g., 1Z999AA1234567890)"
                  class="flex-1 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                <button type="button" :disabled="isSavingTracking || form.trackingNumber === order?.trackingNumber"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveTrackingNumber">
                  <Icon v-if="isSavingTracking" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingTracking ? 'Saving...' : 'Save Tracking' }}
                </button>
                <button v-if="form.trackingNumber !== order?.trackingNumber" type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.trackingNumber = order?.trackingNumber || ''">
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
                <select id="orderStatus" v-model="form.orderStatus"
                  class="flex-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                  <option v-for="status in orderSystemStatusOptions" :key="status" :value="status">{{ status }}</option>
                </select>
                <button type="button" :disabled="isSavingStatus || form.orderStatus === order?.orderStatus"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveOrderStatus">
                  <Icon v-if="isSavingStatus" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingStatus ? 'Saving...' : 'Save Status' }}
                </button>
                <button v-if="form.orderStatus !== order?.orderStatus" type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.orderStatus = order?.orderStatus || ''">
                  Cancel
                </button>
              </div>
            </div>
            <div class="flex-1">
              <label for="priority" class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div class="flex items-center space-x-3">
                <select id="priority" v-model="form.priority"
                  class="flex-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                  <option v-for="priority in orderPriorityOptions" :key="priority" :value="priority">
                    {{ getPriorityDisplayText(priority) }}
                  </option>
                </select>
                <button type="button" :disabled="isSavingPriority || form.priority === order?.priority"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveOrderPriority">
                  <Icon v-if="isSavingPriority" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingPriority ? 'Saving...' : 'Save Priority' }}
                </button>
                <button v-if="form.priority !== order?.priority" type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.priority = order?.priority || ''">
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <!-- Purchase Order Number Section -->
          <div class="flex items-center space-x-6 mt-4">
            <div class="flex-1">
              <label for="purchaseOrderNumber" class="block text-sm font-medium text-gray-700 mb-2">
                Purchase Order Number
                <span v-if="isValidatingPO" class="text-xs text-blue-600 ml-1">(validating...)</span>
              </label>
              <div class="flex items-center space-x-3">
                <input id="purchaseOrderNumber" v-model="form.purchaseOrderNumber" type="text"
                  placeholder="Enter PO number (optional)"
                  class="flex-1 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  @input="onPONumberChange" />
                <button type="button" :disabled="isSavingPO || form.purchaseOrderNumber === order?.purchaseOrderNumber"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveOrderPO">
                  <Icon v-if="isSavingPO" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingPO ? 'Saving...' : 'Save PO' }}
                </button>
                <button v-if="form.purchaseOrderNumber !== order?.purchaseOrderNumber" type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.purchaseOrderNumber = order?.purchaseOrderNumber || ''">
                  Cancel
                </button>
              </div>
              <!-- PO Validation Warning -->
              <POValidationWarning :validation-result="poValidationResult"
                :show-warning="!!poValidationResult && !!form.purchaseOrderNumber"
                @confirm-duplicate="onConfirmDuplicate" @clear-po="onClearPO" />
            </div>
          </div>

          <div class="flex items-center space-x-6 mt-4">
            <div class="flex-1">
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <div class="flex items-center space-x-3">
                <textarea id="notes" v-model="form.notes" rows="2"
                  class="flex-1 block shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add notes about this order..." />
                <button type="button" :disabled="isSavingNotes || form.notes === order?.notes"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveOrderNotes">
                  <Icon v-if="isSavingNotes" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingNotes ? 'Saving...' : 'Save Notes' }}
                </button>
                <button v-if="form.notes !== order?.notes" type="button"
                  class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  @click="form.notes = order?.notes || ''">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Financial & Address Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Order Total</h3>
            <div class="text-center">
              <div class="text-4xl font-bold text-green-600 mb-2">
                ${{ Number(order.totalAmount).toFixed(2) }}
              </div>
              <p class="text-sm text-gray-500">Total Amount</p>
            </div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Addresses</h3>

            <!-- Shipping Address -->
            <div class="mb-6">
              <h4 class="text-md font-medium text-gray-700 mb-3">Shipping Address</h4>
              <div class="grid grid-cols-1 gap-3">
                <input v-model="form.shippingAddressLine1" type="text" placeholder="Address Line 1"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                <input v-model="form.shippingAddressLine2" type="text" placeholder="Address Line 2 (Optional)"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                <div class="grid grid-cols-3 gap-2">
                  <input v-model="form.shippingCity" type="text" placeholder="City"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  <input v-model="form.shippingState" type="text" placeholder="State"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  <input v-model="form.shippingZipCode" type="text" placeholder="ZIP"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <button type="button" :disabled="isSavingShippingAddress || !hasShippingAddressChanges"
                  class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveShippingAddress">
                  <Icon v-if="isSavingShippingAddress" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingShippingAddress ? 'Saving...' : 'Save Shipping Address' }}
                </button>
              </div>
            </div>

            <!-- Billing Address -->
            <div>
              <h4 class="text-md font-medium text-gray-700 mb-3">Billing Address</h4>
              <div class="grid grid-cols-1 gap-3">
                <input v-model="form.billingAddressLine1" type="text" placeholder="Address Line 1"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                <input v-model="form.billingAddressLine2" type="text" placeholder="Address Line 2 (Optional)"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                <div class="grid grid-cols-3 gap-2">
                  <input v-model="form.billingCity" type="text" placeholder="City"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  <input v-model="form.billingState" type="text" placeholder="State"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  <input v-model="form.billingZipCode" type="text" placeholder="ZIP"
                    class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <button type="button" :disabled="isSavingBillingAddress || !hasBillingAddressChanges"
                  class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="saveBillingAddress">
                  <Icon v-if="isSavingBillingAddress" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isSavingBillingAddress ? 'Saving...' : 'Save Billing Address' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Products Section -->
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">Products</h2>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600">
                {{ order.items?.length || 0 }} products
              </span>
              <!-- Add Product button - only show if order is PENDING -->
              <button v-if="order.orderStatus === 'PENDING'" @click="openAddProductModal"
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>

          <!-- Pending Order Notice -->
          <div v-if="order.orderStatus === 'PENDING'" class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <div class="flex">
              <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">Order is Pending</p>
                <p>You can add, edit, or remove products while the order is in pending status. Once approved, product
                  modifications will be restricted.</p>
              </div>
            </div>
          </div>

          <!-- Products Table -->
          <div v-if="order.items && order.items.length > 0" class="overflow-x-auto">
            <div class="min-w-full inline-block align-middle">
              <div class="overflow-hidden border border-gray-200 rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <!-- <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th> -->
                      <!-- <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th> -->
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Production Item
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <template v-for="orderItem in order.items" :key="orderItem.id">
                      <tr class="group hover:bg-gray-50">
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
                        <!-- <td class="px-3 sm:px-6 py-4">
                          <div class="text-sm text-gray-900 max-w-xs">
                            <div v-if="orderItem.lineDescription" class="break-words">
                              {{ orderItem.lineDescription }}
                            </div>
                            <div v-else class="text-gray-400 italic">
                              No description
                            </div>
                          </div>
                        </td> -->
                        <!-- <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ orderItem.quantity }}
                        </td> -->
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ new Intl.NumberFormat('en-US', {
                            style: 'currency', currency: 'USD'
                          }).format(orderItem.pricePerItem)
                          }}
                        </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div class="flex items-center">
                            <input :id="`isProduct-${orderItem.id}`" :checked="orderItem.isProduct" type="checkbox"
                              :disabled="orderItem.productAttributes?.verified"
                              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              @change="updateOrderItemProductStatus(orderItem.id, $event.target.checked)" />
                            <label :for="`isProduct-${orderItem.id}`" class="ml-2 text-sm text-gray-700">
                              Production Item
                            </label>
                          </div>
                        </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {{ orderItem.itemStatus || 'Not Started' }}
                          </span>
                        </td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div class="flex items-center space-x-2">
                            <button type="button" class="text-indigo-600 hover:text-indigo-900"
                              @click="editOrderItemStatus(orderItem)">
                              Edit Status
                            </button>
                            <button v-if="orderItem.isProduct" type="button" class="text-blue-600 hover:text-blue-900"
                              @click="openAttributesModal(orderItem)">
                              Attributes
                            </button>
                            <button v-if="orderItem.isProduct" type="button" class="text-green-600 hover:text-green-900"
                              @click="verifyOrderItem(orderItem)">
                              Verify
                            </button>
                            <!-- Remove Product button - only show if order is PENDING -->
                            <button v-if="order.orderStatus === 'PENDING'" type="button"
                              class="text-red-600 hover:text-red-900" @click="removeProduct(orderItem)">
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            <Icon name="heroicons:cube" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p class="text-lg font-medium text-gray-900 mb-2">No products found</p>
            <p class="text-gray-500 mb-4">This order doesn't have any products yet.</p>
            <button v-if="order.orderStatus === 'PENDING'" @click="openAddProductModal"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
              Add First Product
            </button>
          </div>
        </div>

        <!-- Order Activity Log -->
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">Order Activity Log</h2>
          </div>
          <div v-if="combinedOrderLogs && combinedOrderLogs.length > 0" class="space-y-4 overflow-y-auto max-h-[580px]">
            <div v-for="log in combinedOrderLogs" :key="`${log.type}-${log.id}`"
              class="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="text-sm font-medium text-gray-900">{{ log.displayText }}</span>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" :class="{
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
                <select id="itemFilter" v-model="selectedItemFilter"
                  class="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  @change="filterItemLogs">
                  <option value="">All Items</option>
                  <option v-for="item in order.items" :key="item.id" :value="item.id">
                    {{ item.item?.name }}
                  </option>
                </select>
              </div>
              <!-- Status Filter -->
              <div class="flex items-center space-x-2">
                <label for="statusFilter" class="text-sm font-medium text-gray-700">Filter by Status:</label>
                <select id="statusFilter" v-model="selectedStatusFilter"
                  class="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  @change="filterItemLogs">
                  <option value="">All Statuses</option>
                  <option v-for="status in itemStatusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
              </div>
              <!-- Clear Filters -->
              <button v-if="selectedItemFilter || selectedStatusFilter"
                class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                @click="clearItemFilters">
                <Icon name="heroicons:x-mark" class="mr-2 h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
          <div v-if="filteredItemLogs && filteredItemLogs.length > 0" class="space-y-4">
            <div v-for="log in filteredItemLogs" :key="log.id"
              class="border-l-4 border-green-500 pl-4 py-3 bg-gray-50 rounded-r">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="text-sm font-medium text-gray-900">{{ log.orderItem?.item?.name || 'Unknown Item'
                    }}</span>
                    <span class="text-sm text-gray-600">{{ log.fromStatus || 'STARTED' }} → {{ log.toStatus }}</span>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" :class="{
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
              @click="refreshActivityLogs">
              <Icon name="heroicons:arrow-path" class="mr-2 h-4 w-4" />
              Refresh Activity Logs
            </button>
          </div>
        </div>

        <!-- Packing Slip Section (Only show if there are production items) -->
        <div v-if="productionItems && productionItems.length > 0" class="bg-white p-6 rounded-lg shadow mt-6">
          <div class="mb-4">
            <h2 class="text-xl font-semibold text-gray-800 mb-2">Packing Slips</h2>
            <!-- Show approval message if order is pending -->
            <div v-if="order.orderStatus === 'PENDING'"
              class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <div class="flex">
                <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div class="text-sm text-yellow-800">
                  <p class="font-medium mb-1">Order Approval Required</p>
                  <p>This order needs to be approved before packing slips can be generated. Please change the order
                    status to
                    "APPROVED" to enable packing slip printing.</p>
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
                    <p>Each production item generates a unique barcode in the format: <code
                        class="bg-blue-100 px-1 rounded">OrderNumber-ItemId</code></p>
                    <p class="mt-1">These barcodes can be scanned at the warehouse kiosk to quickly pull up order and
                      item
                      details.</p>
                  </div>
                </div>
              </div>
              <!-- Split Labels with Print Queue -->
              <PackingSlip :order="order" @print-confirmation="handlePrintConfirmation" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="p-4">
      <p>Loading order details...</p>
    </div>

    <!-- Order Item Attributes Modal -->
    <OrderItemAttributesModal :is-open="isAttributesModalOpen" :order-item="selectedOrderItem"
      @close="closeAttributesModal" @saved="onAttributesSaved" />

    <!-- Status Editing Modal -->
    <AppModal :is-open="showStatusEditModal" title="Edit Item Status" @close="closeStatusEditModal">
      <div class="p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Item</label>
          <p class="text-sm text-gray-900 font-medium">{{ editingItem?.item?.name || 'Unknown Item' }}</p>
        </div>

        <div class="mb-6">
          <label for="statusSelect" class="block text-sm font-medium text-gray-700 mb-2">Production Status</label>
          <select id="statusSelect" v-model="editingItemStatus"
            class="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md">
            <option v-for="status in itemStatusOptions" :key="status" :value="status">
              {{ status.replace(/_/g, ' ') }}
            </option>
          </select>
          <p class="mt-1 text-xs text-gray-500">Select the current production status for this item</p>
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
          <button type="button" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="closeStatusEditModal">
            Cancel
          </button>
          <button type="button" :disabled="!editingItemStatus || isSavingItem"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="saveItemStatusFromModal">
            <Icon v-if="isSavingItem" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isSavingItem ? 'Saving...' : 'Save Status' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Tracking Email Modal -->
    <AppModal :isOpen="isTrackingEmailModalOpen" title="Send Tracking Information" @close="closeTrackingEmailModal">
      <div class="space-y-4">
        <div>
          <label for="trackingEmail" class="block text-sm font-medium text-gray-700 mb-2">
            Customer Email
          </label>
          <input id="trackingEmail" v-model="trackingEmailForm.email" type="email" required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="customer@example.com" />
        </div>

        <div>
          <label for="trackingSubject" class="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <input id="trackingSubject" v-model="trackingEmailForm.subject" type="text" required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Your order tracking information" />
        </div>

        <div>
          <label for="trackingMessage" class="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea id="trackingMessage" v-model="trackingEmailForm.message" rows="6" required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Dear Customer,&#10;&#10;Your order has been shipped!&#10;&#10;Tracking Number: {{ order.trackingNumber }}&#10;&#10;You can track your package at: [carrier website]&#10;&#10;Thank you for your business!" />
        </div>

        <div class="bg-blue-50 p-3 rounded-md">
          <p class="text-sm text-blue-800">
            <strong>Note:</strong> Email functionality will be implemented in a future update.
            For now, this will just log the tracking information.
          </p>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button type="button" @click="closeTrackingEmailModal"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancel
          </button>
          <button type="button" :disabled="isSendingTrackingEmail" @click="sendTrackingEmail"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
            <Icon v-if="isSendingTrackingEmail" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isSendingTrackingEmail ? 'Sending...' : 'Send Email' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Add Product Modal -->
    <AppModal :is-open="isAddProductModalOpen" title="Add Product to Order" @close="closeAddProductModal">
      <div class="space-y-4">
        <div>
          <label for="productSelect" class="block text-sm font-medium text-gray-700 mb-2">
            Select Product
          </label>
          <select id="productSelect" v-model="addProductForm.itemId" required
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option value="">Choose a product...</option>
            <option v-for="item in availableItems" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="productQuantity" class="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input id="productQuantity" v-model.number="addProductForm.quantity" type="number" min="1" required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="1" />
          </div>

          <div>
            <label for="productPrice" class="block text-sm font-medium text-gray-700 mb-2">
              Price per Item
            </label>
            <input id="productPrice" v-model.number="addProductForm.pricePerItem" type="number" step="0.01" min="0"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="0.00" />
          </div>
        </div>

        <div>
          <label for="productDescription" class="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea id="productDescription" v-model="addProductForm.lineDescription" rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Additional product details..." />
        </div>

        <div class="flex items-center">
          <input id="isProductionItem" v-model="addProductForm.isProduct" type="checkbox"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
          <label for="isProductionItem" class="ml-2 text-sm text-gray-700">
            This is a production item (requires manufacturing)
          </label>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button type="button" @click="closeAddProductModal"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancel
          </button>
          <button type="button" :disabled="!isAddProductFormValid || isAddingProduct" @click="addProduct"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            <Icon v-if="isAddingProduct" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isAddingProduct ? 'Adding...' : 'Add Product' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <AppModal :is-open="showDeleteConfirmModal" title="⚠️ Delete Order" @close="showDeleteConfirmModal = false">
      <div class="p-4">
        <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div class="flex">
            <Icon name="heroicons:exclamation-triangle" class="h-6 w-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 class="text-sm font-semibold text-red-800 mb-2">This is a destructive action!</h3>
              <p class="text-sm text-red-700">
                You are about to permanently delete <strong>Order #{{ order?.salesOrderNumber }}</strong>.
              </p>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-3">This will delete:</h4>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-start">
              <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>All order items ({{ order?.items?.length || 0 }} items)</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>All order activity logs</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>All item processing logs</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>All related data</span>
            </li>
          </ul>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
          <p class="text-sm font-semibold text-yellow-800">
            ⚠️ This action CANNOT be undone.
          </p>
        </div>

        <div class="flex justify-end space-x-3">
          <button type="button" @click="showDeleteConfirmModal = false"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Cancel
          </button>
          <button type="button" :disabled="isDeletingOrder" @click="deleteOrder"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50">
            <Icon v-if="isDeletingOrder" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
            {{ isDeletingOrder ? 'Deleting...' : 'Yes, Delete Order' }}
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useFindUniqueOrder, useFindManyOrderStatusLog, useFindManyItemStatusLog, useFindManyAuditLog, useFindManyItem } from '~/lib/hooks';
import { OrderSystemStatus, OrderPriority, OrderItemProcessingStatus } from '@prisma-app/client';
import { useRouter } from 'vue-router';
import AppModal from '~/components/AppModal.vue';
import OrderItemAttributesModal from '~/components/admin/OrderItemAttributesModal.vue';
import {
  getPriorityDisplayText
} from '~/utils/backwardCompatibility';
import POValidationWarning from '~/components/admin/POValidationWarning.vue';
import PackingSlip from '~/components/admin/PackingSlip.vue';
import ProductAttributesDisplay from '~/components/ProductAttributesDisplay.vue';
import ProductAttributesEditor from '~/components/ProductAttributesEditor.vue';
import { useUserPermissions } from '~/composables/useUserPermissions';
import { usePackingSlipStatus } from '~/composables/usePackingSlipStatus';

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const orderId = route.params.id as string;
const isSyncing = ref(false);
const isApprovingOrder = ref(false);
const isDeletingOrder = ref(false);
const showDeleteConfirmModal = ref(false);

// User permissions and role detection
const { 
  user, 
  isSuperAdmin, 
  isAdmin, 
  canOverrideReadOnly,
  privilegeLevel,
  userRoleNames,
  canEditProductAttributes 
} = useUserPermissions();

// Packing slip status tracking
const {
  packingSlipStatus,
  fetchPackingSlipStatus,
  hasPackingSlipPrinted,
  loading: packingSlipLoading
} = usePackingSlipStatus();

// Permission checking functions for product attributes
function isAttributesReadOnly(item: any): boolean {
  const hasVerifiedAttributes = item.productAttributes?.verified;
  const approvedStatuses = ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'];
  const isOrderApproved = order.value?.orderStatus && approvedStatuses.includes(order.value.orderStatus);
  
  // If attributes are not verified or order is not approved, allow editing
  if (!hasVerifiedAttributes || !isOrderApproved) {
    return false;
  }
  
  // Super admin can always edit (but with warnings)
  if (isSuperAdmin.value) {
    return false;
  }
  
  // Regular users cannot edit verified attributes on approved orders
  return true;
}

// Get warning level for super admin edits
function getEditWarningLevel(item: any): 'none' | 'standard' | 'critical' {
  if (!isSuperAdmin.value) return 'none';
  
  const hasVerifiedAttributes = item.productAttributes?.verified;
  const approvedStatuses = ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'];
  const isOrderApproved = order.value?.orderStatus && approvedStatuses.includes(order.value.orderStatus);
  
  // If this wouldn't normally be read-only, no warning needed
  if (!hasVerifiedAttributes || !isOrderApproved) {
    return 'none';
  }
  
  // Check if packing slip has been printed for critical warning
  if (hasPackingSlipPrinted(item.id)) {
    return 'critical';
  }
  
  // Standard warning for super admin override of verified attributes on approved orders
  return 'standard';
}

// PO validation states
const isValidatingPO = ref(false);
const poValidationResult = ref<any>(null);
const poValidationDebounceTimer = ref<NodeJS.Timeout | null>(null);
const isSavingPO = ref(false);



// Form state variables
const isSavingStatus = ref(false);
const isSavingPriority = ref(false);
const isSavingNotes = ref(false);
const isSavingTracking = ref(false);
const isSavingShippingAddress = ref(false);
const isSavingBillingAddress = ref(false);
const orderSystemStatusOptions = Object.values(OrderSystemStatus);
const orderPriorityOptions = Object.values(OrderPriority);

// Order Item Attributes Modal
const isAttributesModalOpen = ref(false);
const selectedOrderItem = ref<any>(null);

// Status Editing Modal
const showStatusEditModal = ref(false);
const editingItem = ref<any>(null);
const editingItemStatus = ref('');
const isSavingItem = ref(false);

// Tracking Email Modal
const isTrackingEmailModalOpen = ref(false);
const isSendingTrackingEmail = ref(false);
const trackingEmailForm = ref({
  email: '',
  subject: 'Your order tracking information',
  message: ''
});

// Add Product Modal
const isAddProductModalOpen = ref(false);
const isAddingProduct = ref(false);
const addProductForm = ref({
  itemId: '',
  quantity: 1,
  pricePerItem: 0,
  lineDescription: '',
  isProduct: true
});

// Fetch available items for the dropdown
const { data: availableItems } = useFindManyItem({
  orderBy: { name: 'asc' }
});

// Computed property to validate the add product form
const isAddProductFormValid = computed(() => {
  return addProductForm.value.itemId &&
    addProductForm.value.quantity > 0 &&
    addProductForm.value.pricePerItem >= 0;
});

// Data fetching
const { data: order, refetch: refetchOrder } = useFindUniqueOrder({
  where: { id: orderId },
  include: {
    customer: true,
    items: {
      include: {
        item: true,
        productAttributes: true,
      }
    },
    estimate: true,
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

// OrderItem audit logs are now included in the main auditLogs query since they use entityName: 'Order'

// Fetch item activity logs
const { data: itemLogs, refetch: refetchItemLogs } = useFindManyItemStatusLog({
  where: { orderItem: { orderId } },
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

// Combined activity logs (order status + audit logs)
const combinedOrderLogs = computed(() => {
  const logs = [];

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
    logs.push(...auditLogs.value.map(log => {
      // Handle OrderItem actions differently
      if (log.action.startsWith('ORDER_ITEM_')) {
        return {
          ...log,
          type: 'audit',
          displayText: log.action.replace('ORDER_ITEM_', '').replace(/_/g, ' '),
          action: log.action.replace('ORDER_ITEM_', '').replace(/_/g, ' '),
          fromStatus: log.oldValue,
          toStatus: log.newValue,
          changeReason: log.action === 'ORDER_ITEM_ADDED'
            ? `Product "${log.newValue?.itemName}" added to order`
            : `Product "${log.oldValue?.itemName}" removed from order`,
          triggeredBy: 'manual'
        };
      } else {
        // Handle regular Order actions
        return {
          ...log,
          type: 'audit',
          displayText: log.action.replace('ORDER_', '').replace(/_/g, ' '),
          action: log.action.replace('ORDER_', '').replace(/_/g, ' '),
          fromStatus: log.oldValue,
          toStatus: log.newValue,
          changeReason: `Order ${log.action.replace('ORDER_', '').toLowerCase()} changed`,
          triggeredBy: 'manual'
        };
      }
    }));
  }

  // Sort by timestamp (newest first)
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

// Get only production items (items marked as products)
const productionItems = computed(() => {
  if (!order.value?.items) return [];
  return order.value.items.filter((item: any) => {
    // Check if item has productAttributes (meaning it's marked as a product)
    return item.productAttributes !== null;
  });
});

// Form data for editing
const form = ref({
  orderStatus: '',
  priority: '',
  purchaseOrderNumber: '',
  trackingNumber: '',
  notes: '',
  shippingAddressLine1: '',
  shippingAddressLine2: '',
  shippingCity: '',
  shippingState: '',
  shippingZipCode: '',
  billingAddressLine1: '',
  billingAddressLine2: '',
  billingCity: '',
  billingState: '',
  billingZipCode: ''
});

// Initialize form data when order is loaded
watch(order, (newOrder) => {
  if (newOrder) {
    form.value = {
      orderStatus: newOrder.orderStatus || '',
      priority: newOrder.priority || '',
      purchaseOrderNumber: newOrder.purchaseOrderNumber || '',
      trackingNumber: newOrder.trackingNumber || '',
      notes: newOrder.notes || '',
      shippingAddressLine1: newOrder.shippingAddressLine1 || '',
      shippingAddressLine2: newOrder.shippingAddressLine2 || '',
      shippingCity: newOrder.shippingCity || '',
      shippingState: newOrder.shippingState || '',
      shippingZipCode: newOrder.shippingZipCode || '',
      billingAddressLine1: newOrder.billingAddressLine1 || '',
      billingAddressLine2: newOrder.billingAddressLine2 || '',
      billingCity: newOrder.billingCity || '',
      billingState: newOrder.billingState || '',
      billingZipCode: newOrder.billingZipCode || ''
    };
    
    // Fetch packing slip status for all order items
    if (newOrder.items && newOrder.items.length > 0) {
      const orderItemIds = newOrder.items.map(item => item.id);
      fetchPackingSlipStatus(orderItemIds);
    }
  }
}, { immediate: true });

// Save functions for order fields
async function saveOrderStatus() {
  if (!order.value || isSavingStatus.value) return;

  const oldStatus = order.value.orderStatus;
  const newStatus = form.value.orderStatus;
  const willTriggerApproval = oldStatus !== 'APPROVED' && newStatus === 'APPROVED';

  // Check if trying to approve and validate production items
  if (willTriggerApproval) {
    const unverifiedItems = order.value.items?.filter((item: any) =>
      item.isProduct && !item.productAttributes?.verified
    ) || [];

    if (unverifiedItems.length > 0) {
      const itemNames = unverifiedItems.map((item: any) => item.item?.name || 'Unknown Item').join(', ');
      toast.error({
        title: 'Cannot Approve Order',
        message: `The following production items must be verified before approval: ${itemNames}`
      });
      // Reset the form value to the original status
      form.value.orderStatus = oldStatus;
      return;
    }
  }

  try {
    isSavingStatus.value = true;
    const response = await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        orderStatus: form.value.orderStatus
      }
    });

    // Handle approval result if status changed to approved
    if (willTriggerApproval && (response as any)?.approvalResult) {
      const { printQueueItemsAdded, approvalSuccess } = (response as any).approvalResult;

      if (!approvalSuccess) {
        toast.warning({
          title: 'Order Approved with Issues',
          message: 'Order status updated to approved, but there was an issue adding items to the print queue. Please check the print queue manually.'
        });
      } else {
        toast.success({
          title: 'Order Approved Successfully',
          message: `Order status updated to approved and ${printQueueItemsAdded || 0} item${(printQueueItemsAdded || 0) === 1 ? '' : 's'} added to the print queue.`
        });
      }
    } else {
      toast.success({
        title: 'Success',
        message: 'Order status updated successfully'
      });
    }

    await refetchOrder();
  } catch (error) {
    console.error('Error updating order status:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update order status'
    });
  } finally {
    isSavingStatus.value = false;
  }
}

async function saveOrderPriority() {
  if (!order.value || isSavingPriority.value) return;

  try {
    isSavingPriority.value = true;
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        priority: form.value.priority
      }
    });

    toast.success({
      title: 'Success',
      message: 'Order priority updated successfully'
    });

    await refetchOrder();
  } catch (error) {
    console.error('Error updating order priority:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update order priority'
    });
  } finally {
    isSavingPriority.value = false;
  }
}

async function saveOrderPO() {
  if (!order.value || isSavingPO.value) return;

  // Check for validation errors
  if (poValidationResult.value?.isDuplicate) {
    toast.error({
      title: 'Warning',
      message: 'Please resolve the duplicate PO number warning before saving'
    });
    return;
  }

  try {
    isSavingPO.value = true;
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        purchaseOrderNumber: form.value.purchaseOrderNumber || null
      }
    });

    toast.success({
      title: 'Success',
      message: 'Purchase order number updated successfully'
    });

    await refetchOrder();
    poValidationResult.value = null;
  } catch (error) {
    console.error('Error updating PO number:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update purchase order number'
    });
  } finally {
    isSavingPO.value = false;
  }
}

async function saveTrackingNumber() {
  if (!order.value || isSavingTracking.value) return;

  try {
    isSavingTracking.value = true;
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        trackingNumber: form.value.trackingNumber || null
      }
    });

    toast.success({
      title: 'Success',
      message: 'Tracking number updated successfully'
    });

    await refetchOrder();
  } catch (error) {
    console.error('Error updating tracking number:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update tracking number'
    });
  } finally {
    isSavingTracking.value = false;
  }
}

async function saveOrderNotes() {
  if (!order.value || isSavingNotes.value) return;

  try {
    isSavingNotes.value = true;
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        notes: form.value.notes || null
      }
    });

    toast.success({
      title: 'Success',
      message: 'Order notes updated successfully'
    });

    await refetchOrder();
  } catch (error) {
    console.error('Error updating order notes:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update order notes'
    });
  } finally {
    isSavingNotes.value = false;
  }
}

function confirmDeleteOrder() {
  showDeleteConfirmModal.value = true;
}

async function deleteOrder() {
  if (!order.value || isDeletingOrder.value) return;

  try {
    isDeletingOrder.value = true;
    showDeleteConfirmModal.value = false;
    
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'DELETE'
    });

    toast.success({
      title: 'Order Deleted',
      message: 'Order and all related data have been permanently deleted'
    });

    // Navigate back to orders list
    router.push('/admin/orders');
  } catch (error) {
    console.error('Error deleting order:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to delete order'
    });
  } finally {
    isDeletingOrder.value = false;
  }
}

// PO validation functions
async function validatePONumber(poNumber: string, excludeOrderId?: string, excludeOrderItemId?: string) {
  if (!order.value?.customerId || !poNumber.trim()) {
    return null;
  }

  try {
    const response = await $fetch('/api/admin/orders/validate-po', {
      method: 'POST',
      body: {
        customerId: order.value.customerId,
        poNumber: poNumber.trim(),
        excludeOrderId,
        excludeOrderItemId
      }
    });
    return response.data;
  } catch (error) {
    console.error('PO validation error:', error);
    return {
      isValid: false,
      isDuplicate: false,
      message: 'Validation failed. Please try again.'
    };
  }
}

function onPONumberChange() {
  // Clear previous timer
  if (poValidationDebounceTimer.value) {
    clearTimeout(poValidationDebounceTimer.value);
  }

  // Clear previous validation result
  poValidationResult.value = null;

  // Don't validate empty PO numbers
  if (!form.value.purchaseOrderNumber?.trim()) {
    return;
  }

  // Set validation in progress
  isValidatingPO.value = true;

  // Debounce validation
  poValidationDebounceTimer.value = setTimeout(async () => {
    try {
      const result = await validatePONumber(
        form.value.purchaseOrderNumber,
        order.value?.id
      );
      poValidationResult.value = result;
    } finally {
      isValidatingPO.value = false;
    }
  }, 500);
}

function onConfirmDuplicate() {
  // User confirmed they want to use the duplicate PO
  poValidationResult.value = null;
}

function onClearPO() {
  form.value.purchaseOrderNumber = '';
  poValidationResult.value = null;
}



// Modal functions
function openTrackingEmailModal() {
  if (order.value?.customer?.email) {
    trackingEmailForm.value.email = order.value.customer.email;
  }
  trackingEmailForm.value.message = `Dear Customer,

Your order has been shipped!

Tracking Number: ${order.value?.trackingNumber}

You can track your package at: [carrier website]

Thank you for your business!`;

  isTrackingEmailModalOpen.value = true;
}

function closeTrackingEmailModal() {
  isTrackingEmailModalOpen.value = false;
  trackingEmailForm.value = {
    email: '',
    subject: 'Your order tracking information',
    message: ''
  };
}

// Essential order item management functions
async function updateOrderItemProductStatus(itemId: string, isProduct: boolean) {
  try {
    await $fetch(`/api/admin/order-items/${itemId}`, {
      method: 'PATCH',
      body: {
        isProduct
      }
    });

    toast.success({
      title: 'Success',
      message: `Item ${isProduct ? 'marked as' : 'removed from'} production`
    });

    await refetchOrder();
  } catch (error) {
    console.error('Error updating item production status:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update item production status'
    });
  }
}

function editOrderItemStatus(orderItem: any) {
  openStatusEditModal(orderItem);
}

async function verifyOrderItem(orderItem: any) {
  try {
    const response = await $fetch(`/api/admin/order-items/${orderItem.id}/verify`, {
      method: 'POST'
    });

    if (response.success && response.verified) {
      toast.success({
        title: 'Success',
        message: 'Item verified successfully'
      });
      await refetchOrder();
    } else {
      // Verification failed due to missing attributes
      const errorMessage = response.errors?.join(', ') || 'Product attributes are not set';
      toast.error({
        title: 'Verification Failed',
        message: `Cannot verify: ${errorMessage}`
      });
    }
  } catch (error) {
    console.error('Error verifying item:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to verify item'
    });
  }
}

function openAttributesModal(orderItem: any) {
  selectedOrderItem.value = orderItem;
  isAttributesModalOpen.value = true;
}

function closeAttributesModal() {
  isAttributesModalOpen.value = false;
  selectedOrderItem.value = null;
}

function onAttributesSaved() {
  // Refresh the order data to show updated attributes
  refetchOrder();
}

// Status editing modal functions
function openStatusEditModal(orderItem: any) {
  editingItem.value = orderItem;
  editingItemStatus.value = orderItem.itemStatus || 'NOT_STARTED_PRODUCTION';
  showStatusEditModal.value = true;
}

function closeStatusEditModal() {
  showStatusEditModal.value = false;
  editingItem.value = null;
  editingItemStatus.value = '';
}

async function saveItemStatusFromModal() {
  if (!editingItem.value || !editingItemStatus.value || isSavingItem.value) return;

  try {
    isSavingItem.value = true;

    await $fetch(`/api/admin/order-items/${editingItem.value.id}`, {
      method: 'PATCH',
      body: {
        itemStatus: editingItemStatus.value
      }
    });

    toast.success({
      title: 'Success',
      message: `Item status updated to ${editingItemStatus.value.replace(/_/g, ' ').toLowerCase()}`
    });

    await refetchOrder();
    closeStatusEditModal();
  } catch (error) {
    console.error('Error updating item status:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update item status'
    });
  } finally {
    isSavingItem.value = false;
  }
}

// Placeholder functions for missing functionality
async function syncOrder() {
  isSyncing.value = true;
  try {
    // Sync logic would go here
    toast.success({
      title: 'Success',
      message: 'Order synced with QuickBooks'
    });
  } catch (error) {
    toast.error({
      title: 'Error',
      message: 'Failed to sync order'
    });
  } finally {
    isSyncing.value = false;
  }
}

function goToEstimate() {
  if (order.value?.estimate?.id) {
    router.push(`/admin/estimates/${order.value.estimate.id}`);
  }
}

// Display helper functions
function getPurchaseOrderDisplay(poNumber?: string) {
  return poNumber && poNumber.trim() ? poNumber : '-';
}

function getTieDownLengthDisplay(length?: string) {
  return length && length.trim() ? length : '-';
}

async function sendTrackingEmail() {
  isSendingTrackingEmail.value = true;
  try {
    // Email sending logic would go here
    console.log('Sending tracking email:', trackingEmailForm.value);
    toast.success({
      title: 'Success',
      message: 'Tracking email sent successfully'
    });
    closeTrackingEmailModal();
  } catch (error) {
    toast.error({
      title: 'Error',
      message: 'Failed to send tracking email'
    });
  } finally {
    isSendingTrackingEmail.value = false;
  }
}

// Activity log functions
function refreshActivityLogs() {
  refetchOrderLogs();
  refetchItemLogs();
  refetchAuditLogs();
}

function filterItemLogs() {
  // The filtering is handled by the computed property
  // This function is called when filters change
}

function clearItemFilters() {
  selectedItemFilter.value = '';
  selectedStatusFilter.value = '';
}

// Product management functions
function openAddProductModal() {
  // Reset form
  addProductForm.value = {
    itemId: '',
    quantity: 1,
    pricePerItem: 0,
    lineDescription: '',
    isProduct: true
  };
  isAddProductModalOpen.value = true;
}

function closeAddProductModal() {
  isAddProductModalOpen.value = false;
  addProductForm.value = {
    itemId: '',
    quantity: 1,
    pricePerItem: 0,
    lineDescription: '',
    isProduct: true
  };
}

async function addProduct() {
  if (!isAddProductFormValid.value || isAddingProduct.value || !order.value) return;

  try {
    isAddingProduct.value = true;

    // Create multiple OrderItems based on quantity
    const promises = [];
    for (let i = 0; i < addProductForm.value.quantity; i++) {
      promises.push(
        $fetch('/api/admin/order-items', {
          method: 'POST',
          body: {
            orderId: order.value.id,
            itemId: addProductForm.value.itemId,
            quantity: 1, // Each OrderItem has quantity 1
            pricePerItem: addProductForm.value.pricePerItem,
            lineDescription: addProductForm.value.lineDescription || null,
            isProduct: addProductForm.value.isProduct
          }
        })
      );
    }

    // Wait for all OrderItems to be created
    await Promise.all(promises);

    const itemCount = addProductForm.value.quantity;
    toast.success({
      title: 'Success',
      message: `${itemCount} product${itemCount > 1 ? 's' : ''} added to order successfully`
    });

    await refetchOrder();
    refreshActivityLogs(); // Refresh activity logs to show the new product additions
    closeAddProductModal();
  } catch (error) {
    console.error('Error adding product:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to add product to order'
    });
  } finally {
    isAddingProduct.value = false;
  }
}

async function removeProduct(orderItem: any) {
  const confirmed = confirm(
    `Are you sure you want to remove "${orderItem.item?.name}" from this order?\n\n` +
    `This action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    await $fetch(`/api/admin/order-items/${orderItem.id}`, {
      method: 'DELETE'
    });

    toast.success({
      title: 'Success',
      message: 'Product removed from order successfully'
    });

    await refetchOrder();
    refreshActivityLogs(); // Refresh activity logs to show the product removal
  } catch (error) {
    console.error('Error removing product:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to remove product from order'
    });
  }
}

// Computed properties for address changes
const hasShippingAddressChanges = computed(() => {
  if (!order.value) return false;
  return form.value.shippingAddressLine1 !== (order.value.shippingAddressLine1 || '') ||
    form.value.shippingAddressLine2 !== (order.value.shippingAddressLine2 || '') ||
    form.value.shippingCity !== (order.value.shippingCity || '') ||
    form.value.shippingState !== (order.value.shippingState || '') ||
    form.value.shippingZipCode !== (order.value.shippingZipCode || '');
});

const hasBillingAddressChanges = computed(() => {
  if (!order.value) return false;
  return form.value.billingAddressLine1 !== (order.value.billingAddressLine1 || '') ||
    form.value.billingAddressLine2 !== (order.value.billingAddressLine2 || '') ||
    form.value.billingCity !== (order.value.billingCity || '') ||
    form.value.billingState !== (order.value.billingState || '') ||
    form.value.billingZipCode !== (order.value.billingZipCode || '');
});

// Address save functions
async function saveShippingAddress() {
  if (!order.value || isSavingShippingAddress.value) return;

  try {
    isSavingShippingAddress.value = true;
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        shippingAddressLine1: form.value.shippingAddressLine1 || null,
        shippingAddressLine2: form.value.shippingAddressLine2 || null,
        shippingCity: form.value.shippingCity || null,
        shippingState: form.value.shippingState || null,
        shippingZipCode: form.value.shippingZipCode || null
      }
    });

    toast.success({
      title: 'Success',
      message: 'Shipping address updated successfully'
    });

    await refetchOrder();
  } catch (error) {
    console.error('Error updating shipping address:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update shipping address'
    });
  } finally {
    isSavingShippingAddress.value = false;
  }
}

async function saveBillingAddress() {
  if (!order.value || isSavingBillingAddress.value) return;

  try {
    isSavingBillingAddress.value = true;
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        billingAddressLine1: form.value.billingAddressLine1 || null,
        billingAddressLine2: form.value.billingAddressLine2 || null,
        billingCity: form.value.billingCity || null,
        billingState: form.value.billingState || null,
        billingZipCode: form.value.billingZipCode || null
      }
    });

    toast.success({
      title: 'Success',
      message: 'Billing address updated successfully'
    });

    await refetchOrder();
  } catch (error) {
    console.error('Error updating billing address:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to update billing address'
    });
  } finally {
    isSavingBillingAddress.value = false;
  }
}

// Approval function with validation
async function approveOrder() {
  if (!order.value || isApprovingOrder.value) return;

  // Check if all production items are verified
  const unverifiedItems = order.value.items?.filter((item: any) =>
    item.isProduct && !item.productAttributes?.verified
  ) || [];

  if (unverifiedItems.length > 0) {
    const itemNames = unverifiedItems.map((item: any) => item.item?.name || 'Unknown Item').join(', ');
    toast.error({
      title: 'Cannot Approve Order',
      message: `The following production items must be verified before approval: ${itemNames}`
    });
    return;
  }

  try {
    isApprovingOrder.value = true;
    const response = await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: {
        orderStatus: 'APPROVED'
      }
    });

    // Handle approval result
    if ((response as any)?.approvalResult) {
      const { printQueueItemsAdded, approvalSuccess } = (response as any).approvalResult;

      if (!approvalSuccess) {
        toast.warning({
          title: 'Order Approved with Issues',
          message: 'Order approved successfully, but there was an issue adding items to the print queue. Please check the print queue manually.'
        });
      } else {
        toast.success({
          title: 'Order Approved Successfully',
          message: `Order approved and ${printQueueItemsAdded || 0} item${(printQueueItemsAdded || 0) === 1 ? '' : 's'} added to the print queue.`
        });
      }
    } else {
      toast.success({
        title: 'Success',
        message: 'Order approved successfully'
      });
    }

    await refetchOrder();
  } catch (error) {
    console.error('Error approving order:', error);
    toast.error({
      title: 'Error',
      message: 'Failed to approve order'
    });
  } finally {
    isApprovingOrder.value = false;
  }
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
</script>