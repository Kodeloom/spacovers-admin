<template>
  <div class="packing-slip-container">
    <!-- Print Button -->
    <div class="print-controls mb-4">
      <button
        @click="printPackingSlip"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Icon name="heroicons:printer" class="mr-2 h-4 w-4" />
        Print Packing Slip
      </button>
    </div>

    <!-- Packing Slip Content (4" x 6" format) -->
    <div class="packing-slip" ref="packingSlipRef">
      <!-- Header Section -->
      <div class="header-section">
        <div class="dealer-info">
          <div class="dealer-label">Dealer:</div>
          <div class="dealer-name">{{ order.customer?.name }}</div>
          <div class="dealer-details">{{ order.customer?.shippingCity }}, {{ order.customer?.shippingState }}</div>
        </div>
        
        <div class="order-info">
          <div class="order-number">Order #{{ order.salesOrderNumber || order.id.slice(-8) }}</div>
          <div class="order-date">Date: {{ new Date(order.createdAt).toLocaleDateString() }}</div>
          <div class="po-number" v-if="order.purchaseOrderNumber">PO #{{ order.purchaseOrderNumber }}</div>
        </div>
      </div>

      <!-- Product Specifications -->
      <div class="specs-section">
        <div class="spec-row">
          <div class="spec-label">Size:</div>
          <div class="spec-value">{{ getProductSpec('size') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Color:</div>
          <div class="spec-value">{{ getProductSpec('color') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Handle:</div>
          <div class="spec-value">{{ getProductSpec('handle') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Plastic:</div>
          <div class="spec-value">{{ getProductSpec('plastic') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Corner Fold:</div>
          <div class="spec-value">{{ getProductSpec('cornerFold') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label"># of tie downs:</div>
          <div class="spec-value">{{ getProductSpec('tieDowns') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Connector:</div>
          <div class="spec-value">{{ getProductSpec('connector') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Velcro:</div>
          <div class="spec-value">{{ getProductSpec('velcro') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Dbl. Plastic:</div>
          <div class="spec-value">{{ getProductSpec('doublePlastic') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Webbing:</div>
          <div class="spec-value">{{ getProductSpec('webbing') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">2#:</div>
          <div class="spec-value">{{ getProductSpec('weight') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Cut Flap:</div>
          <div class="spec-value">{{ getProductSpec('cutFlap') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Flaps:</div>
          <div class="spec-value">{{ getProductSpec('flaps') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Connected / Separate:</div>
          <div class="spec-value">{{ getProductSpec('connectedSeparate') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Tie Downs:</div>
          <div class="spec-value">{{ getProductSpec('tieDownsType') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Cut T/D:</div>
          <div class="spec-value">{{ getProductSpec('cutTieDowns') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Metal For Lifter:</div>
          <div class="spec-value">{{ getProductSpec('metalForLifter') }}</div>
        </div>
        
        <div class="spec-row">
          <div class="spec-label">Steam Stopper:</div>
          <div class="spec-value">{{ getProductSpec('steamStopper') }}</div>
        </div>
      </div>

      <!-- Footer Section -->
      <div class="footer-section">
        <div class="priority-info">
          <div class="priority-label">Priority:</div>
          <div class="priority-value" :class="getPriorityClass(order.priority)">
            {{ order.priority }}
          </div>
        </div>
        
        <div class="save-info">SAVE for ReOrder</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  order: any;
}

const props = defineProps<Props>();
const packingSlipRef = ref<HTMLElement>();

// Function to get product specifications from the order items
function getProductSpec(specType: string): string {
  if (!props.order?.items || props.order.items.length === 0) {
    return 'N/A';
  }

  // For now, we'll use the first item's product information
  // In the future, this could be enhanced to parse product descriptions
  const firstItem = props.order.items[0];
  
  switch (specType) {
    case 'size':
      return firstItem.product?.size || firstItem.item?.name || 'N/A';
    case 'color':
      return firstItem.product?.color || 'N/A';
    case 'handle':
      return firstItem.product?.handle || 'N/A';
    case 'plastic':
      return firstItem.product?.plastic || 'N/A';
    case 'cornerFold':
      return firstItem.product?.cornerFold || 'N/A';
    case 'tieDowns':
      return firstItem.product?.tieDowns || 'N/A';
    case 'connector':
      return firstItem.product?.connector || 'N/A';
    case 'velcro':
      return firstItem.product?.velcro || 'N/A';
    case 'doublePlastic':
      return firstItem.product?.doublePlastic || 'N/A';
    case 'webbing':
      return firstItem.product?.webbing || 'N/A';
    case 'weight':
      return firstItem.product?.weight || 'N/A';
    case 'cutFlap':
      return firstItem.product?.cutFlap || 'N/A';
    case 'flaps':
      return firstItem.product?.flaps || 'N/A';
    case 'connectedSeparate':
      return firstItem.product?.connectedSeparate || 'N/A';
    case 'tieDownsType':
      return firstItem.product?.tieDownsType || 'N/A';
    case 'cutTieDowns':
      return firstItem.product?.cutTieDowns || 'N/A';
    case 'metalForLifter':
      return firstItem.product?.metalForLifter || 'N/A';
    case 'steamStopper':
      return firstItem.product?.steamStopper || 'N/A';
    default:
      return 'N/A';
  }
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

// Function to print the packing slip
function printPackingSlip() {
  if (!packingSlipRef.value) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Packing Slip - Order ${props.order.salesOrderNumber || props.order.id.slice(-8)}</title>
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
        }
        
        .header-section {
          border-bottom: 1px solid #000;
          padding-bottom: 0.1in;
          margin-bottom: 0.1in;
        }
        
        .dealer-info {
          margin-bottom: 0.1in;
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
        }
        
        .order-number {
          font-weight: bold;
          font-size: 8pt;
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
      ${packingSlipRef.value.outerHTML}
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
}

.header-section {
  border-bottom: 1px solid #000;
  padding-bottom: 0.1in;
  margin-bottom: 0.1in;
}

.dealer-info {
  margin-bottom: 0.1in;
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
}

.order-number {
  font-weight: bold;
  font-size: 8pt;
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
  
  .packing-slip {
    box-shadow: none;
    border: 1px solid #000;
  }
}
</style>
