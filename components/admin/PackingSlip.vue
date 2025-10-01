<template>
  <div class="packing-slip-container">
    <!-- Print Controls -->
    <div class="print-controls mb-4">
      <div class="flex gap-4 items-center">
        <button
          @click="handlePrintAll"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="heroicons:printer" class="mr-2 h-4 w-4" />
          Print All Packing Slips
        </button>
        
        <button
          v-if="canAccessPrintQueue"
          @click="handleAddAllToQueue"
          :disabled="allItemsQueued"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="{ 'bg-green-50 border-green-300 text-green-700': allItemsQueued }"
        >
          <Icon :name="allItemsQueued ? 'heroicons:check' : 'heroicons:queue-list'" class="mr-2 h-4 w-4" />
          {{ allItemsQueued ? 'All Items in Queue' : 'Add All to Queue' }}
        </button>

        <NuxtLink
          v-if="canAccessPrintQueue"
          to="/admin/print-queue"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="heroicons:queue-list" class="mr-2 h-4 w-4" />
          View Print Queue
          <span v-if="queueStatus.count > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {{ queueStatus.count }}
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Packing Slips for Each Production Item -->
    <div class="space-y-6">
      <div 
        v-for="orderItem in productionItems" 
        :key="orderItem.id" 
        class="packing-slip-wrapper"
      >
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-semibold text-gray-800">
            Packing Slip for: {{ orderItem.item?.name }}
          </h3>
          <div class="flex gap-2">
            <button
              v-if="canAccessPrintQueue"
              @click="handleAddToQueue(orderItem)"
              :disabled="isItemQueued(orderItem.id)"
              class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{ 'bg-green-50 border-green-300 text-green-700': isItemQueued(orderItem.id) }"
            >
              <Icon :name="isItemQueued(orderItem.id) ? 'heroicons:check' : 'heroicons:queue-list'" class="mr-1 h-3 w-3" />
              {{ isItemQueued(orderItem.id) ? 'In Queue' : 'Add to Queue' }}
            </button>
            <button
              @click="handlePrintSingle(orderItem)"
              class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Icon name="heroicons:printer" class="mr-1 h-3 w-3" />
              Print This Slip
            </button>
          </div>
        </div>

        <!-- Individual Packing Slip (4" x 6" format) -->
        <div class="packing-slip" :ref="(el: any) => setPackingSlipRef(el, orderItem.id)">
      <!-- Header Section -->
      <div class="header-section">
            <div class="header-content">
                 <div class="dealer-info">
           <div class="dealer-label">Dealer:</div>
           <div class="dealer-name">{{ order.customer?.name }}</div>
         </div>
        
        <div class="order-info">
          <div class="order-number">Order #{{ order.salesOrderNumber || order.id.slice(-8) }}</div>
          <div class="order-date">Date: {{ new Date(order.createdAt).toLocaleDateString() }}</div>
                
          <div class="po-number" v-if="order.purchaseOrderNumber">PO #{{ order.purchaseOrderNumber }}</div>
              </div>
        </div>
