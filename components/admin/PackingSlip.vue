<template>
  <div class="packing-slip-container">
    <!-- Print All Button -->
    <div class="print-controls mb-4">
      <button
        @click="printAllPackingSlips"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Icon name="heroicons:printer" class="mr-2 h-4 w-4" />
        Print All Packing Slips
      </button>
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
          <button
            @click="printSinglePackingSlip(orderItem)"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Icon name="heroicons:printer" class="mr-1 h-3 w-3" />
            Print This Slip
          </button>
        </div>

        <!-- Individual Packing Slip (4" x 6" format) -->
        <div class="packing-slip" :ref="el => setPackingSlipRef(el, orderItem.id)">
          <!-- Header Section -->
          <div class="header-section">
            <div class="header-content">
              <div class="dealer-info">
                <div class="dealer-label">Dealer:</div>
                <div class="dealer-name">{{ order.customer?.name }}</div>
                <div class="dealer-details">{{ order.customer?.shippingCity }}, {{ order.customer?.shippingState }}</div>
              </div>
              
              <div class="order-info">
                <div class="order-number">Order #{{ order.salesOrderNumber || order.id.slice(-8) }}</div>
                <div class="order-date">Date: {{ new Date(order.createdAt).toLocaleDateString() }}</div>
                <div class="barcode-container">
                  <canvas :ref="el => setBarcodeCanvas(el, orderItem.id)" class="barcode-canvas"></canvas>
                </div>
                <div class="po-number" v-if="order.purchaseOrderNumber">PO #{{ order.purchaseOrderNumber }}</div>
              </div>
            </div>
          </div>

          <!-- Product Specifications -->
          <div class="specs-section">
            <div class="spec-row">
              <div class="spec-label">Product Type:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'productType') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Size:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'size') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Shape:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'shape') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Radius Size:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'radiusSize') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Skirt Length:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'skirtLength') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Skirt Type:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'skirtType') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Tie Downs Qty:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'tieDownsQty') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Tie Down Placement:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'tieDownPlacement') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Distance:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'distance') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Foam Upgrade:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'foamUpgrade') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Double Plastic Wrap:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'doublePlasticWrapUpgrade') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Webbing Upgrade:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'webbingUpgrade') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Metal For Lifter:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'metalForLifterUpgrade') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Steam Stopper:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'steamStopperUpgrade') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Fabric Upgrade:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'fabricUpgrade') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Extra Handle Qty:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'extraHandleQty') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Extra Long Skirt:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'extraLongSkirt') }}</div>
            </div>
            
            <div class="spec-row">
              <div class="spec-label">Requires Packaging:</div>
              <div class="spec-value">{{ getProductAttribute(orderItem, 'packaging') ? 'Yes' : 'No' }}</div>
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

interface Props {
  order: any;
}

const props = defineProps<Props>();
const packingSlipRefs = ref<Record<string, HTMLElement>>({});
const barcodeCanvases = ref<Record<string, HTMLCanvasElement>>({});
const barcodeTypes = ref<Record<string, 'barcode' | 'qr'>>({});

// Get only production items (items marked as products)
const productionItems = computed(() => {
  if (!props.order?.items) return [];
  
  return props.order.items.filter((item: any) => {
    // Check if item has productAttributes (meaning it's marked as a product)
    return item.productAttributes !== null;
  });
});

// Initialize barcode types for new items
watch(productionItems, (newItems) => {
  newItems.forEach(item => {
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
      newItems.forEach(item => {
        if (barcodeCanvases.value[item.id]) {
          generateBarcodeImage(item.id);
        }
      });
    });
  }
}, { immediate: true });

// Function to set packing slip ref for each item
function setPackingSlipRef(el: HTMLElement | null, itemId: string) {
  if (el) {
    packingSlipRefs.value[itemId] = el;
  }
}

// Function to set barcode canvas ref for each item
function setBarcodeCanvas(el: HTMLCanvasElement | null, itemId: string) {
  if (el) {
    barcodeCanvases.value[itemId] = el;
    // Generate barcode once canvas is available
    nextTick(() => generateBarcodeImage(itemId));
  }
}

// Function to generate barcode for an item
function generateBarcode(orderItem: any): string {
  const orderNumber = props.order.salesOrderNumber || props.order.id.slice(-8);
  const itemId = orderItem.id.slice(-8); // Use last 8 characters of item ID
  return `${orderNumber}-${itemId}`;
}

// Function to generate barcode image and display it in the canvas
function generateBarcodeImage(itemId: string) {
  const canvas = barcodeCanvases.value[itemId];
  if (!canvas) return;

  const orderItem = productionItems.value.find(item => item.id === itemId);
  if (!orderItem) return;

  const barcodeText = generateBarcode(orderItem);
  const barcodeType = getBarcodeType(itemId);
  
  // Clear previous content
  canvas.width = 0;
  canvas.height = 0;

  // Set high-resolution canvas for crisp rendering
  const displayWidth = 80; // Display size
  const displayHeight = 30; // Display size
  const scale = 1.5; // Scale factor for crisp rendering
  
  canvas.width = displayWidth * scale;
  canvas.height = displayHeight * scale;
  
  // Set display size via CSS
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Scale context for high-resolution rendering
  ctx.scale(scale, scale);
  
  // Clear canvas
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  if (barcodeType === 'barcode') {
    // Generate barcode bars
    const bars = generateBarcodeBars(barcodeText);
    
    // Draw barcode bars
    const barWidth = displayWidth / bars.length;
    ctx.fillStyle = '#000';
    
    for (let i = 0; i < bars.length; i++) {
      if (bars[i] === 1) {
        ctx.fillRect(i * barWidth, 0, barWidth, displayHeight - 8); // Leave space for text
      }
    }
  } else {
    // Generate QR code pattern (simplified)
    generateQRCode(ctx, barcodeText, displayWidth, displayHeight);
  }

  // Draw barcode text below
  ctx.fillStyle = '#000';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(barcodeText, displayWidth / 2, displayHeight);
}