<div class="barcode-container">
                  <canvas 
                    :ref="(el: any) => setBarcodeCanvas(el, orderItem.id)" 
                    class="barcode-canvas"
                    width="380"
                    height="100"
                  ></canvas>
                </div>
      </div>

             <!-- Product Specifications -->
       <div class="specs-section">
         <!-- Core Attributes - 2 Column Layout (First 8 attributes) -->
         <div class="core-specs-grid">
           <!-- Left Column (4 attributes) -->
           <div class="spec-column">
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'color')">
               <div class="spec-label">Color:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'color') }}</div>
             </div>
             
                         <div class="spec-row" v-if="shouldShowSize(orderItem)">
              <div class="spec-label">Size:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'size') }}</div>
            </div>
             
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'shape')">
               <div class="spec-label">Shape:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'shape') }}</div>
             </div>
             
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'radiusSize')">
               <div class="spec-label">{{ getRadiusFieldLabel(orderItem) }}:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'radiusSize') }}</div>
             </div>
             
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'length')">
               <div class="spec-label">Length:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'length') }}</div>
             </div>
             
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'width')">
               <div class="spec-label">Width:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'width') }}</div>
             </div>
           </div>
           
           <!-- Right Column (4 attributes) -->
           <div class="spec-column">
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'skirtLength')">
               <div class="spec-label">Skirt Length:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'skirtLength') }}</div>
             </div>
             
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'skirtType')">
               <div class="spec-label">Skirt Type:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'skirtType') }}</div>
             </div>
             
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'tieDownsQty')">
               <div class="spec-label">Tie Downs Qty:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'tieDownsQty') }}</div>
             </div>
             
             <div class="spec-row" v-if="getProductAttribute(orderItem, 'tieDownPlacement')">
               <div class="spec-label">Tie Down Placement:</div>
               <div class="spec-value">{{ getProductAttribute(orderItem, 'tieDownPlacement') }}</div>
             </div>
           </div>
         </div>
         
         <!-- Additional Attributes (Below core specs) -->
         <div class="additional-specs" v-if="hasAdditionalAttributes(orderItem)">
           <div class="spec-row" v-if="getProductAttribute(orderItem, 'distance') && getProductAttribute(orderItem, 'distance') !== '0'">
             <div class="spec-label">Distance:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'distance') }}</div>
           </div>
           
           <div class="spec-row" v-if="getProductAttribute(orderItem, 'foamUpgrade')">
             <div class="spec-label">Foam Upgrade:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'foamUpgrade') }}</div>
           </div>
           
           <div class="spec-row" v-if="shouldShowUpgrade('doublePlasticWrapUpgrade', orderItem)">
             <div class="spec-label">Double Plastic Wrap:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'doublePlasticWrapUpgrade') }}</div>
           </div>
           
           <div class="spec-row" v-if="shouldShowUpgrade('webbingUpgrade', orderItem)">
             <div class="spec-label">Webbing Upgrade:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'webbingUpgrade') }}</div>
           </div>
           
           <div class="spec-row" v-if="shouldShowUpgrade('metalForLifterUpgrade', orderItem)">
             <div class="spec-label">Metal For Lifter:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'metalForLifterUpgrade') }}</div>
           </div>
           
           <div class="spec-row" v-if="shouldShowUpgrade('steamStopperUpgrade', orderItem)">
             <div class="spec-label">Steam Stopper:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'steamStopperUpgrade') }}</div>
           </div>
           
           <div class="spec-row" v-if="shouldShowUpgrade('fabricUpgrade', orderItem)">
             <div class="spec-label">Fabric Upgrade:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'fabricUpgrade') }}</div>
           </div>
           
           <div class="spec-row" v-if="shouldShowExtraHandle(orderItem)">
             <div class="spec-label">Extra Handle Qty:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'extraHandleQty') }}</div>
           </div>
           
           <div class="spec-row" v-if="shouldShowUpgrade('extraLongSkirt', orderItem)">
             <div class="spec-label">Extra Long Skirt:</div>
             <div class="spec-value">{{ getProductAttribute(orderItem, 'extraLongSkirt') }}</div>
           </div>
           
           <div class="spec-row" v-if="getProductAttribute(orderItem, 'packaging')">
             <div class="spec-label">Requires Packaging:</div>
             <div class="spec-value">Yes</div>
           </div>
           
                       <div class="spec-row" v-if="shouldShowNotes(orderItem)">
              <div class="spec-label">Notes:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'notes') }}</div>
            </div>
         </div>
       </div>

      <!-- Footer Section -->
      <div class="footer-section">
            <div class="save-info">SAVE for ReOrder</div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Production Items Message -->
    <div v-if="productionItems.length === 0" class="text-center py-8 text-gray-500">
      <Icon name="heroicons:cube" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p>No production items found for this order.</p>
      <p class="text-sm">Mark items as production items to generate packing slips.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { BarcodeGenerator } from '~/utils/barcodeGenerator';
import { usePrintQueue } from '~/composables/usePrintQueue';
import { useRoleBasedRouting } from '~/composables/useRoleBasedRouting';

interface Props {
  order: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'print-confirmation': [orderItem: any, printFunction: () => void]
}>();

const packingSlipRefs = ref<Record<string, HTMLElement>>({});
const barcodeCanvases = ref<Record<string, HTMLCanvasElement>>({});
const barcodeTypes = ref<Record<string, 'barcode' | 'qr'>>({});

// Initialize print queue
const { 
  addToQueue, 
  isItemQueued, 
  getQueueStatus, 
  error: queueError 
} = usePrintQueue();

const queueStatus = getQueueStatus();

// Role-based access control
const { hasOfficeAdminAccess } = useRoleBasedRouting();

// Check if user has access to print queue features
// According to requirements: office employees, admins, and super admins
const canAccessPrintQueue = computed(() => {
  return hasOfficeAdminAccess.value;
});

// Get only production items (items marked as products)
const productionItems = computed(() => {
  if (!props.order?.items) return [];
  
  return props.order.items.filter((item: any) => {
    // Check if item has productAttributes (meaning it's marked as a product)
    return item.productAttributes !== null;
  });
});

// Check if all production items are already in the queue
const allItemsQueued = computed(() => {
  if (productionItems.value.length === 0) return false;
  return productionItems.value.every((item: any) => isItemQueued(item.id));
});

// Initialize barcode types for new items
watch(productionItems, (newItems) => {
  newItems.forEach((item: any) => {
    if (!barcodeTypes.value[item.id]) {
      barcodeTypes.value[item.id] = 'barcode';
    }
  });
}, { immediate: true });

// Watch for changes in production items to regenerate barcodes
watch(productionItems, (newItems) => {
  if (newItems.length > 0) {
    // Regenerate barcodes for all items after a short delay
    nextTick(() => {
      newItems.forEach((item: any) => {
        if (barcodeCanvases.value[item.id]) {
          generateBarcodeImage(item.id);
        }
      });
    });
  }
}, { immediate: true });

// Function to set packing slip ref for each item
function setPackingSlipRef(el: any, itemId: string) {
  if (el) {
    packingSlipRefs.value[itemId] = el;
  }
}

// Function to set barcode canvas ref for each item
function setBarcodeCanvas(el: any, itemId: string) {
  if (el) {
    barcodeCanvases.value[itemId] = el;
    // Generate barcode once canvas is available
    nextTick(() => generateBarcodeImage(itemId));
  }
}

// Function to generate barcode for an item
function generateBarcode(orderItem: any): string {
  const orderNumber = props.order.salesOrderNumber || props.order.id.slice(-8);
  
  // Use the full CUID for maximum uniqueness and reliability
  // JsBarcode can handle longer strings without issues
  return `${orderNumber}-${orderItem.id}`;
}

// Function to generate barcode image and display it in the canvas
async function generateBarcodeImage(itemId: string) {
  const canvas = barcodeCanvases.value[itemId];
  if (!canvas) return;

  const orderItem = productionItems.value.find((item: any) => item.id === itemId);
  if (!orderItem) return;

  const barcodeText = generateBarcode(orderItem);
  const barcodeType = getBarcodeType(itemId);
  
  try {
    // Simple, reliable configuration for JsBarcode
    const config = {
      width: 330,      
      height: 130,     
      fontSize: 30,    
      margin: 10,      
      showText: true,
      format: 'CODE128' as const
    };
    
    if (barcodeType === 'barcode') {
      await BarcodeGenerator.generateCode128(canvas, barcodeText, config);
    } else {
      BarcodeGenerator.generateQRCode(canvas, barcodeText, config);
    }
  } catch (error) {
    console.error('Error generating barcode:', error);
    
    // Fallback to simple text display
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 60;
      canvas.style.width = '200px';
      canvas.style.height = '60px';
      
      ctx.clearRect(0, 0, 200, 60);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 200, 60);
      
      ctx.fillStyle = '#000000';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(barcodeText, 100, 30);
    }
  }
}

// These functions are now replaced by the professional BarcodeGenerator class

// Function to get product attribute value
function getProductAttribute(orderItem: any, attributeName: string): string {
  if (!orderItem.productAttributes) return 'N/A';
  
  const value = orderItem.productAttributes[attributeName];
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Handle empty strings
  if (value === '' || value === null || value === undefined) {
      return 'N/A';
  }
  
  return value.toString();
}

// Helper function to determine if an upgrade should be shown
function shouldShowUpgrade(attributeName: string, orderItem: any): boolean {
  const value = getProductAttribute(orderItem, attributeName);
  // Show if value exists and is not "No" or "N/A"
  return !!(value && value !== 'No' && value !== 'N/A');
}

// Helper function to determine if Extra Handle Qty should be shown
function shouldShowExtraHandle(orderItem: any): boolean {
  const value = getProductAttribute(orderItem, 'extraHandleQty');
  // Show if value exists and is not "0" or "N/A"
  return !!(value && value !== '0' && value !== 'N/A');
}