// Function to generate a simple QR code pattern
function generateQRCode(ctx: CanvasRenderingContext2D, text: string, width: number, height: number) {
  // Simple QR-like pattern using the text to generate a grid
  const gridSize = 8;
  const cellSize = Math.min(width, height - 12) / gridSize;
  
  ctx.fillStyle = '#000';
  
  // Generate a pattern based on the text
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const charIndex = (row * gridSize + col) % text.length;
      const char = text[charIndex];
      const charCode = char.charCodeAt(0);
      
      // Create a pattern based on character code
      if ((charCode + row + col) % 3 === 0) {
        ctx.fillRect(
          col * cellSize + (width - gridSize * cellSize) / 2,
          row * cellSize,
          cellSize,
          cellSize
        );
      }
    }
  }
}

// Function to generate barcode bars (simple binary representation)
function generateBarcodeBars(text: string): number[] {
  const bars: number[] = [];
  
  // Add start marker
  bars.push(1, 0, 1, 0, 1, 0);
  
  // Convert text to bars using a simple encoding
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charCode = char.charCodeAt(0);
    
    // Simple encoding: use character code to determine bar pattern
    // This creates a more varied and scannable pattern
    const pattern = (charCode % 8) + 1; // 1-8 bars
    
    // Add bars for this character
    for (let j = 0; j < pattern; j++) {
      bars.push(1);
    }
    
    // Add space between characters
    bars.push(0);
  }
  
  // Add end marker
  bars.push(1, 0, 1, 0, 1, 0);
  
  return bars;
}

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

// Function to print all packing slips
function printAllPackingSlips() {
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
          padding: 0.1in;
          font-size: 8pt;
          line-height: 1.2;
        }
        
        .packing-slip {
          width: 3.8in;
          height: 5.8in;
          border: 1px solid #000;
          padding: 0.1in;
          box-sizing: border-box;
          margin-bottom: 0.2in;
          page-break-inside: avoid;
          overflow: hidden;
        }
        
        .header-section {
          border-bottom: 1px solid #000;
          padding-bottom: 0.1in;
          margin-bottom: 0.1in;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.1in;
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
        
        .spec-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.05in;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 0.02in;
        }
        
        .spec-label {
          font-weight: bold;
          min-width: 1.5in;
        }
        
        .spec-value {
          text-align: right;
          min-width: 1.5in;
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
      </style>
    </head>
    <body>
  `;
  
  // Add each packing slip to the print content
  productionItems.value.forEach((orderItem: any) => {
    const slipRef = packingSlipRefs.value[orderItem.id];
    if (slipRef) {
      // Convert canvas to data URL for print
      const canvas = barcodeCanvases.value[orderItem.id];
      if (canvas) {
        const dataURL = canvas.toDataURL();
        const imgElement = slipRef.querySelector('.barcode-canvas');
        if (imgElement) {
          imgElement.outerHTML = `<img src="${dataURL}" style="width: 100%; height: auto;" alt="Barcode" />`;
        }
      }
      printContent += slipRef.outerHTML;
    }
  });
  
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
function printSinglePackingSlip(orderItem: any) {
  const slipRef = packingSlipRefs.value[orderItem.id];
  if (!slipRef) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  // Convert canvas to data URL for print
  const canvas = barcodeCanvases.value[orderItem.id];
  let slipHTML = slipRef.outerHTML;
  if (canvas) {
    const dataURL = canvas.toDataURL();
    slipHTML = slipHTML.replace(
      /<canvas[^>]*class="barcode-canvas"[^>]*>.*?<\/canvas>/s,
      `<img src="${dataURL}" style="width: 100%; height: auto;" alt="Barcode" />`
    );
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
          padding: 0.1in;
          box-sizing: border-box;
          overflow: hidden;
        }
        
        .header-section {
          border-bottom: 1px solid #000;
          padding-bottom: 0.1in;
          margin-bottom: 0.1in;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.1in;
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
        
        .spec-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.05in;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 0.02in;
        }
        
        .spec-label {
          font-weight: bold;
          min-width: 1.5in;
        }
        
        .spec-value {
          text-align: right;
          min-width: 1.5in;
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
    printWindow.print();
    printWindow.close();
  };
}
</script>

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
  padding-bottom: 0.1in;
  margin-bottom: 0.1in;
  position: relative;
  min-height: 0.8in; /* Ensure enough height for barcode */
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.1in;
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

.spec-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.05in;
  border-bottom: 1px dotted #ccc;
  padding-bottom: 0.02in;
}

.spec-label {
  font-weight: bold;
  min-width: 1.5in;
}

.spec-value {
  text-align: right;
  min-width: 1.5in;
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