// Helper function to check if there are any additional attributes to show
function hasAdditionalAttributes(orderItem: any): boolean {
  return !!(
    (getProductAttribute(orderItem, 'distance') && getProductAttribute(orderItem, 'distance') !== '0') ||
    getProductAttribute(orderItem, 'foamUpgrade') ||
    shouldShowUpgrade('doublePlasticWrapUpgrade', orderItem) ||
    shouldShowUpgrade('webbingUpgrade', orderItem) ||
    shouldShowUpgrade('metalForLifterUpgrade', orderItem) ||
    shouldShowUpgrade('steamStopperUpgrade', orderItem) ||
    shouldShowUpgrade('fabricUpgrade', orderItem) ||
    shouldShowExtraHandle(orderItem) ||
    shouldShowUpgrade('extraLongSkirt', orderItem) ||
    getProductAttribute(orderItem, 'packaging') ||
    shouldShowNotes(orderItem) ||
    shouldShowSize(orderItem)
  );
}

// Helper function to get the appropriate label for radius/side length field
function getRadiusFieldLabel(orderItem: any): string {
  const shape = getProductAttribute(orderItem, 'shape');
  if (shape === 'Octagon') {
    return 'Side Length';
  }
  return 'Radius Size';
}

// Helper function to determine if Size should be shown (only for Round and Octagon)
function shouldShowSize(orderItem: any): boolean {
  const shape = getProductAttribute(orderItem, 'shape');
  const value = getProductAttribute(orderItem, 'size');
  // Show size only for Round and Octagon shapes, and only if it has a value
  return (shape === 'Round' || shape === 'Octagon') && !!(value && value.trim() !== '' && value !== 'N/A');
}

// Helper function to determine if Notes should be shown
function shouldShowNotes(orderItem: any): boolean {
  const value = getProductAttribute(orderItem, 'notes');
  // Show if value exists and is not empty, "N/A", or just whitespace
  return !!(value && value.trim() !== '' && value !== 'N/A');
}

// Function to get priority styling class
function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'HIGH':
      return 'text-red-600 font-bold';
    case 'MEDIUM':
      return 'text-yellow-600 font-semibold';
    case 'LOW':
      return 'text-green-600';
    default:
      return '';
  }
}

// Function to get barcode type for an item
function getBarcodeType(itemId: string): 'barcode' | 'qr' {
  return barcodeTypes.value[itemId] || 'barcode';
}

// Function to toggle between barcode and QR code
function toggleBarcodeType(itemId: string) {
  barcodeTypes.value[itemId] = barcodeTypes.value[itemId] === 'barcode' ? 'qr' : 'barcode';
  // Regenerate the image
  nextTick(() => generateBarcodeImage(itemId));
}

// Handler functions for print confirmation
async function handlePrintAll() {
  // Check if any items are already in production
  const itemsInProduction = productionItems.value.filter(item => item.itemStatus !== 'NOT_STARTED_PRODUCTION');
  
  if (itemsInProduction.length > 0) {
    const itemNames = itemsInProduction.map(item => item.item?.name).join(', ');
    const confirmed = confirm(
      `The following products are already in production: ${itemNames}. ` +
      `This means packing slips have been previously printed for these items. ` +
      `Are you sure you want to print all packing slips again?`
    );
    
    if (!confirmed) return;
  }
  
  await printAllPackingSlips();
}

// Handler for adding single item to print queue
async function handleAddToQueue(orderItem: any) {
  if (isItemQueued(orderItem.id)) {
    return; // Item already in queue
  }

  // Transform order item to include required relations for print queue
  const orderItemWithRelations = {
    ...orderItem,
    order: {
      ...props.order,
      customer: props.order.customer
    },
    item: orderItem.item
  };

  const success = await addToQueue(orderItemWithRelations);
  
  if (!success && queueError.value) {
    // Show error message to user
    alert(`Failed to add item to queue: ${queueError.value.message}`);
  }
}

// Handler for adding all production items to print queue
async function handleAddAllToQueue() {
  if (allItemsQueued.value) {
    return; // All items already in queue
  }

  const itemsToAdd = productionItems.value.filter((item: any) => !isItemQueued(item.id));
  
  for (const orderItem of itemsToAdd) {
    const orderItemWithRelations = {
      ...orderItem,
      order: {
        ...props.order,
        customer: props.order.customer
      },
      item: orderItem.item
    };

    const success = await addToQueue(orderItemWithRelations);
    
    if (!success && queueError.value) {
      // Show error for this specific item but continue with others
      console.error(`Failed to add ${orderItem.item?.name} to queue:`, queueError.value.message);
    }
  }
}

function handlePrintSingle(orderItem: any) {
  emit('print-confirmation', orderItem, async () => await printSinglePackingSlip(orderItem));
}

// Function to print all packing slips
async function printAllPackingSlips() {
  if (productionItems.value.length === 0) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>All Packing Slips - Order ${props.order.salesOrderNumber || props.order.id.slice(-8)}</title>
      <style>
        @media print {
          @page {
            size: 4in 6in;
            margin: 0.1in;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0.05in;
          font-size: 7pt;
          line-height: 1.1;
        }
        
        .packing-slip {
          width: 3.8in;
          height: 5.8in;
          border: 1px solid #000;
          padding: 0.05in;
          box-sizing: border-box;
          margin-bottom: 0.1in;
          page-break-inside: avoid;
          page-break-after: avoid;
          overflow: hidden;
        }
        
        .header-section {
          border-bottom: 1px solid #000;
          margin-bottom: 0.1in;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .dealer-info {
          margin-bottom: 0.1in;
          flex: 1;
        }
        
        .dealer-label {
          font-weight: bold;
          display: inline;
        }
        
        .dealer-name {
          font-weight: bold;
          display: inline;
          margin-left: 0.1in;
        }
        
        .dealer-details {
          font-size: 7pt;
          color: #666;
          margin-top: 0.05in;
        }
        
        .order-info {
          text-align: right;
          font-size: 7pt;
          flex: 1;
          text-align: right;
        }
        
        .order-number {
          font-weight: bold;
          font-size: 8pt;
        }
        
        .order-date {
          margin-bottom: 0.05in;
        }
        
        .barcode-container {
          margin: 0.05in 0;
          text-align: center;
          justify-self: flex-end;
        }
        
        .barcode-canvas {
          display: block;
          margin-right: 1.5px;
          max-width: 100%;
          height: auto;
        }
        
        .po-number {
          margin-top: 0.05in;
          font-size: 7pt;
        }
        
        .specs-section {
          margin: 0.1in 0;
        }
        
        .core-specs-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 0.1in !important;
          margin-bottom: 0.1in !important;
        }
        
        .spec-column {
          display: flex !important;
          flex-direction: column !important;
        }
        
        .additional-specs {
          display: flex !important;
          flex-direction: column !important;
        }
        
        .spec-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.05in;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 0.02in;
        }
        
        .spec-label {
          font-weight: bold;
        }
        
        .spec-value {
          text-align: right;
        }
        
        .footer-section {
          border-top: 1px solid #000;
          padding-top: 0.1in;
          margin-top: 0.1in;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .priority-info {
          display: flex;
          align-items: center;
        }
        
        .priority-label {
          font-weight: bold;
          margin-right: 0.1in;
        }
        
        .priority-value {
          padding: 0.02in 0.1in;
          border: 1px solid #000;
          border-radius: 0.05in;
          font-size: 7pt;
        }
        
        .save-info {
          font-size: 7pt;
          font-style: italic;
          color: #666;
        }
        
        .text-red-600 { color: #dc2626; }
        .text-yellow-600 { color: #ca8a04; }
        .text-green-600 { color: #16a34a; }
        .font-bold { font-weight: bold; }
        .font-semibold { font-weight: 600; }
        
        /* Prevent extra blank pages */
        html, body {
          height: 5.8in;
          overflow: hidden;
        }
        
        /* Ensure content fits within page */
        * {
          box-sizing: border-box;
        }
      </style>
    </head>
    <body>
  `;
  
  // Add each packing slip to the print content
  for (const orderItem of productionItems.value) {
    const slipRef = packingSlipRefs.value[orderItem.id];
    if (slipRef) {
      // Generate high-resolution barcode for printing
      const canvas = document.createElement('canvas');
      const barcodeText = generateBarcode(orderItem);
      const barcodeType = getBarcodeType(orderItem.id);
      const printConfig = BarcodeGenerator.getPrintConfig();
      
      try {
        if (barcodeType === 'barcode') {
          await BarcodeGenerator.generateCode128(canvas, barcodeText, printConfig);
        } else {
          BarcodeGenerator.generateQRCode(canvas, barcodeText, printConfig);
        }
        
        const dataURL = canvas.toDataURL('image/png', 1.0);
        let slipHTML = slipRef.outerHTML;
        slipHTML = slipHTML.replace(
          /<canvas[^>]*class="barcode-canvas"[^>]*>.*?<\/canvas>/s,
          `<img src="${dataURL}" style="width: 100%; height: auto; min-width: 250px;" alt="Barcode" />`
        );
        printContent += slipHTML;
      } catch (error) {
        console.error('Error generating print barcode:', error);
        printContent += slipRef.outerHTML;
      }
    }
  }
  
  printContent += `
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}

// Function to print a single packing slip
async function printSinglePackingSlip(orderItem: any) {
  const slipRef = packingSlipRefs.value[orderItem.id];
  if (!slipRef) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  // Generate high-resolution barcode for printing
  const canvas = document.createElement('canvas');
  const barcodeText = generateBarcode(orderItem);
  const barcodeType = getBarcodeType(orderItem.id);
  const printConfig = BarcodeGenerator.getPrintConfig();
  
  let slipHTML = slipRef.outerHTML;
  
  try {
    if (barcodeType === 'barcode') {
      await BarcodeGenerator.generateCode128(canvas, barcodeText, printConfig);
    } else {
      BarcodeGenerator.generateQRCode(canvas, barcodeText, printConfig);
    }
    
    const dataURL = canvas.toDataURL('image/png', 1.0);
    slipHTML = slipHTML.replace(
      /<canvas[^>]*class="barcode-canvas"[^>]*>.*?<\/canvas>/s,
      `<img src="${dataURL}" style="width: 100%; height: auto; min-width: 250px;" alt="Barcode" />`
    );
  } catch (error) {
    console.error('Error generating print barcode:', error);
    // Keep original HTML if barcode generation fails
  }
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Packing Slip - ${orderItem.item?.name} - Order ${props.order.salesOrderNumber || props.order.id.slice(-8)}</title>
      <style>
        @media print {
          @page {
            size: 4in 6in;
            margin: 0.1in;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0.1in;
          font-size: 8pt;
          line-height: 1.2;
        }
        
        .packing-slip {
          width: 3.8in;
          height: 5.8in;
          border: 1px solid #000;
          padding: 0.05in;
          box-sizing: border-box;
          overflow: hidden;
          page-break-inside: avoid;
          page-break-after: avoid;
        }
        
        .header-section {
          border-bottom: 1px solid #000;
          margin-bottom: 0.1in;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .dealer-info {
          margin-bottom: 0.1in;
          flex: 1;
        }
        
        .dealer-label {
          font-weight: bold;
          display: inline;
        }
        
        .dealer-name {
          font-weight: bold;
          display: inline;
          margin-left: 0.1in;
        }
        
        .dealer-details {
          font-size: 7pt;
          color: #666;
          margin-top: 0.05in;
        }
        
        .order-info {
          text-align: right;
          font-size: 7pt;
          flex: 1;
          text-align: right;
        }
        
        .order-number {
          font-weight: bold;
          font-size: 8pt;
        }
        
        .order-date {
          margin-bottom: 0.05in;
        }
        
        .barcode-container {
          margin: 0.05in 0;
          text-align: center;
          justify-self: flex-end;
        }
        
        .barcode-canvas {
          display: block;
          margin-right: 1.5px;
          max-width: 100%;
          height: auto;
        }
        
        .po-number {
          margin-top: 0.05in;
          font-size: 7pt;
        }
        
        .specs-section {
          margin: 0.1in 0;
        }
        
        .core-specs-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 0.1in !important;
          margin-bottom: 0.1in !important;
        }
        
        .spec-column {
          display: flex !important;
          flex-direction: column !important;
        }
        
        .additional-specs {
          display: flex !important;
          flex-direction: column !important;
        }
        
        .spec-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.05in;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 0.02in;
        }
        
        .spec-label {
          font-weight: bold;
        }
        
        .spec-value {
          text-align: right; 
        }
        
        .footer-section {
          border-top: 1px solid #000;
          padding-top: 0.1in;
          margin-top: 0.1in;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .priority-info {
          display: flex;
          align-items: center;
        }
        
        .priority-label {
          font-weight: bold;
          margin-right: 0.1in;
        }
        
        .priority-value {
          padding: 0.02in 0.1in;
          border: 1px solid #000;
          border-radius: 0.05in;
          font-size: 7pt;
        }
        
        .save-info {
          font-size: 7pt;
          font-style: italic;
          color: #666;
        }
        
        .text-red-600 { color: #dc2626; }
        .text-yellow-600 { color: #ca8a04; }
        .text-green-600 { color: #16a34a; }
        .font-bold { font-weight: bold; }
        .font-semibold { font-weight: 600; }
        
        /* Prevent extra blank pages */
        html, body {
          height: 5.8in;
          overflow: hidden;
        }
        
        /* Ensure content fits within page */
        * {
          box-sizing: border-box;
        }
      </style>
    </head>
    <body>
      ${slipHTML}
    </body>
    </html>
  `;
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    // Add a small delay to ensure content is fully rendered
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 100);
  };
}
</script>

<style scoped>
/* Enhanced barcode rendering for crisp display */
.barcode-canvas {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  max-width: 100%;
  height: auto;
  min-width: 250px; /* Ensure minimum scannable size */
}

/* Ensure proper barcode container alignment */
.barcode-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 8px 0;
}
</style>

<style scoped>
.packing-slip-container {
  max-width: 100%;
}

.packing-slip-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
}

.packing-slip {
  width: 4in;
  height: 6in;
  border: 2px solid #000;
  padding: 0.2in;
  background: white;
  font-family: 'Courier New', monospace;
  font-size: 8pt;
  line-height: 1.2;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  overflow: hidden;
  box-sizing: border-box;
}

.header-section {
  border-bottom: 1px solid #000;
  margin-bottom: 0.1in;
  position: relative;
  /* min-height: 0.8in; Ensure enough height for barcode */
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dealer-info {
  margin-bottom: 0.1in;
  flex: 1;
}

.dealer-label {
  font-weight: bold;
  display: inline;
}

.dealer-name {
  font-weight: bold;
  display: inline;
  margin-left: 0.1in;
}

.dealer-details {
  font-size: 7pt;
  color: #666;
  margin-top: 0.05in;
}

.order-info {
  text-align: right;
  font-size: 7pt;
  flex: 1;
  text-align: right;
}

.order-number {
  font-weight: bold;
  font-size: 8pt;
}

.order-date {
  margin-bottom: 0.05in;
}

.barcode-container {
  margin: 0.05in 0;
  text-align: center;
  justify-self: flex-end;
}

.barcode-canvas {
  display: block;
  margin-right: 1.5px;
  max-width: 100%;
  height: auto;
}

.po-number {
  margin-top: 0.05in;
  font-size: 7pt;
}

.barcode-toggle {
  display: none;
}

.specs-section {
  margin: 0.1in 0;
}

.core-specs-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 0.1in !important;
  margin-bottom: 0.1in !important;
}

.spec-column {
  display: flex !important;
  flex-direction: column !important;
}

.additional-specs {
  display: flex !important;
  flex-direction: column !important;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.05in;
  border-bottom: 1px dotted #ccc;
  padding-bottom: 0.02in;
}

.spec-label {
  font-weight: bold;
}

.spec-value {
  text-align: right;
}

.footer-section {
  border-top: 1px solid #000;
  padding-top: 0.1in;
  margin-top: 0.1in;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.priority-info {
  display: flex;
  align-items: center;
}

.priority-label {
  font-weight: bold;
  margin-right: 0.1in;
}

.priority-value {
  padding: 0.02in 0.1in;
  border: 1px solid #000;
  border-radius: 0.05in;
  font-size: 7pt;
}

.save-info {
  font-size: 7pt;
  font-style: italic;
  color: #666;
}

/* Priority colors */
.text-red-600 { color: #dc2626; }
.text-yellow-600 { color: #ca8a04; }
.text-green-600 { color: #16a34a; }
.font-bold { font-weight: bold; }
.font-semibold { font-weight: 600; }

/* Print styles */
@media print {
  .print-controls {
    display: none;
  }
  
  .packing-slip-wrapper {
    border: none;
    background: none;
    padding: 0;
  }
  
  .packing-slip {
    box-shadow: none;
    border: 1px solid #000;
  }
}
</style>
